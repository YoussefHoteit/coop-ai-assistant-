import { createProductTaxonomy } from './inventory-taxonomy.mjs';
// Index once per server instance. Only matching records are sent to the AI.
export function createInventorySearch(products, categoryLabels, normalize) {
  const taxonomy = createProductTaxonomy(products, categoryLabels, normalize);
  const groups = [
    ['chicken', 'دجاج', 'جاج', 'poulet', 'djej', 'jaj'],
    ['beef', 'بقر', 'boeuf'], ['fish', 'سمك', 'poisson'],
    ['shrimp', 'روبيان', 'قريدس', 'crevette', 'crevettes'],
    ['pasta', 'معكرونة', 'مكرونة', 'باستا', 'pates'],
    ['rice', 'رز', 'ارز', 'riz'], ['milk', 'حليب', 'lait', '7alib'],
    ['cream', 'كريمة', 'creme'], ['butter', 'زبدة', 'beurre', 'zebde'],
    ['cheese', 'جبنة', 'جبن', 'fromage', 'jebne', 'jibne'],
    ['labneh', 'لبنة', 'labne', 'labneh'], ['yogurt', 'لبن', 'yaourt', 'laban'],
    ['eggs', 'egg', 'بيض', 'oeufs', 'bayd'],
    ['tomatoes', 'tomato', 'بندورة', 'طماطم', 'tomate', 'banadoura'],
    ['cucumber', 'cucumbers', 'خيار', 'concombre', 'khyar'],
    ['potatoes', 'potato', 'بطاطا', 'بطاطس', 'batata'],
    ['onion', 'onions', 'بصل', 'oignon', 'basal'],
    ['garlic', 'ثوم', 'توم', 'ail', 'toum'], ['lemon', 'lemons', 'ليمون', 'حامض', 'citron', '7amod'],
    ['mushrooms', 'mushroom', 'فطر', 'champignon'],
    ['parsley', 'بقدونس', 'persil', 'ba2dounes'], ['mint', 'نعناع', 'menthe', 'na3na3'],
    ['chickpeas', 'chickpea', 'حمص', 'hummus', 'pois chiches'], ['tahini', 'طحينة', 'tahina'],
    ['bread', 'خبز', 'pain', 'khobez'], ['lettuce', 'خس', 'laitue'],
    ['carrots', 'carrot', 'جزر', 'carotte'], ['bulgur', 'برغل', 'burghol', 'boulgour'],
    ['salt', 'ملح', 'sel'], ['pepper', 'فلفل', 'poivre'],
    ['sugar', 'سكر', 'sucre'], ['water', 'ماء', 'مياه', 'eau', 'may'],
    ['parmesan', 'بارميزان', 'parmesan'], ['olive oil', 'زيت زيتون', 'huile olive', 'zeit zaytoun'],
    ['car charger', 'car adapter', 'شاحن سيارة', 'chargeur voiture', 'chargeur de voiture', 'shahen sayara'],
    ['charger', 'chargers', 'شاحن', 'chargeur'],
    ['socks', 'sock', 'شرابات', 'جرابات', 'chaussettes', 'jrab', 'sharabet'],
    ['pencil', 'pencils', 'قلم رصاص', 'crayon'], ['pen', 'pens', 'قلم', 'اقلام', 'stylo'],
    ['backpack', 'backpacks', 'school bag', 'schoolbag', 'rucksack', 'حقيبة مدرسية', 'شنطة مدرسة', 'sac ecole', 'sac a dos', 'cartable'],
    ['pencil case', 'pencilcase', 'مقلمة', 'trousse'],
    ['notebook', 'notebooks', 'notebk', 'note book', 'دفتر', 'دفاتر', 'cahier'],
    ['ruler', 'rulers', 'ruller', 'مسطرة', 'regle'],
    ['eraser', 'erasers', 'ممحاة', 'gomme'], ['sharpener', 'براية', 'taille crayon'],
  ].map(group => group.map(normalize));
  const variants = new Map();
  for (const group of groups) for (const word of group) variants.set(word, group);
  const singular = word => word.length > 3 && !word.endsWith('ss') ? word.replace(/ies$/, 'y').replace(/s$/, '') : word;
  for (const group of groups) for (const word of group) if (!word.includes(' ')) variants.set(singular(word), group);
  const wordsOf = value => normalize(value).split(' ').filter(Boolean);
  const indexed = products.map(product => {
    const name = normalize(product.name.en);
    const aliases = [...(product.aliases || '').split('|').filter(Boolean).map(normalize), ...(taxonomy.records.get(product.id)?.searchTerms || [])];
    const identifiers = [product.id, product.sku].filter(Boolean).map(normalize);
    const categoryKeys = [product.category, ...(product.additionalCategories || [])];
    const labels = categoryKeys.flatMap(key => categoryLabels[key] || [key]);
    const names = [name, normalize(product.name.ar || ''), ...aliases];
    const tokens = new Set(wordsOf([product.name.en, product.name.ar, product.brand, product.size.en,
      product.subcategory, ...labels, ...aliases].filter(Boolean).join(' ')).map(singular));
    const nameTokens = new Set(wordsOf(product.name.en).map(singular));
    return { product, name, names, identifiers, tokens, nameTokens, categoryKeys };
  });
  function search(input = '', category) {
    const query = normalize(input);
    const queryInfo = taxonomy.queryInfo(query);
    const queryWords = wordsOf(query);
    const queryVariants = [...new Set([...(variants.get(query) || variants.get(singular(query)) || [query]),...queryInfo.aliases])];
    return indexed.filter(entry => !category || entry.categoryKeys.includes(category) ||
      (category === 'offers' && entry.product.promotion === true)).map(entry => {
      if (!query) return { entry, score: 1 };
      if (normalize(entry.product.id) === query) return { entry, score: 10000 };
      if (entry.identifiers.includes(query)) return { entry, score: 9000 };
      const meta = taxonomy.records.get(entry.product.id);
      if (queryInfo.types.includes(meta.productType) && !taxonomy.compatible(queryInfo,entry.product)) return {entry,score:0};
      if (entry.names.includes(query)) return { entry, score: 1000 + Number(meta.confidence!=='source-name'&&queryInfo.types.includes(meta.productType))*800 };
      let score = 0;
      if (queryVariants.some(term => entry.names.some(name => (' ' + name + ' ').includes(' ' + term + ' ')))) score = 500;
      if (!score) {
        const hits = queryWords.map(word => (variants.get(word) || variants.get(singular(word)) || [word]).some(term => {
          const parts = wordsOf(term).map(singular);
          return parts.every(part => entry.tokens.has(part) || (part.length >= 4 &&
            [...entry.tokens].some(token => token.startsWith(part))));
        }));
        if (hits.length && hits.every(Boolean)) score = 100 + queryWords.filter(word => entry.nameTokens.has(singular(word))).length * 5;
      }
      if (score && meta.confidence!=='source-name' && queryInfo.types.includes(meta.productType)) score += 800 + queryInfo.attributes.filter(a=>meta.attributes.includes(a)).length*30;
      return { entry, score };
    }).filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.entry.product.available === true) - Number(a.entry.product.available === true) ||
        a.entry.product.name.en.localeCompare(b.entry.product.name.en))
      .map(({ entry }) => entry.product);
  }
  search.taxonomy = taxonomy;
  return search;
}
