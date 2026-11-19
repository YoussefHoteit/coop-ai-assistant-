"""Import the Products worksheet without an Excel or third-party dependency."""
import argparse
import hashlib
import gzip
import json
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from zipfile import ZipFile

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
DEPARTMENTS = {
    'Produce': ('produce', 'خضار وفواكه'), 'Dairy & Eggs': ('dairy', 'ألبان وبيض'),
    'Meat & Poultry': ('meat', 'لحوم ودواجن'), 'Fresh Fish': ('fish', 'أسماك طازجة'),
    'Bakery': ('bakery', 'مخبوزات'), 'Grocery Food': ('pantry', 'مواد غذائية'),
    'EAT IT': ('ready', 'وجبات جاهزة'), 'Back To School': ('school', 'لوازم مدرسية'),
    'Frozen Food': ('frozen', 'أطعمة مجمدة'), 'Snack & Sweet': ('snacks', 'سناك وحلويات'),
    'Beverages': ('beverages', 'مشروبات'), 'Coffee & Tea': ('coffee-tea', 'قهوة وشاي'),
    'Organic & Healthy': ('organic', 'منتجات عضوية وصحية'), 'Baby Care': ('baby', 'العناية بالطفل'),
    'Personal Care': ('personal-care', 'العناية الشخصية'), 'Home Care': ('home-care', 'العناية بالمنزل'),
    'Kitchen Accessories': ('kitchen', 'أدوات المطبخ'), 'Pet Care': ('pets', 'مستلزمات الحيوانات'),
    'Phone &Home electronics': ('electronics', 'إلكترونيات'), 'Tobacco': ('tobacco', 'تبغ'),
    'Toys': ('toys', 'ألعاب'), 'Christmas & New Year': ('seasonal', 'مستلزمات الأعياد'),
    'Uncategorized website products': ('other', 'منتجات أخرى'),
}

def import_catalog(path, output, expected_count):
    with ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(n.itertext()) for n in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        sheet = next(s for s in workbook.findall('m:sheets/m:sheet', NS) if s.get('name') == 'Products')
        rel_id = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        sheet_path = next(r.get('Target') for r in rels if r.get('Id') == rel_id)
        sheet_path = sheet_path.lstrip('/') if sheet_path.startswith('/') else 'xl/' + sheet_path
        rows = ET.fromstring(archive.read(sheet_path)).findall('m:sheetData/m:row', NS)
        def value(cell):
            if cell.get('t') == 'inlineStr':
                return ''.join(cell.find('m:is', NS).itertext())
            node = cell.find('m:v', NS)
            raw = node.text if node is not None else ''
            return strings[int(raw)] if cell.get('t') == 's' else raw
        records, headers = [], None
        for row in rows:
            cells = {re.sub(r'\d', '', c.get('r')): value(c) for c in row.findall('m:c', NS)}
            if cells.get('A') == 'Product name' and cells.get('I') == 'Product ID':
                headers = cells
                continue
            if headers and cells.get('A'):
                records.append({headers[col]: val for col, val in cells.items() if col in headers})
    if len(records) != expected_count:
        raise ValueError(f'Expected {expected_count} products, received {len(records)}')
    products, seen, availability = [], set(), Counter()
    for row in records:
        product_id, sku = str(row['Product ID']).strip(), str(row.get('SKU', '')).strip()
        if not product_id or product_id in seen:
            raise ValueError(f'Missing or duplicate product ID: {product_id}')
        seen.add(product_id)
        name = row['Product name'].strip()
        price = float(row['Price (USD)']) if row.get('Price (USD)') else None
        if price is not None and (price < 0 or not price < float('inf')):
            raise ValueError(f'Invalid price: {product_id}')
        stock = row.get('Availability', '').strip()
        if stock not in ('Available', 'Sold out', '', 'Unknown'):
            raise ValueError(f'Unexpected availability: {stock}')
        available = {'Available': True, 'Sold out': False}.get(stock)
        availability[stock or 'Unknown'] += 1
        departments = [d.strip() for d in row.get('Department', '').split(';') if d.strip()]
        keys = [DEPARTMENTS[d][0] for d in departments]
        size = re.search(r'(?i)\b\d+(?:[.,]\d+)?\s*(?:kg|gr|g|ml|cl|liters?|litres?|l|lb|oz|pcs|packs?)\b', name)
        products.append({
            'id': product_id, 'sku': sku, 'name': {'en': name, 'ar': name},
            'description': {'en': row.get('Description', ''), 'ar': row.get('Description', '')},
            'price': price, 'currency': 'USD', 'available': available,
            'category': keys[0] if keys else 'other', 'additionalCategories': keys[1:],
            'department': row.get('Department', ''), 'subcategory': row.get('Categories', ''),
            'brand': row.get('Brand', ''), 'size': {'en': size.group() if size else '', 'ar': size.group() if size else ''},
            'sourceKind': 'catalog', 'sourceUrl': row.get('Product URL') or None,
            'nutrition': None, 'ingredients': '', 'allergens': '',
        })
    catalog = {
        'branch': 'Beirut', 'source': 'Al_Makhazen_Product_Catalog.xlsx',
        'snapshotDate': '2026-11-19', 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'productCount': len(products), 'availabilityCounts': dict(availability),
        'categories': {key: [label, ar] for label, (key, ar) in DEPARTMENTS.items()},
        'products': products,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    output.write_bytes(gzip.compress(payload, mtime=0))
    print(json.dumps({'products': len(products), 'availability': dict(availability), 'output': str(output)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--expected-count', type=int, default=7666)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'src/inventory-catalog.json.gz')
    args = parser.parse_args()
    import_catalog(args.workbook, args.output, args.expected_count)
