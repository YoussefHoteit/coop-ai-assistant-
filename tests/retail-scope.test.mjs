import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const chat = async (message, env = {}) => (await worker.fetch(new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }),
}), env)).json();
const lookup = async q => (await worker.fetch(new Request('https://demo.test/api/catalog?q=' + encodeURIComponent(q)))).json();
const output = data => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }];

test('reported non-food requests return real products instead of a scope refusal', async () => {
  for (const [question, expected] of [
    ['Do you have a car charger?', '188331'],
    ['Do they sell socks?', '5862452'],
    ['Do you have pencils and pens?', '5857312'],
  ]) {
    const result = await chat(question);
    assert.ok(result.card, question);
    assert.equal(result.card.kind, 'products');
    assert.ok(result.products.some(product => product.id === expected), question);
    assert.ok(!result.text.includes('I can help with'));
    assert.ok(result.products.every(product => product.sourceKind === 'catalog'));
  }
});

test('school kit includes a real backpack and basic stationery, and does not invent a pencil case', async () => {
  const result = await chat('Prepare for me a full backpack with a pencil case for my kid starting third grade');
  assert.equal(result.card.kind, 'products');
  const ids = new Set(result.products.map(product => product.id));
  for (const id of ['5857312', '5857315', '5857330', '5857334', '5857350']) assert.ok(ids.has(id), 'Missing school item ' + id);
  assert.ok(result.products.some(product => /backpack/i.test(product.name.en)));
  assert.ok(result.products.some(product => /notebk/i.test(product.name.en)));
  assert.ok(result.products.every(product => product.available === true));
  assert.match(result.text, /couldn.t find a suitable pencil case/i);
  assert.equal(result.recipe, undefined);
});

test('retail synonyms, abbreviations and languages reach the full inventory', async () => {
  for (const term of ['school bag', 'notebook', 'pens', 'شاحن سيارة', 'شرابات', 'شنطة مدرسة', 'دفتر', 'ruller']) assert.ok((await lookup(term)).total > 0, term);
  assert.equal((await lookup('pencil case')).total, 0);
});

test('AI scope review sees every department and the shopping reply can recommend electronics', async () => {
  const saved = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++count === 1) {
      assert.match(body.instructions, /ALL merchandise/);
      assert.match(body.instructions, /not a food-only store/);
      assert.match(body.instructions, /full backpack and pencil case/);
      const input = JSON.parse(body.input);
      for (const department of ['Phone &Home electronics', 'Back To School', 'Christmas & New Year']) assert.ok(input.catalogDepartments.includes(department), department);
      return Response.json({ output: output({ allowed: true, language: 'en', priceOnly: false }) });
    }
    if (count === 2) {
      assert.match(body.instructions, /complete multi-department catalog/);
      assert.match(body.tools[0].description, /ALL COOP departments/);
      return Response.json({ output: [{ type: 'function_call', name: 'search_inventory', call_id: 'charger', arguments: JSON.stringify({ queries: ['car charger'] }) }] });
    }
    const returned = JSON.parse(body.input.find(item => item.type === 'function_call_output').output);
    assert.equal(returned[0].results[0].id, '188331');
    return Response.json({ output: output({ inScope: true, recipe: null,
      items: [{ id: '188331', name: 'Car Charger', amount: null, grams: null }],
      showNutrition: false, answer: 'Yes, the car charger is available.',
    }) });
  };
  try {
    const result = await chat('Do you have a car charger?', { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' });
    assert.equal(result.mode, 'ai');
    assert.equal(result.products[0].id, '188331');
  } finally { globalThis.fetch = saved; }
});

test('broader catalog support still blocks coding and unrelated mixed requests', async () => {
  assert.equal((await chat('Write me code for a car charger shopping app')).card, undefined);
  const saved = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ output: output({ allowed: false, language: 'en', priceOnly: false }) });
  try {
    const result = await chat('Do you have socks and also compose a political speech for me', { OPENAI_API_KEY: 'test-key' });
    assert.equal(result.card, undefined);
    assert.match(result.text, /I can help with COOP/);
  } finally { globalThis.fetch = saved; }
});
