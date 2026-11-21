import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createInventorySearch } from '../src/inventory-search.mjs';
import { createRecipeInventory } from '../src/recipe-inventory.mjs';
import { reviewRecipeIngredients } from '../src/recipe-review.mjs';
import worker from '../dist/server/index.js';

const source = JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz', import.meta.url))));
const normalize = value => String(value).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
const inventory = createRecipeInventory(source.products, createInventorySearch(source.products, source.categories, normalize), normalize);
const entry = (query, amount = '100 g') => ({ id: null, name: query, catalogQuery: query, amount, grams: 100 });
const output = value => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }];

test('ordinary ingredients outside the earlier profiles match branded names and reversed word order', () => {
  for (const [query, id] of [['all purpose flour', '167437'], ['ground cinnamon', '61896'], ['fresh mushrooms', '132667']]) {
    const found = inventory.resolve(entry(query), new Set());
    assert.ok(found, query);
    assert.equal(found.id, id);
    assert.equal(found.available, true);
  }
  for (const query of ['tomato paste', 'baking powder']) assert.ok(inventory.resolve(entry(query), new Set()));
});

test('candidate ranking finds real milk, eggs and mozzarella without requiring full product names', () => {
  for (const [query, id] of [['milk', '180085'], ['eggs', '179938'], ['mozzarella', '184766']]) {
    const found = inventory.candidates(entry(query), 8);
    assert.ok(found.some(product => product.id === id), query + ': ' + found.map(p => p.name.en).join(', '));
    assert.ok(found.every(product => !['personal-care', 'kitchen', 'home-care'].includes(product.category)));
  }
  assert.ok(inventory.candidates(entry('vegetable oil')).every(product => !/tuna|sardine/i.test(product.name.en)));
});

test('dietary and ingredient-type requirements remain binding when candidates are broadened', () => {
  const milk = source.products.find(product => product.id === '180085');
  const cornFlour = source.products.find(product => /corn flour/i.test(product.name.en));
  const wheatFlour = source.products.find(product => product.id === '167437');
  assert.equal(inventory.eligible(entry('lactose free milk'), milk), false);
  assert.equal(inventory.eligible(entry('all purpose flour'), cornFlour), false);
  assert.equal(inventory.eligible(entry('gluten free flour'), wheatFlour), false);
  const turkey = source.products.find(product => /turkey breast/i.test(product.name.en));
  assert.equal(inventory.eligible(entry('chicken breast'), turkey), false);
});

test('the final review binds unresolved ingredients only to real per-ingredient candidates', async () => {
  const entries = [entry('milk', '250 ml'), entry('eggs', '2'), entry('mozzarella', '150 g')];
  let calls = 0;
  const reviewed = await reviewRecipeIngredients(entries, [null, null, null], inventory, async body => {
    calls++;
    assert.equal(body.text.format.name, 'recipe_product_matching');
    const groups = JSON.parse(body.input).ingredients;
    const ids = ['180085', '179938', '184766'];
    for (const group of groups) assert.ok(group.choices.some(product => product.id === ids[group.index]));
    return { matches: ids.map((id, index) => ({ index, id, queries: [] })) };
  }, new AbortController().signal);
  assert.equal(calls, 1);
  assert.deepEqual(reviewed.map(product => product.id), ['180085', '179938', '184766']);
  assert.deepEqual(entries.map(item => item.amount), ['250 ml', '2', '150 g']);
});

test('review can request a translated synonym, then select from a second bounded search', async () => {
  const entries = [entry('halib plain')];
  let calls = 0;
  const reviewed = await reviewRecipeIngredients(entries, [null], inventory, async body => {
    const groups = JSON.parse(body.input).ingredients;
    if (++calls === 1) return { matches: [{ index: 0, id: null, queries: ['milk'] }] };
    assert.ok(groups[0].choices.some(product => product.id === '180085'));
    return { matches: [{ index: 0, id: '180085', queries: [] }] };
  }, new AbortController().signal);
  assert.equal(calls, 2);
  assert.equal(reviewed[0].id, '180085');
});

test('review rejects invented IDs, cross-ingredient IDs, duplicates and inappropriate dietary choices', async () => {
  const entries = [entry('milk'), entry('eggs'), entry('lactose free milk')];
  const reviewed = await reviewRecipeIngredients(entries, [null, null, null], inventory, async () => ({ matches: [
    { index: 0, id: 'invented', queries: [] },
    { index: 1, id: '180085', queries: [] },
    { index: 2, id: '180085', queries: [] },
    { index: 0, id: '180085', queries: [] },
    { index: 99, id: '180085', queries: [] },
  ] }), new AbortController().signal);
  assert.deepEqual(reviewed, [null, null, null]);
});

test('a failed final review preserves the recipe choices and never fabricates availability', async () => {
  const parmesan = source.products.find(product => product.id === '179232');
  const reviewed = await reviewRecipeIngredients([entry('parmesan'), entry('imaginary moon dust')], [parmesan, null], inventory,
    async () => { throw new Error('service failure'); }, new AbortController().signal);
  assert.equal(reviewed[0].id, '179232');
  assert.equal(reviewed[0].available, false);
  assert.equal(reviewed[1], null);
});

test('a recipe reaches the UI only after unresolved milk and eggs have been reviewed', async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls++;
    if (body.text.format.name === 'shopping_scope') return Response.json({ output: output({ allowed: true, language: 'en', priceOnly: false }) });
    if (body.text.format.name === 'recipe_product_matching') {
      const groups = JSON.parse(body.input).ingredients;
      assert.deepEqual(groups.map(group => group.index), [1, 2]);
      return Response.json({ output: output({ matches: [{ index: 1, id: '180085', queries: [] }, { index: 2, id: '179938', queries: [] }] }) });
    }
    const recipeOutput = output({ inScope: true,
      recipe: { title: 'Pancakes', servings: 2, minutes: 15, steps: ['Mix the ingredients and cook the pancakes.'], revisesRecipe: null },
      items: [entry('all purpose flour', '200 g'), entry('milk', '250 ml'), entry('eggs', '2')], showNutrition: false, answer: '',
    });
    return body.stream ? new Response('data: ' + JSON.stringify({ type: 'response.completed', response: { output: recipeOutput } }) + '\n\n') : Response.json({ output: recipeOutput });
  };
  try {
    const response = await worker.fetch(new Request('https://demo.test/api/chat', { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' }, body: JSON.stringify({ message: 'Pancakes for two please' }),
    }), { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' });
    const frames = (await response.text()).trim().split('\n').map(JSON.parse);
    const reply = frames.at(-1).reply;
    assert.equal(calls, 3);
    assert.equal(reply.mode, 'ai');
    assert.deepEqual(reply.card.items.map(item => item.id), ['167437', '180085', '179938']);
    assert.deepEqual(reply.card.items.map(item => item.amount), ['200 g', '250 ml', '2']);
    assert.equal(reply.card.servings, 2);
    assert.ok(reply.products.every(product => product.available === true));
    assert.equal(reply.text, '');
  } finally { globalThis.fetch = previous; }
});
