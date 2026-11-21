export function measurement(value) {
  const text = String(value || '').toLowerCase().replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).replace(/[٬،]/g, ',').replace(/٫/g, '.');
  const match = text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|cl|l|packs?|packets?|pcs|pieces?)\b/i);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  const unit = match[2];
  if (!Number.isFinite(n) || n <= 0) return null;
  return { value: n * ({ kg: 1000, l: 1000, cl: 10 }[unit] || 1), kind: ['kg', 'gr', 'g'].includes(unit) ? 'weight' : ['l', 'ml', 'cl'].includes(unit) ? 'volume' : /^(?:pcs|pieces?)$/.test(unit) ? 'pieces' : 'packs' };
}

export function packQuantity(entry, product = entry) {
  if (Number.isInteger(entry.quantity) && entry.quantity > 0) return Math.min(99, entry.quantity);
  const values = entry.contributions ? Object.values(entry.contributions) : [entry.amount || '1 pack'];
  const pack = measurement(product.size?.en || product.size || '');
  let required = 0;
  let packs = 0;
  for (const value of values) {
    const amount = measurement(value);
    if (amount?.kind === 'packs') packs += amount.value;
    else if (amount && pack && amount.kind === pack.kind) required += amount.value;
    else if (amount?.kind === 'pieces' && !pack) packs += amount.value;
  }
  return Math.min(99, Math.max(1, Math.ceil(packs + (pack ? required / pack.value : 0))));
}

export function basketSummary(entries, productMap = new Map()) {
  let cents = 0, quantity = 0, unpriced = 0, unavailable = 0;
  for (const entry of entries) {
    const product = productMap.get(entry.id) || entry;
    const count = packQuantity(entry, product);
    quantity += count;
    if (product.available === false) { unavailable++; continue; }
    if (!Number.isFinite(product.price)) unpriced++;
    else cents += Math.round(product.price * 100) * count;
  }
  return { count: entries.length, quantity, total: cents / 100, unpriced, unavailable };
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
