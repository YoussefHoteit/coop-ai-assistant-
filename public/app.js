import { detectReplyLanguage, arabiziChatCopy } from './language.js';

const copy = {
  en: {
    newChat: 'New chat', assistant: 'Assistant', products: 'Browse products', recipes: 'Recipe ideas',
    list: 'Shopping list', widget: 'Widget preview', website: 'Store website', pageTitle: 'Shopping Assistant',
    heroTitle: 'What’s on your\nshopping list?', heroIntro: 'Find groceries, get recipe ideas, and collect what you need in one list.',
    chatTitle: 'Ask COOP', chatSubtitle: 'Products, recipes and nutrition', inputLabel: 'Your message',
    input: 'Ask about a product or recipe…', send: 'Send message', sample: 'Preview catalog · public listings and illustrative items',
    screenshot: 'COOP screenshot catalog · prices and stock as shown', approved: 'Inventory snapshot · confirm current availability with COOP',
    welcome: 'Hi! I can help you find groceries, check product details, or plan a recipe and its shopping list.',
    demo: 'Demo mode', ai: 'AI mode', empty: 'Your list is empty', emptyInfo: 'Add products or recipe ingredients as you chat.',
    copy: 'Copy list', item: 'item', items: 'items', add: 'Add to list', added: 'Added to your shopping list.',
    already: 'Already on your shopping list.', onList: 'On your shopping list', all: 'Add ingredients to list', allProducts: 'Add all to list',
    available: 'Sample in stock', unavailable: 'Sample out of stock', inStock: 'In stock in snapshot', outOfStock: 'Out of stock in snapshot', unknown: 'Stock unconfirmed',
    promotion: 'Promotion',
    results: 'Catalog products', steps: 'How to make it',
    noIngredient: 'Availability unconfirmed', energy: 'Estimated calories per serving', genericEnergy: 'Estimate',
    labelMissing: 'Nutrition label unavailable in this catalog',
    details: 'Product details', ingredients: 'Ingredients', allergens: 'Allergens',
    minutes: 'min', serves: 'servings', typing: 'Looking that up…', retry: 'I couldn’t load a reply. Please try again.',
    fallback: 'The AI service is unavailable. This answer uses the catalog.', search: 'Search products…',
    noMatches: 'No products match your search.', copied: 'Shopping list copied.', close: 'Close', remove: 'Remove',
    explore: 'Browse the products or ask me for a recipe.', loading: 'Loading the catalog…',
    prompts: [
      ['chef', 'Tabbouleh for 4', 'Give me a tabbouleh recipe for 4 people.'],
      ['search', 'Find labneh', 'Do you have labneh?'],
      ['leaf', 'Hummus calories', 'How many calories per serving in hummus?'],
    ],
  },
  ar: {
    newChat: 'محادثة جديدة', assistant: 'المساعد', products: 'تصفّح الأصناف', recipes: 'أفكار وصفات',
    list: 'لائحة التسوّق', widget: 'جرّب زر المحادثة', website: 'موقع المخازن', pageTitle: 'مساعد التسوّق',
    heroTitle: 'شو عَ لائحة\nالتسوّق اليوم؟', heroIntro: 'لاقِ الأغراض، خد أفكار للطبخ، وجمّع كل شي بدّك ياه بلائحة وحدة.',
    chatTitle: 'اسأل المخازن', chatSubtitle: 'أصناف، وصفات ومعلومات غذائية', inputLabel: 'رسالتك',
    input: 'اسأل عن صنف أو وصفة…', send: 'ابعث الرسالة', sample: 'كتالوغ تجريبي فيه أصناف منشورة وأمثلة للعرض',
    screenshot: 'كتالوغ المخازن بحسب الصور. الأسعار والتوفّر بحسب ما ظهر بالصور.', approved: 'بيانات المخزون وقت التصدير. تأكّد من التوفّر مع المخازن.',
    welcome: 'أهلا! فيني ساعدك تدوّر عَ صنف، تشوف تفاصيله، أو تحضّر وصفة مع لائحة الأغراض.',
    demo: 'نسخة تجريبية', ai: 'ذكاء اصطناعي', empty: 'اللائحة فاضية', emptyInfo: 'ضيف أصناف أو مكوّنات وصفة من المحادثة.',
    copy: 'انسخ اللائحة', item: 'صنف', items: 'أصناف', add: 'ضيف عَ اللائحة', added: 'انضاف عَ لائحة التسوّق.',
    already: 'موجود عَ لائحة التسوّق.', onList: 'موجود عَ اللائحة', all: 'ضيف المكوّنات عَ اللائحة', allProducts: 'ضيف الكل عَ اللائحة',
    available: 'متوفّر بالتجربة', unavailable: 'مش متوفّر بالتجربة', inStock: 'متوفّر وقت التصدير', outOfStock: 'مش متوفّر وقت التصدير', unknown: 'التوفّر مش مؤكّد',
    promotion: 'عرض',
    results: 'أصناف من الكتالوغ', steps: 'كيف تحضّرها',
    noIngredient: 'التوفّر مش مؤكّد', energy: 'سعرات تقديرية لكل حصّة', genericEnergy: 'تقدير',
    labelMissing: 'الملصق الغذائي مش موجود بالكتالوغ',
    details: 'تفاصيل الصنف', ingredients: 'المكوّنات', allergens: 'مسبّبات الحساسية',
    minutes: 'دق', serves: 'حصص', typing: 'عم دوّرلك…', retry: 'ما قدرت جيب الجواب. جرّب مرّة تانية.',
    fallback: 'خدمة الذكاء الاصطناعي مش عم تردّ. هيدا الجواب من الكتالوغ.', search: 'دوّر عَ صنف…',
    noMatches: 'ما لقيت أصناف بهالاسم.', copied: 'تمّ نسخ لائحة التسوّق.', close: 'سكّر', remove: 'شيل',
    explore: 'تصفّح الأصناف أو اسألني عن وصفة.', loading: 'عم حمّل الكتالوغ…',
    prompts: [
      ['chef', 'تبولة لـ٤ أشخاص', 'عطيني وصفة تبولة لـ٤ أشخاص'],
      ['search', 'دوّر عَ اللبنة', 'عندكن لبنة؟'],
      ['leaf', 'سعرات الحمص', 'قديش في سعرات بالحمص لكل حصّة؟'],
    ],
  },
};

copy.arz = { ...copy.en, ...arabiziChatCopy };

const byId = id => document.getElementById(id);
const storage = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The list still works for this tab. */ }
  },
};

const params = new URLSearchParams(window.location.search);
const savedLanguage = params.get('lang') || storage.read('makhazen-language', 'en');
const savedList = storage.read('makhazen-list-v1', []);
let lang = savedLanguage === 'ar' ? 'ar' : 'en';
const widgetMode = params.get('widget') === '1';
const parentOrigin = params.get('parent') || window.location.origin;
if (widgetMode) document.body.classList.add('widget-mode');

const list = new Map(Array.isArray(savedList) ? savedList.filter(item => item && typeof item.id === 'string' &&
  typeof item.amount === 'string').slice(0, 60).map(item => [item.id, item]) : []);
const chatKey = 'makhazen-chat-v1-' + (widgetMode ? 'widget' : 'standalone');
let savedChat;
try { savedChat = JSON.parse(sessionStorage.getItem(chatKey)); } catch { /* Chat still works without storage. */ }
const chat = Array.isArray(savedChat?.messages) ? savedChat.messages : [];
let catalog;
let catalogRequest;
const products = new Map(chat.flatMap(message => (message.products ?? []).map(product => [product.id, product])));
let recipes = new Map();
let context = savedChat?.context ?? null;
let activeRequest;
let replyPreview;
let toastTimeout;
let dialogKind;

const getText = (key, language = lang) => (copy[language] || copy.en)[key];
const inventoryNote = () => getText(['approved', 'screenshot'].includes(catalog?.inventoryMode) ? catalog.inventoryMode : 'sample');
const localizedNumber = (number, language = lang) => new Intl.NumberFormat(language === 'ar' ? 'ar-LB' : 'en-US').format(number);
const price = (amount, language = lang) => new Intl.NumberFormat(language === 'ar' ? 'ar-LB' : 'en-US', { style: 'currency', currency: 'USD' }).format(amount);

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === 'string') node.textContent = text;
  return node;
}

function icon(name) {
  const markup = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  markup.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '#i-' + name);
  markup.append(use);
  return markup;
}

function button(className, label, glyph, onClick, iconOnly = false) {
  const node = element('button', className);
  node.type = 'button';
  if (glyph) node.append(icon(glyph));
  if (iconOnly) {
    node.setAttribute('aria-label', label);
    node.title = label;
  } else {
    node.append(element('span', '', label));
  }
  node.addEventListener('click', onClick);
  return node;
}

function setLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-text]').forEach(node => {
    const key = node.dataset.text;
    node.textContent = getText(key === 'sample' && catalog?.inventoryMode === 'approved' ? 'approved' : key);
  });
  byId('language').querySelector('span').textContent = lang === 'en' ? 'العربية' : 'English';
  byId('language').setAttribute('aria-label', lang === 'en' ? 'Switch to Arabic' : 'Switch to English');
  byId('question').placeholder = getText('input');
  byId('reset').setAttribute('aria-label', getText('newChat'));
  byId('reset').title = getText('newChat');
  byId('close-dialog').setAttribute('aria-label', getText('close'));
  byId('widget-close').setAttribute('aria-label', getText('close'));
  byId('list-toggle').setAttribute('aria-label', getText('list'));
  document.querySelector('.send').setAttribute('aria-label', getText('send'));
  byId('mode-label').textContent = getText(catalog?.mode === 'ai' ? 'ai' : 'demo');
  document.querySelector('.chat-note').textContent = inventoryNote();
  renderPrompts();
  renderChat();
  renderList();
}

function loadCatalog() {
  if (catalog) return Promise.resolve(catalog);
  if (catalogRequest) return catalogRequest;
  const params = new URLSearchParams({ ids: [...list.keys()].join(','), limit: '100' });
  catalogRequest = fetch('/api/catalog?' + params, { signal: AbortSignal.timeout(8000) })
    .then(response => {
      if (!response.ok) throw new Error('Catalog unavailable');
      return response.json();
    }).then(data => {
      catalog = data;
      for (const product of data.products) products.set(product.id, product);
      recipes = new Map(data.recipes.map(recipe => [recipe.id, recipe]));
      byId('mode-label').textContent = getText(data.mode === 'ai' ? 'ai' : 'demo');
      document.querySelector('.chat-note').textContent = inventoryNote();
      renderList();
      return data;
    }).finally(() => { catalogRequest = null; });
  return catalogRequest;
}

function renderPrompts() {
  const prompts = getText('prompts').map(([glyph, label, message]) =>
    button('prompt', label, glyph, () => sendMessage(message)));
  byId('prompts').replaceChildren(...prompts);
}

function productDetails(product, language = lang, amount = '') {
  const sample = product.sourceKind === 'sample';
  const status = product.available === null ? 'unknown' : product.available === true ? (sample ? 'available' : 'inStock')
    : product.available === false ? (sample ? 'unavailable' : 'outOfStock') : 'unknown';
  const size = product.size[language] || product.size.en;
  const sameSize = amount && size && quantityKey(amount) === quantityKey(size);
  return [amount, sameSize ? '' : formatPackSize(size, language), Number.isFinite(product.price) ? price(product.price, language) : '', getText(status, language),
    product.promotion ? getText('promotion', language) : ''].filter(Boolean).join(' · ');
}

function formatPackSize(size, language) {
  if (!size || language !== 'ar') return size;
  const units = { pieces: 'قطعة', piece: 'قطعة', pcs: 'قطعة', packs: 'عبوة', pack: 'عبوة',
    g: 'غ', gr: 'غ', kg: 'كغ', ml: 'مل', cl: 'سل', l: 'ل', lb: 'رطل', oz: 'أونصة' };
  return size.replace(/(\d+(?:\.\d+)?)\s*(pieces?|pcs|packs?|kg|gr?|ml|cl|l|lb|oz)\b/gi,
    (_, number, unit) => localizedNumber(Number(number), language) + ' ' + units[unit.toLowerCase()]).replace(/,\s+/g, '، ');
}

function nutritionInfo(product, item, language) {
  if (!item.details) return null;
  const details = element('div', 'nutrition-detail');
  const label = product.nutrition;
  const energy = item.energy;
  const number = value => localizedNumber(value, language);
  const grams = language === 'ar' ? ' غ' : ' g';
  const calories = language === 'ar' ? ' سعرة' : ' kcal';
  if (energy) details.append(element('small', '', number(energy.kcal) + calories + ' / ' + number(energy.grams) + grams +
    (energy.sourceKind === 'generic-estimate' ? ' · ' + getText('genericEnergy', language) : '')));
  if (label?.basisGrams) {
    const facts = [['protein', 'Protein', 'بروتين'], ['carbs', 'Carbs', 'نشويات'], ['fat', 'Fat', 'دهون']]
      .filter(([key]) => Number.isFinite(label[key])).map(([key, en, ar]) => (language === 'ar' ? ar : en) + ' ' + number(label[key]) + grams);
    if (facts.length) details.append(element('small', '', facts.join(' · ') + ' / ' + number(label.basisGrams) + grams));
  }
  if (product.ingredients) details.append(element('small', '', getText('ingredients', language) + ' · ' + product.ingredients));
  if (product.allergens) details.append(element('small', '', getText('allergens', language) + ' · ' + product.allergens));
  if (!energy && !label && !product.ingredients && !product.allergens) details.append(element('small', '', getText('labelMissing', language)));
  return details;
}

function renderCard(card, language) {
  const recipe = card.kind === 'recipe';
  const t = key => getText(key, language);
  const number = value => localizedNumber(value, language);
  const cardNode = element('section', 'result-card');
  cardNode.lang = language === 'arz' ? 'ar-Latn-LB' : language;
  cardNode.dir = language === 'ar' ? 'rtl' : 'ltr';
  const intro = element('div', 'card-intro');
  intro.append(element('h3', '', recipe ? card.title : t('results')));
  if (recipe) intro.append(element('small', '', [card.minutes ? number(card.minutes) + ' ' + t('minutes') : '',
    number(card.servings) + ' ' + t('serves')].filter(Boolean).join(' · ')));
  if (card.nutrition) {
    const nutrition = element('div', 'recipe-energy');
    nutrition.append(element('strong', '', number(card.nutrition.kcalPerServing) + (language === 'ar' ? ' سعرة' : ' kcal')),
      element('small', '', t('energy')));
    intro.append(nutrition);
  }
  cardNode.append(intro);

  const addable = [];
  for (const item of card.items) {
    const product = products.get(item.id);
    const row = element('div', 'product-row');
    const details = element('div');
    if (!product) {
      if (!recipe || !item.name) continue;
      details.append(element('strong', '', item.name), element('small', '', [item.amount, t('noIngredient')].filter(Boolean).join(' · ')));
      row.append(details);
      cardNode.append(row);
      continue;
    }
    const name = language === 'arz' && recipe && item.name ? item.name : product.name[language] || product.name.en;
    details.append(element('strong', '', name));
    details.append(element('small', '', productDetails(product, language, item.amount)));
    if (product.description?.[language] && (!recipe || product.sourceKind === 'screenshot')) {
      details.append(element('small', '', product.description[language]));
    }
    const nutrition = nutritionInfo(product, item, language);
    if (nutrition) details.append(nutrition);
    const alreadyAdded = list.get(item.id)?.contributions?.[card.listKey] === (item.amount || '1 pack');
    const add = button('add-button', t(alreadyAdded ? 'onList' : 'add') + ' ' + name, alreadyAdded ? 'check' : 'plus',
      () => addToList(card.listKey, [item], language), true);
    add.disabled = product.available === false;
    row.append(details, add);
    cardNode.append(row);
    if (product.available !== false) addable.push(item);
  }

  if (recipe && card.steps?.length) {
    const details = element('details', 'steps');
    const instructions = element('ol');
    instructions.append(...card.steps.map(step => element('li', '', step)));
    details.append(element('summary', '', t('steps')), instructions);
    cardNode.append(details);
  }

  if (addable.length > 1 || (recipe && addable.length === 1)) {
    const footer = element('div', 'card-footer');
    footer.append(button('primary', t(recipe ? 'all' : 'allProducts'), 'plus',
      () => addToList(card.listKey, addable, language, recipe)));
    if (recipe) intro.after(footer);
    else cardNode.append(footer);
  }
  return cardNode;
}

function messageNode(message) {
  const language = message.language ?? lang;
  const t = key => getText(key, language);
  const row = element('article', 'message ' + (message.role === 'user' ? 'user' : 'assistant') + (message.typing ? ' typing' : ''));
  if (message.role !== 'user') {
    const avatar = element('span', 'avatar');
    avatar.append(icon('spark'));
    row.append(avatar);
  }
  const content = element('div', 'message-content');
  if (message.content) {
    const bubble = element('p', 'bubble', message.content);
    bubble.dir = 'auto';
    bubble.lang = language === 'arz' ? 'ar-Latn-LB' : language;
    content.append(bubble);
  }

  if (message.link) {
    const link = element('a', 'prompt', t('website'));
    link.href = message.link;
    link.target = '_blank';
    link.rel = 'noopener';
    link.append(icon('external'));
    link.style.marginTop = '7px';
    content.append(link);
  }
  if (message.card && !message.priceOnly) content.append(renderCard(message.card, language));
  if (message.suggestedRecipes?.length) {
    const row = element('div', 'recipe-suggestions');
    for (const id of message.suggestedRecipes) {
      const recipe = recipes.get(id);
      if (recipe) row.append(button('prompt', recipe.name[language], 'chef', () => sendMessage(recipe.name[language])));
    }
    content.append(row);
  }
  if (message.mode === 'fallback') content.append(element('p', 'response-note', t('fallback')));
  row.append(content);
  return row;
}

function renderChat(scroll = 'preserve') {
  const region = byId('messages');
  const oldPosition = region.scrollTop;
  const initial = { role: 'assistant', content: getText('welcome') };
  const nodes = [initial, ...chat].map(messageNode);
  if (activeRequest) {
    const language = chat.at(-1)?.language ?? lang;
    const pending = messageNode(replyPreview ?? { role: 'assistant', content: getText('typing', language), language, typing: true });
    pending.setAttribute('aria-hidden', 'true');
    nodes.push(pending);
  }
  region.replaceChildren(...nodes);
  if (scroll === 'latest' && chat.length) {
    region.scrollTop = nodes.at(-1).offsetTop - nodes[0].offsetTop;
  } else {
    region.scrollTop = oldPosition;
  }
  document.querySelector('.send').disabled = Boolean(activeRequest);
}

function showReplyPreview(text, language) {
  replyPreview = { role: 'assistant', content: text || getText('typing', language), language, typing: !text };
  const region = byId('messages');
  const follow = region.scrollHeight - region.scrollTop - region.clientHeight < 48;
  const row = region.lastElementChild;
  const bubble = row.querySelector('.bubble');
  row.classList.toggle('typing', replyPreview.typing);
  bubble.lang = language === 'arz' ? 'ar-Latn-LB' : language;
  bubble.textContent = replyPreview.content;
  if (follow) region.scrollTop = region.scrollHeight;
}

function replyWriter(signal) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let target = '';
  let visible = '';
  let language;
  let timer;
  let completion = Promise.resolve();
  let resolveCompletion;

  function settle() {
    clearTimeout(timer);
    timer = undefined;
    resolveCompletion?.();
    resolveCompletion = undefined;
  }

  function draw() {
    if (!target.startsWith(visible)) visible = '';
    const left = Array.from(target.slice(visible.length));
    const count = reducedMotion || document.hidden ? left.length : Math.max(1, Math.ceil(left.length / 16));
    visible += left.slice(0, count).join('');
    showReplyPreview(visible, language);
    if (visible === target) settle();
    else timer = setTimeout(draw, 20);
  }

  signal.addEventListener('abort', settle, { once: true });
  return (text, nextLanguage) => {
    if (signal.aborted) return completion;
    target = text;
    language = nextLanguage;
    if (timer === undefined) {
      completion = new Promise(resolve => { resolveCompletion = resolve; });
      draw();
    }
    return completion;
  };
}

async function readChatReply(response, onText) {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) return response.json();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error('Chat stream ended before the reply was complete.');
      const lines = (buffer + value).split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'result') return event.reply;
        if (event.type === 'error') throw new Error('Chat stream failed.');
        if (event.type === 'text') onText(event.delta, event.language);
      }
    }
  } finally {
    reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function saveChat() {
  try { sessionStorage.setItem(chatKey, JSON.stringify({ messages: chat, context })); } catch { /* The chat still works in memory. */ }
}

function conversationHistory() {
  const encoder = new TextEncoder();
  const history = [];
  let bytes = 0;
  for (const { role, content, card, error } of chat.slice(-100).reverse()) {
    if (error || (!content && !card)) continue;
    const summary = card && {
      kind: card.kind,
      ...(card.kind === 'recipe' && { recipeKey: card.listKey, title: card.title, servings: card.servings }),
      items: card.items.map(item => {
        const product = products.get(item.id);
        return [item.id, product?.name.en || item.name, item.amount, product?.size.en, product?.price, product?.available];
      }),
    };
    const entry = { role, content: [summary && JSON.stringify(summary), content, ...(card?.steps ?? [])]
      .filter(Boolean).join('\n').slice(0, 3000) };
    bytes += encoder.encode(JSON.stringify(entry)).byteLength + 1;
    if (bytes > 27000) break;
    history.unshift(entry);
  }
  return history;
}

async function sendMessage(raw) {
  const content = raw.trim().slice(0, 600);
  if (!content || activeRequest) return;
  const controller = new AbortController();
  activeRequest = controller;
  const history = conversationHistory();
  const recentLanguage = chat.findLast(message => message.language)?.language ?? lang;
  const language = detectReplyLanguage(content, recentLanguage);
  chat.push({ role: 'user', content, language });
  saveChat();
  byId('question').value = '';
  renderChat('latest');

  try {
    const writeReply = replyWriter(controller.signal);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(48500)]);
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify({ message: content, history, lang: recentLanguage, context }),
      signal,
    });
    if (!response.ok) throw new Error('Chat unavailable');
    let partial = '';
    const reply = await readChatReply(response, (delta, replyLanguage) => {
      partial = delta ? partial + delta : '';
      writeReply(partial, replyLanguage);
    });
    if (activeRequest !== controller) return;
    await Promise.all([writeReply(reply.text || '', reply.language ?? language), loadCatalog().catch(() => {})]);
    if (activeRequest !== controller) return;
    for (const product of reply.products ?? []) products.set(product.id, product);
    if (reply.card) {
      const revision = reply.card.revisesRecipe;
      const previousRecipe = revision && chat.some(message => message.card?.kind === 'recipe' && message.card.listKey === revision);
      reply.card.listKey = previousRecipe ? revision : reply.context?.recipeId ? 'demo-recipe-' + reply.context.recipeId : crypto.randomUUID();
    }
    chat.push({ ...reply, role: 'assistant', content: reply.text });
    context = reply.context ?? context;
  } catch {
    if (activeRequest !== controller) return;
    controller.abort();
    chat.push({ role: 'assistant', content: getText('retry', language), language, error: true });
  } finally {
    if (activeRequest === controller) {
      activeRequest = null;
      replyPreview = null;
      saveChat();
      renderChat('latest');
    }
  }
}

function resetChat() {
  activeRequest?.abort();
  activeRequest = null;
  replyPreview = null;
  chat.length = 0;
  context = null;
  saveChat();
  byId('question').value = '';
  byId('messages').scrollTop = 0;
  renderChat();
  toggleMenu(false);
  focusChat();
}

function renderList() {
  const body = byId('list-body');
  const entries = [...list.values()].filter(({ id }) => products.has(id));
  const count = entries.length;
  byId('list-count').textContent = localizedNumber(count) + ' ' + getText(count === 1 ? 'item' : 'items');
  byId('copy').disabled = count === 0;
  if (!count) {
    const empty = element('div', 'empty-list');
    const graphic = element('span', 'empty-icon');
    graphic.append(icon('basket'));
    empty.append(graphic, element('strong', '', getText('empty')), element('p', '', getText('emptyInfo')));
    body.replaceChildren(empty);
    return;
  }

  const items = element('ul', 'list-items');
  for (const item of entries) {
    const product = products.get(item.id);
    const row = element('li', 'list-item');
    const label = element('label');
    const check = element('input');
    check.type = 'checkbox';
    check.checked = Boolean(item.checked);
    check.addEventListener('change', () => {
      item.checked = check.checked;
      saveList();
    });
    const description = element('span');
    const amount = item.contributions ? totalAmounts(Object.values(item.contributions), lang) : item.amount;
    description.append(element('strong', '', product.name[lang]), element('small', '', amount || product.size[lang]));
    label.append(check, description);
    row.append(label, button('remove-button', getText('remove') + ' ' + product.name[lang], 'close', () => {
      list.delete(item.id);
      saveList();
      renderList();
      renderChat();
      byId('shopping-list').focus({ preventScroll: true });
    }, true));
    items.append(row);
  }
  body.replaceChildren(items);
}

function saveList() {
  storage.write('makhazen-list-v1', [...list.values()]);
  if (widgetMode) window.parent.postMessage({ type: 'makhazen-list-changed' }, parentOrigin);
}

const quantityUnits = [
  [['pack', 'packs', 'packet', 'packets', 'عبوة', 'عبوات', 'باكيت'], ['pack', 'packs'], 'عبوة'],
  [['', 'piece', 'pieces', 'pcs', 'حبة', 'حبات', 'حبّة', 'حبّات', 'عدد', 'قطعة', 'قطع'], ['piece', 'pieces'], 'حبّة'],
  [['g', 'gr', 'gram', 'grams', 'غ', 'غرام', 'غرامات', 'جرام'], ['g', 'g'], 'غ'],
  [['kg', 'kilo', 'kilos', 'kilogram', 'kilograms', 'كغ', 'كيلو', 'كيلوغرام'], ['kg', 'kg'], 'كغ'],
  [['ml', 'mls', 'مل', 'ملليلتر'], ['ml', 'ml'], 'مل'],
  [['l', 'liter', 'litre', 'liters', 'litres', 'ل', 'ليتر', 'لتر'], ['L', 'L'], 'ل'],
  [['bunch', 'bunches', 'ربطة', 'ربطات', 'ضمة', 'ضمّة'], ['bunch', 'bunches'], 'ربطة'],
  [['whole', 'حبة كاملة', 'حبّة كاملة'], ['whole', 'whole'], 'حبّة كاملة'],
  [['head', 'heads', 'راس', 'رأس', 'رؤوس'], ['head', 'heads'], 'راس'],
  [['can', 'cans', 'علبة', 'علب'], ['can', 'cans'], 'علبة'],
  [['clove', 'cloves', 'فص', 'فصوص'], ['clove', 'cloves'], 'فص'],
  [['tbsp', 'tablespoon', 'tablespoons', 'ملعقة كبيرة', 'ملعقة أكل', 'ملاعق كبيرة'], ['tbsp', 'tbsp'], 'ملعقة كبيرة'],
  [['tsp', 'teaspoon', 'teaspoons', 'ملعقة صغيرة', 'ملعقة شاي', 'ملاعق صغيرة'], ['tsp', 'tsp'], 'ملعقة صغيرة'],
  [['cup', 'cups', 'كوب', 'أكواب', 'كاسة'], ['cup', 'cups'], 'كوب'],
];

function parseQuantity(amount) {
  const numeric = amount.toLowerCase().normalize('NFKC').replace(/[\u200E\u200F\u061C]/g, '')
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).replace(/٫/g, '.');
  const match = numeric.match(/^\s*(\d*\.\d+|\d+)(?:\s*[\/⁄]\s*(\d+))?\s*([\p{L}\p{M} ]*)\s*$/u);
  if (!match) return null;
  const count = Number(match[1]) / Number(match[2] ?? 1);
  if (!Number.isFinite(count) || count <= 0) return null;
  const unit = match[3].trim().replace(/\s+/g, ' ');
  const labels = quantityUnits.find(([aliases]) => aliases.includes(unit));
  return { count, key: labels?.[1][0] ?? unit, labels, unit };
}

function quantityKey(amount) {
  return amount.split(/[,،]/).map(part => {
    const quantity = parseQuantity(part);
    return quantity ? quantity.count + ' ' + quantity.key : part.toLowerCase().replace(/\s+/g, '');
  }).join(',');
}

function totalAmounts(values, language) {
  const totals = new Map();
  const unmatched = [];
  for (const value of values) {
    const quantity = parseQuantity(value);
    if (!quantity) {
      unmatched.push(value);
      continue;
    }
    const previous = totals.get(quantity.key);
    if (previous) previous.count += quantity.count;
    else totals.set(quantity.key, quantity);
  }
  return [...totals.values()].map(({ count, labels, unit }) => {
    const displayUnit = labels ? labels[language === 'ar' ? 2 : 1] : unit;
    const label = Array.isArray(displayUnit) ? displayUnit[Number(count !== 1)] : displayUnit;
    return [localizedNumber(count, language), label].filter(Boolean).join(' ');
  }).concat(unmatched).join(' + ');
}

function addToList(key, items, language, replaceRecipe = false) {
  const amounts = new Map();
  for (const item of items) {
    const product = products.get(item.id);
    if (product && product.available !== false) amounts.set(item.id, item.amount || '1 pack');
  }
  const affected = new Set(amounts.keys());
  if (replaceRecipe) {
    for (const entry of list.values()) {
      if (Object.hasOwn(entry.contributions ?? {}, key)) affected.add(entry.id);
    }
  }
  let changed = false;
  for (const id of affected) {
    const previous = list.get(id);
    const contributions = { ...(previous?.contributions ?? (previous ? { legacy: previous.amount || '1 pack' } : {})) };
    const amount = amounts.get(id);
    if (contributions[key] === amount) continue;
    if (amount) contributions[key] = amount;
    else delete contributions[key];
    const values = Object.values(contributions);
    if (values.length) list.set(id, { id, name: products.get(id)?.name ?? previous.name, contributions,
      amount: totalAmounts(values, 'en'), checked: false });
    else list.delete(id);
    changed = true;
  }
  if (changed) {
    saveList();
    renderList();
    renderChat();
  }
  showToast(getText(changed ? 'added' : 'already', language));
}

function showToast(text) {
  const toast = byId('toast');
  toast.textContent = text;
  toast.hidden = false;
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 2400);
}

async function copyList() {
  const content = [...list.values()].filter(item => products.has(item.id)).map(({ id, amount, checked }) => {
    const product = products.get(id);
    return (checked ? '✓ ' : '• ') + product.name[lang] + ' — ' + (amount || product.size[lang]);
  }).join('\n');
  if (!content) return;
  try {
    await navigator.clipboard.writeText(content);
    showToast(getText('copied'));
  } catch {
    const field = element('textarea', 'catalog-search');
    field.value = content;
    field.readOnly = true;
    field.rows = 8;
    const dialog = byId('dialog');
    dialogKind = 'copy';
    byId('dialog-title').textContent = getText('list');
    byId('dialog-content').replaceChildren(field);
    dialog.showModal();
    field.select();
  }
}

async function openBrowse(kind) {
  const dialog = byId('dialog');
  const content = byId('dialog-content');
  dialogKind = kind;
  byId('dialog-title').textContent = getText(kind);
  content.replaceChildren(element('p', '', getText('loading')));
  if (!dialog.open) dialog.showModal();

  try {
    await loadCatalog();
  } catch {
    if (dialog.open && dialogKind === kind) content.replaceChildren(element('p', '', getText('retry')));
    return;
  }

  if (!dialog.open || dialogKind !== kind) return;
  if (kind === 'recipes') {
    const entries = [...recipes.values()].map(recipe => browseOption(recipe.name[lang],
      localizedNumber(recipe.minutes) + ' ' + getText('minutes'), recipe.name[lang]));
    content.replaceChildren(...entries);
    return;
  }

  const search = element('input', 'catalog-search');
  search.type = 'search';
  search.placeholder = getText('search');
  search.setAttribute('aria-label', getText('search'));
  const results = element('div');
  let sequence = 0;
  async function display() {
    const requestedAt = ++sequence;
    const params = new URLSearchParams({ q: search.value.trim(), limit: '50' });
    const response = await fetch('/api/catalog?' + params, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!dialog.open || dialogKind !== kind || requestedAt !== sequence) return;
    if (!response?.ok) {
      results.replaceChildren(element('p', 'response-note', getText('retry')));
      return;
    }
    const { products: entries } = await response.json();
    if (!dialog.open || dialogKind !== kind || requestedAt !== sequence) return;
    results.replaceChildren(...entries.map(product => browseOption(product.name[lang], productDetails(product), product.name[lang])));
    if (!entries.length) results.append(element('p', 'response-note', getText('noMatches')));
  }
  let debounce;
  search.addEventListener('input', () => {
    sequence++;
    clearTimeout(debounce);
    debounce = setTimeout(display, 170);
  });
  content.replaceChildren(element('p', '', inventoryNote()), search, results);
  display();
  search.focus();
}

function browseOption(name, detail, query) {
  const result = button('catalog-item', name, 'arrow', () => {
    byId('dialog').close();
    sendMessage(query);
    byId('chat').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  const arrow = result.firstChild;
  const content = result.lastChild;
  content.append(element('small', '', detail));
  result.append(arrow);
  return result;
}

function toggleMenu(open) {
  byId('sidebar').classList.toggle('open', open);
  byId('menu').setAttribute('aria-expanded', String(open));
  byId('shade').hidden = !open;
}

function focusChat() {
  byId('chat').scrollIntoView({ block: 'nearest' });
  byId('question').focus({ preventScroll: true });
}

document.querySelectorAll('[data-action]').forEach(node => node.addEventListener('click', () => {
  const action = node.dataset.action;
  toggleMenu(false);
  if (action === 'assistant') focusChat();
  if (action === 'products' || action === 'recipes') openBrowse(action);
  if (action === 'list') {
    const list = byId('shopping-list');
    list.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    list.focus({ preventScroll: true });
  }
  if (action === 'widget') window.location.href = '/widget-preview.html?lang=' + lang;
}));
byId('menu').addEventListener('click', () => toggleMenu(!byId('sidebar').classList.contains('open')));
byId('shade').addEventListener('click', () => toggleMenu(false));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (byId('sidebar').classList.contains('open')) {
    toggleMenu(false);
    byId('menu').focus();
  } else if (widgetMode && !byId('dialog').open) {
    window.parent.postMessage({ type: 'makhazen-close-widget' }, '*');
  }
});
byId('language').addEventListener('click', () => {
  lang = lang === 'en' ? 'ar' : 'en';
  storage.write('makhazen-language', lang);
  setLanguage();
});
byId('new-chat').addEventListener('click', resetChat);
byId('reset').addEventListener('click', resetChat);
byId('copy').addEventListener('click', copyList);
byId('close-dialog').addEventListener('click', () => byId('dialog').close());
byId('list-toggle').addEventListener('click', () => {
  const shown = document.body.classList.toggle('show-list');
  byId('list-toggle').setAttribute('aria-expanded', String(shown));
  if (shown) byId('shopping-list').focus({ preventScroll: true });
});
byId('widget-close').addEventListener('click', () => window.parent.postMessage({ type: 'makhazen-close-widget' }, parentOrigin));
byId('composer').addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(byId('question').value);
});
setLanguage();
loadCatalog().catch(() => { /* Chat and browse each retry the request when needed. */ });
if (widgetMode && window.parent !== window) {
  window.addEventListener('message', event => {
    if (event.source === window.parent && event.origin === parentOrigin &&
        event.data?.type === 'makhazen-prompt' && typeof event.data.prompt === 'string') sendMessage(event.data.prompt);
  });
  window.parent.postMessage({ type: 'makhazen-ready' }, parentOrigin);
}
