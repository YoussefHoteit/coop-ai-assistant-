const byId = id => document.getElementById(id);
const listKey = 'makhazen-list-v1';
let selectedBranch = 'Beirut';
const categories = [
  { id: 'ready', name: 'EAT IT', icon: '🥗', color: '#f0f6e9',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=78' },
  { id: 'offers', name: 'Offers & Promotions' },
  { id: 'meat', name: 'Meat & Poultry', icon: '🍗', color: '#faefec',
    image: 'https://assets.apricus-mu.com/poultry-meat.jpg' },
  { id: 'fish', name: 'Fresh Fish', icon: '🐟', color: '#edf5f6',
    image: 'https://www.croq-kilos.com/sites/default/files/styles/1920px/public/2025-03/24474-3883-quels-sont-le-poissons-de-saison-mois-par-mois.jpg' },
  { id: 'school', name: 'Back To School', icon: '🎒', color: '#f2ebf7' },
  { id: 'produce', name: 'Produce', icon: '🥦', color: '#edf1dc', image: '/groceries.jpg' },
  { id: 'dairy', name: 'Dairy & Eggs', icon: '🧀', color: '#fcf4df',
    image: 'https://niafreshmarket.com/cdn/shop/collections/iStock-1084225624_5b6b8250-b42b-4bb6-85e1-768c98192c8a.jpg?v=1742248762' },
  { id: 'bakery', name: 'Bakery', icon: '🥖', color: '#f8eddf',
    image: 'https://bazaarandbite.com.au/cdn/shop/collections/assortment-baked-bread-scaled.webp?width=650' },
];

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function action(text, handler, className = 'outline') {
  const button = node('button', className, text);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function storeLink() {
  const link = node('a', '', 'Browse the live store ↗');
  link.href = 'https://almakhazen.me/';
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}

function categoryTile(category) {
  const button = action('', () => showProducts({ category: category.id, title: category.name }), 'category');
  const art = node('div', category.id === 'offers' ? 'category-art offer' : 'category-art');
  art.setAttribute('aria-hidden', 'true');
  if (category.color) art.style.setProperty('--surface', category.color);
  if (category.id === 'offers') {
    const poster = node('b', '', 'MEGA');
    poster.prepend(node('small', '', 'LIMITED TIME OFFER'));
    poster.append(node('small', '', 'DISCOUNTS'));
    art.append(poster);
  } else {
    art.append(node('span', 'art-symbol', category.icon));
    if (category.image) {
      const image = node('img');
      image.alt = '';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.remove(), { once: true });
      image.src = category.image;
      art.append(image);
    }
  }
  button.append(art, node('span', 'category-name', category.name));
  return button;
}

function catalogRequest(options = {}) {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.category) params.set('category', options.category);
  params.set('limit', '24');
  return fetch('/api/catalog?' + params, { signal: AbortSignal.timeout(8000) }).then(response => {
    if (!response.ok) throw new Error('Catalog unavailable');
    return response.json();
  });
}

function productTile(product) {
  const title = product.name.en || product.name.ar;
  const tile = node('article', 'product');
  tile.append(node('h3', '', title));
  const metadata = [product.size.en, product.sourceKind === 'public' ? 'Public listing' : product.sourceKind === 'import' ? 'Catalog data' : 'Illustrative product'].filter(Boolean);
  tile.append(node('p', '', metadata.join(' · ')));
  if (product.description?.en) tile.append(node('p', '', product.description.en));
  tile.append(action('Ask about this item', () => window.dispatchEvent(new CustomEvent('makhazen:open', {
    detail: { prompt: 'Tell me about ' + title },
  }))));
  return tile;
}

let resultRequest = 0;
async function showProducts(filters) {
  const request = ++resultRequest;
  byId('departments').hidden = true;
  byId('store-results').hidden = false;
  byId('results-heading').textContent = filters.title;
  byId('results-note').textContent = 'Looking up products…';
  byId('store-products').replaceChildren();
  try {
    const { products, total } = await catalogRequest(filters);
    if (request !== resultRequest) return;
    if (!products.length) {
      byId('results-note').textContent = 'There are no matching items in this preview catalog.';
      byId('store-products').append(storeLink());
    } else {
      byId('results-note').textContent = total > products.length
        ? 'Showing ' + products.length + ' of ' + total + ' matches. Use search to narrow the results.'
        : total + (total === 1 ? ' product' : ' products');
      byId('store-products').append(...products.map(productTile));
    }
  } catch {
    if (request !== resultRequest) return;
    byId('results-note').textContent = 'The catalog could not load. Try searching again.';
  }
  if (request === resultRequest) byId('store-results').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function showDepartments() {
  resultRequest++;
  byId('departments').hidden = false;
  byId('store-results').hidden = true;
  byId('departments').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function list() {
  try {
    const data = JSON.parse(localStorage.getItem(listKey) ?? '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function refreshBasket() { byId('basket-count').textContent = String(list().length); }

function showDialog(title, ...children) {
  byId('store-dialog-title').textContent = title;
  byId('store-dialog-content').replaceChildren(...children);
  byId('store-dialog').showModal();
}

byId('category-grid').append(...categories.map(categoryTile));
byId('store-search').addEventListener('submit', event => {
  event.preventDefault();
  const query = byId('store-query').value.trim();
  if (query) showProducts({ query, title: 'Search results for “' + query + '”' });
});
byId('store-menu').addEventListener('click', showDepartments);
byId('clear-results').addEventListener('click', showDepartments);
byId('close-store-dialog').addEventListener('click', () => byId('store-dialog').close());
byId('location').addEventListener('click', () => showDialog('Ordering from ' + selectedBranch,
  node('p', '', 'Check the live store for branch delivery and pickup.'), storeLink()));
byId('store-basket').addEventListener('click', () => {
  const entries = list();
  const items = node('ul');
  for (const item of entries) items.append(node('li', '', (item.name?.en || item.id) + (item.amount ? ' · ' + item.amount : '')));
  showDialog('Your shopping list', entries.length ? items : node('p', '', 'Ask the shopping assistant for a product or recipe to start your list.'));
});
document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
  const category = categories.find(entry => entry.id === button.dataset.select);
  showProducts({ title: category.name, category: category.id });
}));
window.addEventListener('storage', event => { if (event.key === listKey) refreshBasket(); });
window.addEventListener('makhazen:list', refreshBasket);
refreshBasket();
catalogRequest().then(data => {
  selectedBranch = data.branch || 'Beirut';
  byId('location').querySelector('strong').textContent = selectedBranch;
}).catch(() => { /* The current label remains available during a catalog outage. */ });
