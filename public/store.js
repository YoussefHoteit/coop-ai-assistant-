const byId = id => document.getElementById(id);
const listKey = 'makhazen-list-v1';
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
  { id: 'pantry', name: 'Grocery Food', icon: '🛒', color: '#f7eee2' },
  { id: 'frozen', name: 'Frozen Food', icon: '❄️', color: '#edf5fa' },
  { id: 'snacks', name: 'Snack & Sweet', icon: '🍫', color: '#f9eef2' },
  { id: 'beverages', name: 'Beverages', icon: '🧃', color: '#edf4e7' },
];

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function categoryTile(category) {
  const tile = node('div', 'category');
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
  tile.append(art, node('span', 'category-name', category.name));
  return tile;
}

function list() {
  try {
    const data = JSON.parse(localStorage.getItem(listKey) ?? '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function refreshBasket() { byId('basket-count').textContent = String(list().length); }

byId('category-grid').append(...categories.map(categoryTile));
byId('close-store-dialog').addEventListener('click', () => byId('store-dialog').close());
byId('store-basket').addEventListener('click', () => {
  const entries = list();
  const items = node('ul');
  for (const item of entries) items.append(node('li', '', (item.name?.en || item.id) + (item.amount ? ' · ' + item.amount : '')));
  byId('store-dialog-content').replaceChildren(entries.length ? items : node('p', '', 'Ask the shopping assistant for a product or recipe to start your list.'));
  byId('store-dialog').showModal();
});
window.addEventListener('storage', event => { if (event.key === listKey) refreshBasket(); });
window.addEventListener('makhazen:list', refreshBasket);
refreshBasket();
fetch('/api/catalog?ids=', { signal: AbortSignal.timeout(8000) }).then(async response => {
  if (!response.ok) return;
  const { branch } = await response.json();
  if (branch) byId('branch-name').textContent = branch;
}).catch(() => { /* Use the demo branch when the catalog is unavailable. */ });
