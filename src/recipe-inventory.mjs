// Match recipe ingredients to edible product types, not just words in any product.
export function createRecipeInventory(products, baseSearch, normalize) {
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
    { key: 'bulgur', terms: ['bulgur', 'burghol', 'boulgour', 'برغل'], accepts: p => category(p, 'pantry') && named(p, /bulgur|burghol|boulgour/), queries: ['bulgur'] },
    { key: 'pita', terms: ['pita', 'pita bread', 'arabic bread', 'pain pita', 'khebez 3arabe', 'خبز عربي'],
      accepts: p => category(p, 'bakery') && named(p, /pita|arabic|arabe/), queries: ['arabic bread', 'pita'] },
    ...[
      ['rice', ['rice', 'riz', 'رز', 'رزّ', 'rezz']], ['lentils', ['lentils', 'lentil', 'lentilles', 'عدس', '3adas']],
      ['cumin', ['cumin', 'كمون', 'kammoun']], ['paprika', ['paprika', 'بابريكا']], ['sumac', ['sumac', 'سماق', 'somma2']],
    ].map(([key, terms]) => ({ key, terms, accepts: p => pantrySpice(p) && named(p, new RegExp('\\b' + key.replace(/s$/, '') + 's?\\b')) && !named(p, /cake|pudding|flour/), queries: [key] })),
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
    // Correct short ingredient typos only; never fuzz brands, IDs, full questions or dietary qualifiers.
    if (!/^[a-z ]{6,32}$/.test(value) || value.split(' ').length > 3) return undefined;
    const candidates = profiles.flatMap(profile => profile.terms.filter(term => /^[a-z ]{6,32}$/.test(term) && term.slice(0, 3) === value.slice(0, 3) && Math.abs(term.length - value.length) <= 2)
      .map(term => ({ profile, distance: editDistance(value, term) }))).filter(result => result.distance <= 2).sort((a, b) => a.distance - b.distance);
    if (!candidates.length || candidates.some(candidate => candidate.distance === candidates[0].distance && candidate.profile !== candidates[0].profile)) return undefined;
    return candidates[0].profile;
  }
  const edible = product => [product.category, ...(product.additionalCategories || [])].some(key => food.has(key));
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
    const existing = allowedIds.has(entry.id) ? products.find(product => product.id === entry.id) : null;
    const query = typeof entry.catalogQuery === 'string' && entry.catalogQuery.trim() ? entry.catalogQuery.trim() : entry.name || '';
    const profile = profileFor(query) || profileFor(entry.name || '');
    // Keep exact, valid choices. Replace a sold-out generic choice only with the same ingredient type.
    if (existing && edible(existing) && (!profile || profile.accepts(existing)) && (existing.available === true || !profile)) return existing;
    const candidates = search(profile ? profile.terms[0] : query).filter(product => edible(product) && (!profile || profile.accepts(product)));
    if (!profile) {
      // Without a known ingredient type, accept only an exact product-name or identifier match.
      const exact = candidates.find(product => normalize(product.name.en) === normalize(query) || product.id === query || product.sku === query);
      return existing && edible(existing) ? existing : exact || null;
    }
    return candidates.find(product => product.available === true) ||
      (existing && profile.accepts(existing) ? existing : candidates[0]) || null;
  }
  return { search, resolve };
}
