import { createProductTaxonomy } from './inventory-taxonomy.mjs';
import { createCatalogDescriptions } from './catalog-descriptions.mjs';
// Index once per server instance. Only matching records are sent to the AI.
export function createInventorySearch(products, categoryLabels, normalize) {
  const originalNormalize=normalize;
  normalize=value=>originalNormalize(value).replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/\s+/g,' ').trim();
  const taxonomy = createProductTaxonomy(products, categoryLabels, normalize);
  const descriptions=createCatalogDescriptions(products,categoryLabels,taxonomy,normalize);
  const descriptionAliases=new Set();
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
    const profile=descriptions.get(product.id);
    for(const alias of profile.aliases){descriptionAliases.add(alias);descriptionAliases.add(wordsOf(alias).map(singular).join(' '));}
    const aliases = [...(product.aliases || '').split('|').filter(Boolean).map(normalize), ...(taxonomy.records.get(product.id)?.searchTerms || []),...profile.aliases];
    const identifiers = [product.id, product.sku].filter(Boolean).map(normalize);
    const categoryKeys = [product.category, ...(product.additionalCategories || [])];
    const labels = categoryKeys.flatMap(key => categoryLabels[key] || [key]);
    const names = [name, normalize(product.name.ar || ''), ...aliases];
    const tokens = new Set(wordsOf([product.name.en, product.name.ar, product.brand, product.size.en,
      product.subcategory, ...labels, ...aliases].filter(Boolean).join(' ')).map(singular));
    const nameTokens = new Set(wordsOf(product.name.en).map(singular));
    return { product, name, names, identifiers, tokens, nameTokens, categoryKeys,profile };
  });
  // Exact department/aisle aliases come from the inventory itself, so new
  // categories can be searched even when no hand-authored type exists.
  const sourceCategories=new Map();
  const sourceTerms=new Map();
  const categoryKey=value=>normalize(value).replace(/\band\b/g,' ').replace(/\s+/g,' ').trim();
  for(const entry of indexed){
    const labels=[...entry.categoryKeys.flatMap(key=>categoryLabels[key]||[]),...(entry.product.subcategory||'').split(',')];
    for(const label of labels){
      const key=categoryKey(label);
      if(!key||/offer|promotion|buy.*win|^\d|^\$/.test(key))continue;
      if(!sourceCategories.has(key))sourceCategories.set(key,new Set());
      sourceCategories.get(key).add(entry.product.id);
    }
    for(const word of new Set(wordsOf(entry.product.name.en)))if(/^[a-z]{5,}$/.test(word))sourceTerms.set(word,(sourceTerms.get(word)||0)+1);
  }
  const spellingTerms=[...new Set([...sourceTerms].filter(([,n])=>n>=2).map(([word])=>word).concat([...sourceCategories.keys()].filter(key=>/^[a-z]{5,}$/.test(key))))];
  function distance(a,b){let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const row=[i+1];for(let j=0;j<b.length;j++)row.push(Math.min(row[j]+1,prev[j+1]+1,prev[j]+Number(a[i]!==b[j])));prev=row;}return prev[b.length];}
  function retailCanonicalQuery(input){
    const query=taxonomy.canonicalQuery(input);
    if(taxonomy.queryInfo(query).types.length||sourceCategories.has(categoryKey(query)))return query;
    // Fallback only for retail queries: a unique close spelling in supplier
    // names or aisles, never a forced guess for an ambiguous word.
    return query.split(' ').map(word=>{
      if(sourceTerms.has(word)||!/^[a-z]{6,}$/.test(word))return word;
      const alternatives=spellingTerms.filter(term=>term[0]===word[0]&&Math.abs(term.length-word.length)<=1).filter(term=>distance(term,word)===1);
      return alternatives.length===1?alternatives[0]:word;
    }).join(' ');
  }
  function search(input = '', category) {
    const query = taxonomy.canonicalQuery(input);
    const queryInfo = taxonomy.queryInfo(query);
    const categoryIds=!queryInfo.types.length&&sourceCategories.get(categoryKey(query));
    const queryWords = wordsOf(query).filter(word=>!queryInfo.identityConstrained||!['in','with','of','for','de','du','avec'].includes(word));
    const queryVariants = [...new Set([...(variants.get(query) || variants.get(singular(query)) || [query]),...queryInfo.aliases])];
    // Pet care is a distinct shopping domain. A name containing a food flavour
    // is not evidence that a shopper requested pet food. This also protects
    // unknown/unclassified food terms without adding a rule for every ingredient.
    const petContext=category==='pets'||queryInfo.types.some(type=>['cat food','dog food','pet accessories'].includes(type))||/\b(?:pets?|cats?|dogs?|kitten|kittens|puppy|puppies|litter|kibble|croquettes|chiens?|chats?|chiots?|chatons?|animaux|hamster|hamsters)\b|قطط|كلاب|حيوانات|بسة|بسس|كلب|قطط|bsaynet|kleb/i.test(query);
    return indexed.filter(entry => !category || entry.categoryKeys.includes(category) ||
      (category === 'offers' && entry.product.promotion === true)).map(entry => {
      if (!query) return { entry, score: 1 };
      if (normalize(entry.product.id) === query) return { entry, score: 10000 };
      if (entry.identifiers.includes(query)) return { entry, score: 9000 };
      if(categoryIds)return {entry,score:categoryIds.has(entry.product.id)?1500:0};
      const meta = taxonomy.records.get(entry.product.id);
      if(meta.department==='pets'&&!petContext&&!(meta.brandKey&&(' '+query+' ').includes(' '+meta.brandKey+' '))&&entry.name!==query)return {entry,score:0};
      if ((queryInfo.types.length || queryInfo.qualifiers.length || queryInfo.brands.length) && !taxonomy.compatible(queryInfo,entry.product)) {
        // A name+aisle-backed description can recover a supplier abbreviation
        // whose previous generic aisle classification missed the precise type.
        // No relaxation of diet, species, cut, brand or storage constraints.
        const recovered=!queryInfo.protein&&entry.profile.strictType&&queryInfo.types.includes(entry.profile.strictType)&&taxonomy.compatible({...queryInfo,types:[]},entry.product);
        if(!recovered)return {entry,score:0};
      }
      // An alias for the general commodity cannot satisfy an explicit variety.
      const requiredAttributes=queryInfo.attributes.filter(attribute=>attribute!=='whole'||!queryInfo.qualifiers.includes('whole-wheat'));
      const alternativeColours=/\bor\b|\bou\b/.test(query)&&requiredAttributes.filter(attribute=>['red','brown','green','white','yellow'].includes(attribute)).length>1;
      if(queryInfo.types.length && requiredAttributes.some(attribute=>!meta.attributes.includes(attribute)&&!(alternativeColours&&['red','brown','green','white','yellow'].includes(attribute))))return {entry,score:0};
      // A typed, unqualified family lookup is a metadata lookup, not a literal
      // substring filter. Explicit pack sizes still require a name/size match.
      const typed=queryInfo.types.some(type=>taxonomy.matchesType(meta,type));
      if(typed&&queryInfo.protein?.metadataOnly&&!queryInfo.brands.length&&(!/\d/.test(query)||queryInfo.protein.packWeight))return {entry,score:1900+Number(meta.protein?.preparation==='raw')*100};
      if(typed&&!queryInfo.brands.length&&!/\d/.test(query)&&meta.confidence!=='source-name'&&queryInfo.aliases.includes(query))return {entry,score:1800};
      if (entry.names.includes(query)) return { entry, score: 1000 + Number(meta.confidence!=='source-name'&&typed)*800 };
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
      if (score && meta.confidence!=='source-name' && typed) score += 800 + queryInfo.attributes.filter(a=>meta.attributes.includes(a)).length*30;
      return { entry, score };
    }).filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.entry.product.available === true) - Number(a.entry.product.available === true) ||
        a.entry.product.name.en.localeCompare(b.entry.product.name.en))
      .map(({ entry }) => entry.product);
  }
  search.taxonomy = taxonomy;
  search.descriptions=descriptions;
  search.hasDescriptionAlias=value=>descriptionAliases.has(normalize(value))||descriptionAliases.has(wordsOf(value).map(singular).join(' '));
  search.retailCanonicalQuery=retailCanonicalQuery;
  search.hasSourceCategory=query=>sourceCategories.has(categoryKey(query));
  return search;
}
