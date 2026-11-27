import { createProductTaxonomy } from './inventory-taxonomy.mjs';
// Match recipe ingredients to edible product types, not just words in any product.
export function createRecipeInventory(products, baseSearch, normalize) {
  const taxonomy = baseSearch.taxonomy || createProductTaxonomy(products,{},normalize);
  const byId = new Map(products.map(product => [product.id, product]));
  const food = new Set(['produce', 'dairy', 'meat', 'fish', 'bakery', 'pantry', 'ready', 'frozen', 'organic', 'snacks', 'beverages', 'coffee-tea']);
  const category = (product, key) => product.category === key || product.additionalCategories?.includes(key);
  const named = (product, pattern) => pattern.test(normalize(product.name.en));
  const dairyCream = product => category(product, 'dairy') && /butters.*creams/i.test(product.subcategory || '') && named(product, /\b(?:cream|creme)\b/) &&
    !named(product, /cheese|dessert|yogurt|milk|honey|strawb|caramel|vanill|tomato|sweet|cond|sour|light|legere/);
  const dairyButter = product => category(product, 'dairy') && named(product, /\bbutter\b/) && !named(product, /peanut|cocoa|cookie|biscuit|buttermilk/);
  const pantrySpice = product => category(product, 'pantry') && !named(product, /chips|crisps|crackers|biscuit|sauce|pasta|soup|noodle|popcorn|nuts|peanut|rice cake/);
  const profiles = [
    { key: 'fettuccine', terms: ['fettuccine', 'fettucine', 'fettucini', 'fettucini pasta', 'fettuccine pasta', 'pates fettuccine', 'فيتوتشيني', 'fettouccine'],
      accepts: p => category(p, 'pantry') && named(p, /\bfett?ucc?in[ei]\b/) && !named(p, /sauce|ready/), queries: ['fettucine', 'fettucini', 'fettuccine'] },
    { key: 'heavy-cream', terms: ['heavy cream', 'heavy whipping cream', 'creme entiere', 'creme liquide entiere', 'كريمة ثقيلة'],
      accepts: p => dairyCream(p) && (/\b(?:35|36|38|40)\s*%/.test(p.name.en) || named(p, /heavy cream|double cream/)), queries: ['cream', 'creme'] },
    { key: 'cooking-cream', terms: ['cooking cream', 'creme de cuisson', 'كريمة طبخ', 'كريمة الطبخ'],
      accepts: p => dairyCream(p) && named(p, /cook/), queries: ['cooking cream', 'cream cooking'] },
    { key: 'cream', terms: ['cream', 'creme', 'كريمة'], accepts: dairyCream, queries: ['cream', 'creme'] },
    { key: 'parmesan', terms: ['parmesan', 'parmesan cheese', 'grated parmesan', 'grated parmesan cheese', 'parmigiano', 'بارميزان'],
      accepts: p => category(p, 'dairy') && named(p, /parmesan|parmigiano|reggiano/), queries: ['parmesan', 'parmigiano', 'reggiano'] },
    { key: 'unsalted-butter', terms: ['unsalted butter', 'unsalt butter', 'beurre doux', 'زبدة غير مملحة'],
      accepts: p => dairyButter(p) && named(p, /unsalt|doux/), queries: ['butter'] },
    { key: 'butter', terms: ['butter', 'beurre', 'زبدة', 'zebde'], accepts: dairyButter, queries: ['butter'] },
    { key: 'salt', terms: ['salt', 'table salt', 'fine salt', 'sel', 'ملح', 'mele7'],
      accepts: p => pantrySpice(p) && named(p, /\bsalt\b/) && !named(p, /pepper|garlic|truffle|herb|chili|chi /), queries: ['salt'] },
    { key: 'black-pepper', terms: ['black pepper', 'ground black pepper', 'poivre noir', 'فلفل اسود', 'فلفل أسود'],
      accepts: p => pantrySpice(p) && named(p, /black pepper/), queries: ['black pepper'] },
    { key: 'pasta', terms: ['pasta', 'pates', 'معكرونة', 'مكرونة', 'باستا'],
      accepts: p => category(p, 'pantry') && /pasta.*noodle/i.test(p.subcategory || '') && !named(p, /sauce|funghi|pesto|parmigia|ready|instant/), queries: ['pasta'] },
    { key: 'olive-oil', terms: ['olive oil', 'huile d olive', 'huile olive', 'زيت زيتون', 'zeit zaytoun'],
      accepts: p => category(p, 'pantry') && named(p, /olive oil|huile.*olive/) && !named(p, /tuna|sardine|sauce|pesto|mackerel|chickpea/), queries: ['olive oil'] },
    { key: 'chickpeas', terms: ['chickpeas', 'chickpea', 'pois chiches', 'حمص', '7ommos'],
      accepts: p => category(p, 'pantry') && named(p, /chickpea|pois chiche/) && !named(p, /soup|chips|flour/), queries: ['chickpeas'] },
    { key: 'tahini', terms: ['tahini', 'tahina', 't7ine', 'طحينة'], accepts: p => category(p, 'pantry') && named(p, /tahin/), queries: ['tahini'] },
    { key: 'bulgur', terms: ['bulgur', 'burghol', 'borghol', 'borgol', 'burghul', 'boulgour', 'bourghoul', 'برغل', 'البرغل'], accepts: p => category(p, 'pantry') && named(p, /bulgur|burghol|borghol|borgol|burghul|boulgour|bourghoul/), queries: ['bulgur'] },
    { key: 'pita', terms: ['pita', 'pita bread', 'arabic bread', 'pain pita', 'khebez 3arabe', 'خبز عربي'],
      accepts: p => category(p, 'bakery') && named(p, /pita|arabic|arabe/), queries: ['arabic bread', 'pita'] },
    ...[
      ['rice', ['rice', 'riz', 'رز', 'رزّ', 'rezz']], ['lentils', ['lentils', 'lentil', 'lentilles', 'عدس', '3adas']],
      ['cumin', ['cumin', 'كمون', 'kammoun']], ['paprika', ['paprika', 'بابريكا']], ['sumac', ['sumac', 'سماق', 'somma2']],
    ].map(([key, terms]) => ({ key, terms, accepts: p => taxonomy.records.get(p.id)?.productType === key && !named(p, /cake|pudding|flour/), queries: [key] })),
    ...[
      ['parsley', ['parsley', 'persil', 'بقدونس', 'ba2dounes']], ['tomatoes', ['tomato', 'tomatoes', 'tomates', 'بندورة', 'طماطم']],
      ['mint', ['mint', 'menthe', 'نعناع', 'na3na3']], ['lemons', ['lemon', 'lemons', 'citron', 'citrons', 'حامض', 'ليمون', '7amod']],
      ['onions', ['onion', 'onions', 'oignons', 'بصل', 'basal']], ['garlic', ['garlic', 'ail', 'ثوم', 'توم', 'toum']],
      ['cucumbers', ['cucumber', 'cucumbers', 'concombre', 'concombres', 'خيار', 'khyar']], ['lettuce', ['lettuce', 'laitue', 'خس', 'khass']],
      ['potatoes', ['potato', 'potatoes', 'pommes de terre', 'بطاطا', 'batata']],
      ['radish', ['radish', 'radishes', 'red radishes', 'radis', 'فجل', 'fejel']],
    ].map(([key, terms]) => ({ key, terms, accepts: p => category(p, 'produce'), queries: [key] })),
  ].map(profile => ({ ...profile, terms: profile.terms.map(normalize) }));
  function editDistance(left, right) {
    let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 1; i <= left.length; i++) {
      const row = [i];
      for (let j = 1; j <= right.length; j++) row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(left[i - 1] !== right[j - 1]));
      previous = row;
    }
    return previous[right.length];
  }
  function profileFor(query) {
    const value = normalize(query);
    const exact = profiles.find(profile => profile.terms.includes(value));
    if (exact) return exact;
    // Never "correct" a recognized type into a different food (for example chicken/chickpea).
    if (taxonomy.queryInfo(value).types.length) return undefined;
    // Correct short ingredient typos only; never fuzz brands, IDs, full questions or dietary qualifiers.
    if (!/^[a-z ]{6,32}$/.test(value) || value.split(' ').length > 3) return undefined;
    const candidates = profiles.flatMap(profile => profile.terms.filter(term => /^[a-z ]{6,32}$/.test(term) && term.slice(0, 3) === value.slice(0, 3) && Math.abs(term.length - value.length) <= 2)
      .map(term => ({ profile, distance: editDistance(value, term) }))).filter(result => result.distance <= 2).sort((a, b) => a.distance - b.distance);
    if (!candidates.length || candidates.some(candidate => candidate.distance === candidates[0].distance && candidate.profile !== candidates[0].profile)) return undefined;
    return candidates[0].profile;
  }
  const edible = product => [product.category, ...(product.additionalCategories || [])].some(key => food.has(key));
  const stem = word => word.length > 3 && !word.endsWith('ss') ? word.replace(/ies$/, 'y').replace(/s$/, '') : word;
  const tokens = value => normalize(value).split(' ').filter(Boolean).map(stem);
  const queryFor = entry => String(entry.catalogQuery || entry.name || '').trim().slice(0, 120);
  function proteinIntent(entry) {
    const lookup=taxonomy.queryInfo(queryFor(entry)).protein;
    if(!lookup)return null;
    const named=taxonomy.queryInfo(entry.name||'').protein;
    // A model-selected processed SKU name is not an ingredient requirement.
    // The canonical ingredient lookup is authoritative; a plain named cut
    // can refine it, but must not turn raw chicken into escalope or nuggets.
    const cut=lookup.cut||(!lookup.form&&named?.species===lookup.species&&!named.form?named.cut:null);
    return {...lookup,cut:cut||(!lookup.form&&lookup.species==='chicken'?'breast':null),raw:lookup.raw||!lookup.form,
      boneless:lookup.boneless||Boolean(!lookup.form&&named?.species===lookup.species&&!named.form&&named.boneless)};
  }
  const requirements = [
    [/gluten free|sans gluten/, /gluten\s*free|sans gluten/],
    [/lactose free|sans lactose/, /lactose\s*free|sans lactose/],
    [/\bvegan\b/, /\bvegan\b/],
    [/whole wheat|wholemeal|ble complet/, /whole\s*wheat|wholemeal|integral|complet/],
    [/unsalted|beurre doux/, /unsalt|doux/],
  ];
  function eligible(entry, product) {
    if (!product || !edible(product)) return false;
    const query = normalize(queryFor(entry));
    const requested = normalize(queryFor(entry) + ' ' + (entry.name || ''));
    const name = normalize(product.name.en);
    const profile = profileFor(query) || profileFor(entry.name || '');
    if (!taxonomy.compatible(query,product)) return false;
    const localized = taxonomy.queryInfo(entry.name || '');
    const protein=proteinIntent(entry);
    const meta=taxonomy.records.get(product.id);
    if(protein){
      if(meta?.protein?.bundle||!taxonomy.compatible({ ...taxonomy.queryInfo(query),protein },product))return false;
    }else if (localized.types.length && !taxonomy.compatible(localized,product)) return false;
    if (profile && !profile.accepts(product)) return false;
    if (!protein&&taxonomy.queryInfo(query).types.some(type=>['chicken','beef','lamb'].includes(type))) {
      if (/cold cuts/i.test(product.subcategory||'') && !/cold cut|smoked|mortad|sausage/.test(requested)) return false;
      for (const form of ['escalope','escallop','breaded','crispy','crunchy','marinated','fajita','sauce','soudjouk','nugget','burger']) {
        if (name.includes(form) && !requested.includes(form)) return false;
      }
    }
    for (const [condition, evidence] of requirements) if (condition.test(requested) && !evidence.test(name)) return false;
    // A flavor or ingredient mentioned inside a different food does not make it the requested ingredient.
    const composed = ['tuna', 'sardine', 'mackerel', 'chips', 'crisps', 'biscuit', 'cookie', 'cracker', 'sausage', 'mortadella', 'nuggets', 'burger', 'soup'];
    if (composed.some(word => new RegExp('\\b' + word + '\\b').test(name) && !new RegExp('\\b' + word + '\\b').test(query))) return false;
    if (/all purpose|wheat flour/.test(requested) && /corn flour|rice flour|almond flour|coconut flour|self rais/.test(name)) return false;
    if (/white sugar/.test(requested) && /brown|coconut/.test(name)) return false;
    if (/\bchicken\b/.test(requested) && /\bturkey|\bbeef|\bpork/.test(name) && !/\bchicken\b/.test(name)) return false;
    if (/\b(?:milk|cream|butter|sugar|flour)\b/.test(requested) && ['chocolate', 'vanilla', 'strawberry', 'caramel'].some(flavor => name.includes(flavor) && !requested.includes(flavor))) return false;
    if (/fresh (?:milk|mushroom|tomato)|raw chicken/.test(requested) && /powder|dried|dehydrat|canned|condensed|cooked|grilled/.test(name)) return false;
    return true;
  }
  const candidateCache = new Map();
  function candidates(entry, limit = 8) {
    const query = queryFor(entry);
    const key = normalize(query + '|' + (entry.name || ''));
    if (candidateCache.has(key)) return candidateCache.get(key).slice(0, limit);
    const profile = profileFor(query) || profileFor(entry.name || '');
    const protein=proteinIntent(entry);
    const clean = normalize(query).replace(/\b(?:finely|roughly|chopped|diced|sliced|peeled|grated|minced|to taste|for garnish|freshly)\b/g, ' ').replace(/ +/g, ' ').trim();
    const words = clean.split(' ').filter(word => word.length > 2 && !['and', 'the', 'with', 'for'].includes(word));
    const searches = protein ? [query,...(protein.metadataOnly||protein.unsupported?[protein.species]:[])] : profile ? [profile.terms[0]] : [...new Set([query, clean, words.slice(-2).join(' '), ...words])].filter(Boolean).slice(0, 8);
    const pool = [...new Map(searches.flatMap(term => search(term)).map(product => [product.id, product])).values()];
    const requested = tokens(query);
    const ranked = pool.filter(product => eligible(entry, product)).map(product => {
      const nameTokens = new Set(tokens(product.name.en));
      const overlap = requested.filter(word => nameTokens.has(word)).length;
      const plain = ['produce', 'dairy', 'meat', 'fish', 'pantry', 'bakery'].some(key => category(product, key));
      const meta = taxonomy.records.get(product.id), info = taxonomy.queryInfo(query);
      return { product, score: overlap * 10 + Number(overlap === requested.length) * 15 + Number(plain) * 8 + Number(product.available === true) * 20 + Number(info.types.includes(meta.productType))*50 + info.attributes.filter(a=>meta.attributes.includes(a)).length*15 };
    }).sort((a, b) => (protein?Number(b.product.available===true)-Number(a.product.available===true):0)||b.score - a.score || a.product.name.en.localeCompare(b.product.name.en)).map(({ product }) => product);
    if(candidateCache.size>=512)candidateCache.delete(candidateCache.keys().next().value);
    candidateCache.set(key, ranked);
    return ranked.slice(0, limit);
  }
  const cached = new Map();
  function search(query, selectedCategory) {
    const profile = profileFor(query);
    if (!profile) return baseSearch(query, selectedCategory);
    const key = profile.key + ':' + (selectedCategory || '');
    if (cached.has(key)) return cached.get(key);
    const hits = [...new Map(profile.queries.flatMap(term => baseSearch(term)).map(product => [product.id, product])).values()]
      .filter(product => edible(product) && profile.accepts(product) && (!selectedCategory || category(product, selectedCategory)));
    hits.sort((a, b) => Number(b.available === true) - Number(a.available === true) || a.name.en.localeCompare(b.name.en));
    cached.set(key, hits);
    return hits;
  }
  function resolve(entry, allowedIds) {
    const existing = allowedIds.has(entry.id) ? byId.get(entry.id) : null;
    const query = typeof entry.catalogQuery === 'string' && entry.catalogQuery.trim() ? entry.catalogQuery.trim() : entry.name || '';
    const profile = profileFor(query) || profileFor(entry.name || '');
    const protein=proteinIntent(entry);
    // Keep exact, valid choices. Replace a sold-out generic choice only with the same ingredient type.
    if (existing && eligible(entry, existing) && (existing.available === true || !profile&&!protein)) return existing;
    const matches = profile ? search(profile.terms[0]).filter(product => eligible(entry, product)) : candidates(entry, 30);
    if(protein)return matches.find(p=>p.available===true)||(existing&&eligible(entry,existing)?existing:matches[0])||null;
    if (!profile) {
      const exact = matches.find(product => normalize(product.name.en) === normalize(query) || product.id === query || product.sku === query);
      // Full ingredient phrases may occur within branded names or in a different word order.
      const words = tokens(query);
      const info = taxonomy.queryInfo(query);
      const equivalent = info.types.length && matches.find(product=>{
        const meta=taxonomy.records.get(product.id);
        return info.types.includes(meta.productType) && info.attributes.every(a=>meta.attributes.includes(a)) && taxonomy.compatible(info,product);
      });
      const phrase = words.length >= 2 && matches.find(product => {
        const name = new Set(tokens(product.name.en));
        return words.every(word => name.has(word));
      });
      return exact || phrase || equivalent || (existing && eligible(entry, existing) ? existing : null);
    }
    return matches.find(product => product.available === true) ||
      (existing && eligible(entry, existing) ? existing : matches[0]) || null;
  }
  return { search, resolve, candidates, eligible, taxonomy, products };
}
