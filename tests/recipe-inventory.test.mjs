import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createInventorySearch } from '../src/inventory-search.mjs';
import { createRecipeInventory } from '../src/recipe-inventory.mjs';
import worker from '../dist/server/index.js';

const data = JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz', import.meta.url))));
const normalize = value => String(value).toLowerCase().normalize('NFKD').replace(/\p{M}|ـ/gu, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
const resolver = createRecipeInventory(data.products, createInventorySearch(data.products, data.categories, normalize), normalize);
const output = value => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }];
const request = (message, language = 'en') => new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, lang: language }),
});

test('Alfredo ingredient names resolve to the new inventory, including catalog spelling variants', () => {
  for (const term of ['fettuccine', 'fettuccine pasta', 'fettucine', 'fettucini pasta', 'heavy cream', 'unsalted butter', 'salt', 'black pepper']) {
    const product = resolver.resolve({ id: null, name: term, catalogQuery: term }, new Set());
    assert.ok(product, term);
    assert.equal(product.available, true, term);
    assert.equal(product.sourceKind, 'catalog');
  }
  assert.equal(resolver.resolve({ name: 'Heavy cream' }, new Set()).id, '159464');
});

test('ingredient matching excludes flavored snacks, milk powder, body cream and cream cheese', () => {
  for (const term of ['heavy cream', 'cream', 'butter', 'salt', 'black pepper', 'parmesan', 'pasta']) {
    const results = resolver.search(term);
    assert.ok(results.length, term);
    assert.ok(results.every(product => !['snacks', 'personal-care'].includes(product.category)), term);
    assert.ok(results.every(product => !/body|chips|crisps|cream cheese|double cream cheese|dano full cream/i.test(product.name.en)), term);
  }
  assert.ok(resolver.search('heavy cream').every(product => /35\s*%/.test(product.name.en)));
});

test('sold-out ingredients stay sold out without inventing equivalent products or availability', () => {
  const parmesan = resolver.resolve({ id: '179232', name: 'Parmesan', catalogQuery: 'parmesan' }, new Set(['179232']));
  assert.equal(parmesan.id, '179232');
  assert.equal(parmesan.available, false);
  assert.ok(resolver.search('parmesan').every(product => product.available === false));
  assert.equal(resolver.resolve({ id: 'made-up', name: 'Imaginary moon dust seasoning' }, new Set()), null);
});

test('a generic sold-out cream is replaced by an available matching type', () => {
  const product = resolver.resolve({ id: '131332', name: 'Cooking cream', catalogQuery: 'cooking cream' }, new Set(['131332']));
  assert.notEqual(product.id, '131332');
  assert.equal(product.available, true);
  assert.match(product.name.en, /cooking cream/i);
  const specific = resolver.resolve({ id: '179232', name: 'M/Chef parmesan', catalogQuery: 'M/Chef parmesan' }, new Set(['179232']));
  assert.equal(specific.id, '179232');
  assert.equal(specific.available, false);
});

test('the reported Alfredo recipe is repaired server-side even when the model leaves ingredient IDs empty', async () => {
  const previous = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++call === 1) return Response.json({ output: output({ allowed: true, language: 'en', priceOnly: false }) });
    if (call === 2) return Response.json({ output: [{ type: 'function_call', name: 'search_inventory', call_id: 'found', arguments: JSON.stringify({ queries: ['unsalted butter', 'parmesan'] }) }] });
    assert.ok(body.text.format.schema.properties.items.items.required.includes('catalogQuery'));
    return Response.json({ output: output({ inScope: true,
      recipe: { title: 'Fettuccine Alfredo', servings: 2, minutes: 20, steps: ['Cook the pasta, prepare the cream sauce and combine.'], revisesRecipe: null },
      items: [
        { id: null, name: 'Fettuccine pasta', catalogQuery: 'fettuccine pasta', amount: '200 g', grams: 200 },
        { id: '178830', name: 'Unsalted butter', catalogQuery: 'unsalted butter', amount: '30 g', grams: 30 },
        { id: null, name: 'Heavy cream', catalogQuery: 'heavy cream', amount: '180 ml', grams: null },
        { id: '179232', name: 'Grated parmesan', catalogQuery: 'parmesan', amount: '40 g', grams: 40 },
        { id: null, name: 'Salt', catalogQuery: 'salt', amount: 'to taste', grams: null },
        { id: null, name: 'Black pepper', catalogQuery: 'black pepper', amount: 'to taste', grams: null },
      ], showNutrition: false, answer: 'All ingredients are available.',
    }) });
  };
  try {
    const reply = await (await worker.fetch(request('Fettuccine Alfredo recipe for two'), { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' })).json();
    assert.equal(reply.mode, 'ai');
    assert.equal(reply.card.items.length, 6);
    assert.ok(reply.card.items.every(item => item.id));
    assert.equal(reply.products.length, 6);
    assert.equal(reply.products.filter(product => product.available === true).length, 5);
    assert.equal(reply.products.find(product => product.id === '179232').available, false);
    assert.match(reply.text, /out of stock/);
    assert.doesNotMatch(reply.text, /All ingredients are available/);
    assert.deepEqual(reply.card.items.map(item => item.amount), ['200 g', '30 g', '180 ml', '40 g', 'to taste', 'to taste']);
  } finally { globalThis.fetch = previous; }
});

test('localized recipe labels still resolve via English catalog queries in all four languages', async () => {
  for (const [language, name] of [['en', 'Heavy cream'], ['fr', 'Crème entière'], ['ar', 'كريمة ثقيلة'], ['arz', 'Krime']]) {
    const product = resolver.resolve({ id: null, name, catalogQuery: 'heavy cream' }, new Set());
    assert.equal(product.id, '159464', language);
  }
});
