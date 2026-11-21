import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import worker from '../dist/server/index.js';

const inventory = JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz', import.meta.url))));
const get = async query => (await worker.fetch(new Request('https://demo.test/api/catalog?' + query))).json();
const chat = async (message, options = {}, env = {}) => (await worker.fetch(new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, ...options }),
}), env)).json();

test('every imported product can be retrieved with its original facts, including sold-out products', async () => {
  const received = [];
  for (let offset = 0; offset < inventory.products.length; offset += 100) {
    const page = await get('limit=100&offset=' + offset);
    assert.equal(page.catalogTotal, 7666);
    assert.equal(page.total, 7666);
    assert.equal(page.inventoryMode, 'approved');
    assert.equal(page.snapshotDate, '2026-11-19');
    received.push(...page.products);
  }
  assert.equal(received.length, 7666);
  assert.equal(new Set(received.map(p => p.id)).size, 7666);
  const byId = new Map(received.map(p => [p.id, p]));
  for (const original of inventory.products) {
    const { imageUrl, ...facts } = byId.get(original.id);
    assert.deepEqual(facts, original);
    assert.ok(imageUrl?.startsWith('https://minimapi.weevi.com/'));
  }
  assert.equal(received.filter(p => p.available === true).length, 5075);
  assert.equal(received.filter(p => p.available === false).length, 2591);
  assert.ok(received.every(p => p.sourceKind === 'catalog' && p.nutrition === null && p.allergens === ''));
});

test('product ID and SKU lookups cover each department and retained descriptions', async () => {
  const selected = [...new Map(inventory.products.map(p => [p.category, p])).values(),
    ...inventory.products.filter(p => p.description.en), inventory.products[0], inventory.products.at(-1)];
  for (const product of selected) {
    const byId = await get('q=' + encodeURIComponent(product.id));
    assert.equal(byId.products[0].id, product.id);
    const bySku = await get('q=' + encodeURIComponent(product.sku));
    assert.ok(bySku.products.some(p => p.id === product.id), 'SKU missing: ' + product.sku);
  }
});

test('ingredient searches support recipe terms and Arabic, French and Arabizi', async () => {
  for (const term of ['chicken', 'pasta', 'cream', 'parmesan', 'garlic', 'butter', 'olive oil', 'دجاج', 'معكرونة', 'لبنة', 'poulet', 'fromage', 'djej', '7alib']) {
    const found = await get('q=' + encodeURIComponent(term));
    assert.ok(found.total > 0, 'No results for ' + term);
  }
  assert.equal((await get('q=definitely-no-such-product-zzzz')).total, 0);
  const freshTomatoes = await get('q=tomatoes&category=produce');
  assert.ok(freshTomatoes.products.length);
  assert.ok(freshTomatoes.products.every(p => p.category === 'produce' || p.additionalCategories.includes('produce')));
});

test('recipe cards and price follow-ups use real catalog records', async () => {
  const recipe = await chat('Give me tabbouleh for 4');
  assert.equal(recipe.card.kind, 'recipe');
  const ids = new Set(inventory.products.map(p => p.id));
  assert.ok(recipe.card.items.some(p => p.id));
  assert.ok(recipe.card.items.every(p => p.id === null || ids.has(p.id)));
  const item = inventory.products.find(p => p.available === true && p.price > 0);
  const reply = await chat('How much is it?', { history: [{ role: 'assistant', content: JSON.stringify({ kind: 'products', items: [[item.id]] }) }] });
  assert.equal(reply.priceOnly, true);
  assert.equal(reply.text, '$' + item.price.toFixed(2));
  assert.equal(reply.products[0].id, item.id);
  assert.equal((await chat('Write me Python code')).card, undefined);
});

test('AI recipe tool searches the full inventory and rejects fabricated product IDs', async () => {
  const previousFetch = globalThis.fetch;
  let call = 0;
  let chosen;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    call++;
    if (call === 1) return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ allowed: true, language: 'en', priceOnly: false }) }] }] });
    if (call === 2) {
      assert.ok(body.instructions.includes('complete imported Excel inventory'));
      assert.ok(JSON.stringify(body).length < 20000, 'The entire catalog must not be sent to the AI');
      return Response.json({ output: [{ type: 'function_call', name: 'search_inventory', call_id: 'ingredients', arguments: JSON.stringify({ queries: ['chicken', 'pasta', 'cream', 'parmesan', 'butter', 'garlic'] }) }] });
    }
    const results = JSON.parse(body.input.find(p => p.type === 'function_call_output').output);
    assert.equal(results.length, 6);
    assert.ok(results.every(group => group.results.every(product => !Object.hasOwn(product, 'imageUrl'))), 'Presentation images must not inflate model input');
    chosen = results.map(({ query, results }) => {
      const product = results.find(p => p.available === true) || results[0];
      assert.ok(product, 'No catalog match for ' + query);
      assert.equal(product.sourceKind, 'catalog');
      return { id: product.id, name: query, amount: '100 g', grams: 100 };
    });
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({
      inScope: true, recipe: { title: 'Chicken Alfredo', servings: 3, minutes: 25, steps: ['Cook the pasta and chicken, then combine with the sauce.'], revisesRecipe: null },
      items: [...chosen, { id: 'invented-id', name: 'Optional ingredient', amount: null, grams: null }], showNutrition: false, answer: '',
    }) }] }] });
  };
  try {
    const reply = await chat('Chicken Alfredo recipe please', {}, { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' });
    assert.equal(reply.mode, 'ai');
    assert.equal(reply.card.title, 'Chicken Alfredo');
    assert.deepEqual(reply.card.items.slice(0, 6).map(p => p.id), chosen.map(p => p.id));
    assert.equal(reply.card.items.at(-1).id, null);
    assert.equal(reply.products.length, 6);
  } finally { globalThis.fetch = previousFetch; }
});

test('streaming endpoint still returns catalog-backed responses', async () => {
  const response = await worker.fetch(new Request('https://demo.test/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
    body: JSON.stringify({ message: 'Give me tabbouleh for 4' }),
  }));
  assert.ok(response.headers.get('content-type').startsWith('application/x-ndjson'));
  const frames = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(frames.at(-1).type, 'result');
  assert.ok(frames.at(-1).reply.products.every(p => p.sourceKind === 'catalog'));
});
