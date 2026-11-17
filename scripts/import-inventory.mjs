import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const content = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < content.length; i++) {
    const character = content[i];
    if (character === '"') {
      if (quoted && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!quoted && field) {
        throw new Error('Unexpected quote in CSV');
      } else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      row.push(field.trim());
      field = '';
      if (character === ',') continue;
      if (row.some(Boolean)) rows.push(row);
      row = [];
      if (character === '\r' && content[i + 1] === '\n') i++;
    } else field += character;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function optionalNumber(value, label, positive = false) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (positive && number === 0)) throw new Error(label + ' must be a valid number');
  return number;
}

function safeUrl(value, label) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(label + ' must be a public HTTPS URL');
  return url.href;
}

function stock(value) {
  const flag = (value || '').toLowerCase();
  if (!flag || flag === 'unknown') return null;
  if (['yes', '1', 'true', 'in stock'].includes(flag)) return true;
  if (['no', '0', 'false', 'out of stock'].includes(flag)) return false;
  throw new Error('availability must be in stock, out of stock, or unknown');
}

function product(row) {
  if (!/^[a-z0-9._:-]{1,80}$/i.test(row.sku)) throw new Error('sku must be a stable product identifier');
  if (!row.name || row.name.length > 150) throw new Error('name must contain 1–150 characters');
  if (!/^[a-z0-9-]{1,40}$/i.test(row.category)) throw new Error('category must be a short category key');
  const basisGrams = optionalNumber(row.basis_grams, 'basis_grams', true);
  const kcal = optionalNumber(row.kcal, 'kcal');
  const protein = optionalNumber(row.protein_g, 'protein_g');
  const carbs = optionalNumber(row.carbs_g, 'carbs_g');
  const fat = optionalNumber(row.fat_g, 'fat_g');
  const hasFacts = [kcal, protein, carbs, fat].some(value => value !== null);
  if (hasFacts && !basisGrams) throw new Error('nutrition fields require basis_grams from the label');
  if (row.currency && row.currency.toUpperCase() !== 'USD') throw new Error('price currency must be USD in this demo');
  return {
    id: row.sku, name: { en: row.name, ar: row.name_ar || row.name },
    category: row.category.toLowerCase(), size: { en: row.size || '', ar: row.size_ar || row.size || '' },
    aliases: row.aliases || '', ingredient: row.recipe_ingredient || null,
    description: { en: row.description || '', ar: row.description_ar || row.description || '' },
    price: optionalNumber(row.price_usd, 'price_usd'), available: stock(row.availability), sourceKind: 'import',
    sourceUrl: safeUrl(row.product_url, 'product_url'), ingredients: row.ingredients || '', allergens: row.allergens || '',
    nutrition: hasFacts ? { basisGrams, kcal, protein, carbs, fat, sourceUrl: safeUrl(row.nutrition_url, 'nutrition_url') } : null,
  };
}

const [path, selectedBranch] = process.argv.slice(2);
if (!path) throw new Error('Usage: npm run import -- path/to/inventory.csv [branch]');
const [headers, ...rows] = parseCsv(await readFile(path, 'utf8'));
if (!headers || new Set(headers).size !== headers.length || ['sku', 'name', 'category'].some(key => !headers.includes(key))) {
  throw new Error('Include unique CSV headers sku,name,category');
}
const records = rows.map((cells, index) => {
  if (cells.length !== headers.length) throw new Error('CSV row ' + (index + 2) + ' has the wrong number of columns');
  return { fields: Object.fromEntries(headers.map((field, column) => [field, cells[column]])), line: index + 2 };
});
const branches = [...new Set(records.map(({ fields }) => fields.branch).filter(Boolean))];
if (branches.length > 1 && !selectedBranch) throw new Error('Provide the desired branch when the export contains multiple branches');
if (selectedBranch && branches.length && !branches.includes(selectedBranch)) throw new Error('The selected branch is absent from the export');
const branch = selectedBranch || branches[0] || null;
const matching = records.filter(({ fields }) => !branches.length || fields.branch === branch);
if (!matching.length) throw new Error('No inventory rows to import');

const ids = new Set();
const products = matching.map(({ line, fields }) => {
  try {
    const item = product(fields);
    if (ids.has(item.id)) throw new Error('duplicate SKU in the selected branch');
    ids.add(item.id);
    return item;
  } catch (error) { throw new Error('CSV row ' + line + ': ' + error.message); }
});

const target = fileURLToPath(new URL('../src/approved-inventory.json', import.meta.url));
const temporary = target + '.' + process.pid + '.tmp';
await writeFile(temporary, JSON.stringify({ branch, products }, null, 2) + '\n', { flag: 'wx' });
await rename(temporary, target);
console.log('Imported ' + products.length + ' products' + (branch ? ' for ' + branch : '') + '. Run npm run dev to load them.');
