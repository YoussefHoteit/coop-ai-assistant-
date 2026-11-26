export function measurement(value) {
  const text = String(value || '').toLowerCase().replace(/([0-9])(?=[¼½¾⅓⅔])/g, '$1 ').normalize('NFKC')
    .replace(/[٠-٩۰-۹]/g, n => String(n.charCodeAt(0) & 15)).replace(/٫/g, '.').replace(/⁄/g, '/').trim();
  const match = text.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*(.*)$/u);
  if (!match) return null;
  const amount = match[1].replace(',', '.').split(/\s+(?=\d+\s*\/)/).reduce((sum, part) => {
    const [n, d = '1'] = part.split('/');
    return sum + Number(n) / Number(d);
  }, 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const units = [
    ['weight', 1000, /^(?:kg|kilos?|kilograms?|kilogrammes?|كغ|كجم|كيلو(?:غرام)?)(?!\p{L})/u],
    ['weight', 1, /^(?:g|gr|grams?|grammes?|غ|غرام|جرام)(?!\p{L})/u],
    ['weight', 453.59237, /^(?:lbs?|pounds?|livres?)(?!\p{L})/u],
    ['weight', 28.349523125, /^(?:oz|ounces?)(?!\p{L})/u],
    ['volume', 1000, /^(?:l|liters?|litres?|لتر|ليتر)(?!\p{L})/u],
    ['volume', 10, /^(?:cl|centilitres?)(?!\p{L})/u],
    ['volume', 1, /^(?:ml|millilitres?|milliliters?|مل|ملل)(?!\p{L})/u],
    ['pieces', 1, /^(?:(?:large|small|medium|fresh|gros|petits?)\s+)?(?:pcs|pieces?|pièces?|eggs?|œufs?|oeufs?|بيض(?:ات)?|حبات?|قطع|وحدات?)(?!\p{L})/u],
    ['packs', 1, /^(?:packs?|packets?|cans?|cartons?|bottles?|bags?|briques?|boîtes?|sachets?|paquets?|bouteilles?|علب|علبة|عبوات?|أكياس|كيس|قنينة|3elab|3elbe)(?!\p{L})/u],
    ['volume', 15, /^(?:tbsp|tablespoons?|cuillères? à soupe|ملعقة كبيرة|ملاعق كبيرة)(?!\p{L})/u],
    ['volume', 5, /^(?:tsp|teaspoons?|cuillères? à café|ملعقة صغيرة|ملاعق صغيرة)(?!\p{L})/u],
  ];
  const rest = match[2];
  const multiplier = rest.match(/^[x×*]\s*(.+)$/u);
  if (multiplier) {
    const inner = measurement(multiplier[1]);
    return inner && { value: amount * inner.value, kind: inner.kind };
  }
  const unit = units.find(([, , pattern]) => pattern.test(rest));
  if (!unit) return null;
  if (unit[0] === 'packs') {
    const inner = measurement(rest.replace(unit[2], '').trim().replace(/^(?:of|de|d'|من)\s*/u, ''));
    if (inner && ['weight','volume','pieces'].includes(inner.kind)) return { value: amount * inner.value, kind: inner.kind };
  }
  return { value: amount * unit[1], kind: unit[0] };
}

export function productMeasurement(product) {
  const name = product.name?.en || '';
  const multi = name.match(/\b\d+\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:kg|gr|g|ml|cl|l|lb|oz|pcs)\b/i);
  if(multi)return measurement(multi[0]);
  const reverse=name.match(/\b(\d+(?:[.,]\d+)?\s*(?:kg|gr|g|ml|cl|l|lb|oz|pcs))\s*[x×*]\s*(\d+)\b/i);
  if(reverse){const size=measurement(reverse[1]);if(size)return {value:size.value*Number(reverse[2]),kind:size.kind};}
  const count=name.match(/\b(\d+)\s*(?:'s|s'|pcs|pieces)\b/i);
  const size=measurement(product.size?.en||product.size||'');
  if(size&&['weight','volume'].includes(size.kind))return size;
  if(count)return {value:Number(count[1]),kind:'pieces'};
  if(/\beggs?\b/i.test(name)){
    const eggCount=name.match(/\*\s*(\d+)\b|\b(\d+)\s*s\b/i);
    if(eggCount)return {value:Number(eggCount[1]||eggCount[2]),kind:'pieces'};
    if(size?.kind==='packs')return {value:size.value,kind:'pieces'};
  }
  return size;
}

export function purchaseAmount(entry, product) {
  const amount = entry.purchaseAmount || entry.amount || '1 pack';
  const pack = productMeasurement(product);
  const parsed = measurement(amount);
  if ((!parsed || parsed.kind !== pack?.kind && parsed.kind !== 'packs') && pack?.kind === 'weight' && Number.isFinite(entry.grams) && entry.grams > 0) return entry.grams + ' g';
  return amount;
}

export function packQuantity(entry, product = entry) {
  if (Number.isInteger(entry.quantity) && entry.quantity > 0) return Math.min(99, entry.quantity);
  const values = entry.contributions ? Object.entries(entry.contributions).map(([key,value])=>entry.purchaseContributions?.[key]||value) : [purchaseAmount(entry,product)];
  const pack = productMeasurement(product);
  let required = 0;
  let packs = 0;
  for (const value of values.flatMap(value=>String(value).split(' + '))) {
    const amount = measurement(value);
    if (amount?.kind === 'packs') packs += amount.value;
    else if (amount && pack && amount.kind === pack.kind) required += amount.value;
    else if (amount?.kind === 'pieces' && !pack) packs += amount.value;
  }
  return Math.min(999, Math.max(1, Math.ceil(packs + (pack ? required / pack.value : 0))));
}

export function basketSummary(entries, productMap = new Map()) {
  let cents = 0, quantity = 0, unpriced = 0, unavailable = 0;
  let uncertain = 0;
  for (const entry of entries) {
    const product = productMap.get(entry.id) || entry;
    const count = packQuantity(entry, product);
    quantity += count;
    if (product.available === false) { unavailable++; continue; }
    const pack = productMeasurement(product);
    const amounts = entry.contributions ? Object.entries(entry.contributions).map(([key,value])=>entry.purchaseContributions?.[key]||value) : [purchaseAmount(entry,product)];
    if (!entry.quantity && amounts.flatMap(value=>String(value).split(' + ')).some(value => {
      const amount = measurement(value);
      return amount ? amount.kind!=='packs' && (amount.kind!==pack?.kind && !(amount.kind==='pieces'&&!pack)) : /\d/.test(value);
    })) uncertain++;
    if (!Number.isFinite(product.price)) unpriced++;
    else cents += Math.round(product.price * 100) * count;
  }
  return { count: entries.length, quantity, total: cents / 100, unpriced, unavailable, ...(uncertain && {uncertain}) };
}

export function groupShoppingEntries(entries, mode = 'all') {
  const groups = new Map();
  for (const entry of entries) {
    const labels = Object.values(entry.groups || {}).filter(group => group.kind === 'recipe');
    const unique = [...new Set(labels.map(group => group.title))];
    const label = mode === 'recipe' ? unique.length > 1 ? '__shared' : unique[0] || '__other' : '__all';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  }
  return [...groups].map(([label, items]) => ({ label, items }));
}

export const shoppingCopy = {
  en: { welcomeTitle: 'What can we help you find?', welcomeIntro: 'Good meals. Smart choices. Easier shopping.', mealAction: 'Cook something delicious', findAction: 'Find a product', planAction: 'Plan my shopping',
    allItems: 'All items', byRecipe: 'By recipe', estimated: 'Estimated total', packs: 'packs', quantity: 'Quantity', clear: 'Clear list', undo: 'Undo', done: 'Continue chatting',
    other: 'Everyday essentials', shared: 'Shared ingredients', allGroup: 'Your picks', needed: 'Recipe needs', remove: 'Remove', empty: 'Your next good idea starts here', emptyInfo: 'Add a product or a recipe’s ingredients as you chat.',
    removed: 'Item removed', cleared: 'List cleared', updated: 'Quantity updated', undoDone: 'Change undone', unknownPrices: 'Some prices are unavailable', unavailableItems: 'Out-of-stock items excluded', chatSubtitle: 'Your shopping companion',
    list: 'Your shopping list', add: 'Add to list', all: 'Add ingredients', ready: 'Ready for your next shop', copy: 'Copy list', welcome: 'Hi! What are we shopping for today?' },
  ar: { welcomeTitle: 'كيف يمكننا مساعدتك بالتسوّق؟', welcomeIntro: 'وجبات شهية. خيارات أذكى. تسوّق أسهل.', mealAction: 'حضّر وجبة لذيذة', findAction: 'ابحث عن منتج', planAction: 'خطّط للتسوّق',
    allItems: 'كل المنتجات', byRecipe: 'حسب الوصفة', estimated: 'المجموع التقديري', packs: 'عبوات', quantity: 'الكمية', clear: 'إفراغ القائمة', undo: 'تراجع', done: 'متابعة المحادثة',
    other: 'الاحتياجات اليومية', shared: 'مكونات مشتركة', allGroup: 'اختياراتك', needed: 'مطلوب للوصفة', remove: 'حذف', empty: 'قائمتك تنتظر فكرتك التالية', emptyInfo: 'أضف المنتجات أو مكونات وصفة أثناء المحادثة.',
    removed: 'تم حذف المنتج', cleared: 'تم إفراغ القائمة', updated: 'تم تعديل الكمية', undoDone: 'تم التراجع', unknownPrices: 'بعض الأسعار غير متوفرة', unavailableItems: 'المنتجات غير المتوفرة لا تدخل في المجموع', chatSubtitle: 'رفيقك في التسوّق',
    list: 'قائمة مشترياتك', add: 'أضف إلى القائمة', all: 'أضف المكونات', ready: 'جاهزة لتسوّقك القادم', copy: 'نسخ القائمة', welcome: 'أهلاً! ماذا نشتري اليوم؟' },
  fr: { welcomeTitle: 'Comment pouvons-nous vous aider ?', welcomeIntro: 'De bons repas. De bons choix. Des courses plus simples.', mealAction: 'Préparer un bon repas', findAction: 'Trouver un produit', planAction: 'Planifier mes courses',
    allItems: 'Tous les articles', byRecipe: 'Par recette', estimated: 'Total estimé', packs: 'paquets', quantity: 'Quantité', clear: 'Vider la liste', undo: 'Annuler', done: 'Reprendre la discussion',
    other: 'Les essentiels', shared: 'Ingrédients partagés', allGroup: 'Votre sélection', needed: 'Pour la recette', remove: 'Retirer', empty: 'Votre prochaine idée commence ici', emptyInfo: 'Ajoutez des produits ou les ingrédients d’une recette pendant la discussion.',
    removed: 'Article retiré', cleared: 'Liste vidée', updated: 'Quantité modifiée', undoDone: 'Modification annulée', unknownPrices: 'Certains prix sont indisponibles', unavailableItems: 'Articles épuisés exclus du total', chatSubtitle: 'Votre compagnon de courses',
    list: 'Votre liste de courses', add: 'Ajouter à la liste', all: 'Ajouter les ingrédients', ready: 'Prête pour vos prochaines courses', copy: 'Copier la liste', welcome: 'Bonjour ! Qu’achetons-nous aujourd’hui ?' },
  arz: { welcomeTitle: 'Shou badkon teshtro el yom?', welcomeIntro: 'Akel tayyeb. Khiyarat azka. Shopping ashal.', mealAction: '7addir akle tayybe', findAction: 'Fattesh 3an product', planAction: 'Ratteb el moshtarayet',
    allItems: 'Kel el products', byRecipe: '7asab el wasfe', estimated: 'El majmou3 el ta2ribe', packs: '3elab', quantity: 'El kammiye', clear: 'Fadde el list', undo: 'Taraja3', done: 'Kammel el chat',
    other: 'El essentials', shared: 'Mokawwenet moshtarake', allGroup: 'Khiyaratak', needed: 'Matloub lal wasfe', remove: 'Shil', empty: 'Listak nater fikrtak el jeye', emptyInfo: 'Zid products aw mokawwenet el wasfe w enta 3am te7ke.',
    removed: 'Nshal el product', cleared: 'Fadyet el list', updated: 'Tghayyarit el kammiye', undoDone: 'Rja3 el taghyir', unknownPrices: 'Fi as3ar mish metwafra', unavailableItems: 'El products li mish metwafra mish bel majmou3', chatSubtitle: 'Rafi2ak bel shopping',
    list: 'List el moshtarayet', add: 'Zid 3al list', all: 'Zid el mokawwenet', ready: 'Jahze lal shopping', copy: 'Nsekh el list', welcome: 'Marhaba! Shou badna neshtre el yom?' },
};
