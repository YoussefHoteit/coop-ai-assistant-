import test from 'node:test';
import assert from 'node:assert/strict';
import { customerCopy, customerMessages, mentionsInternalData } from '../public/customer-copy.js';
import worker from '../dist/server/index.js';

const request = message => new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }),
});
const output = value => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }];
const reply = (answer, items = []) => ({ inScope: true, recipe: null, items, showNutrition: false, answer });
const item = { id: '5651655', name: 'Del Libano Fettucine Verdi 400gr', catalogQuery: null, amount: null, grams: null };

test('the exact reported pasta misspelling resolves on the first search and in fallback replies', async () => {
  for (const q of ['fettuccinin pasta', 'fettucinin pasta', 'fettuccine pasta']) {
    const data = await (await worker.fetch(new Request('https://demo.test/api/catalog?q=' + encodeURIComponent(q)))).json();
    assert.equal(data.products[0].id, '5651655');
    assert.equal(data.products[0].price, 2.85);
  }
  const found = await (await worker.fetch(request('do you have fettuccinin pasta and what is its brand and price'))).json();
  assert.ok(found.products.some(product => product.id === '5651655'));
  assert.equal(mentionsInternalData({ answer: found.text }), false);
  // A nearby spelling from a different retail department must not become an ingredient.
  const pencils = await (await worker.fetch(new Request('https://demo.test/api/catalog?q=pencils'))).json();
  assert.ok(pencils.products.every(product => product.category === 'school'));
});

test('customer-facing headings, stock labels and fallback messages omit internal data terminology in all languages', () => {
  assert.equal(customerCopy.en.results, 'Products');
  assert.equal(customerCopy.en.inStock, 'Available');
  assert.equal(customerCopy.en.outOfStock, 'Out of stock');
  for (const group of [customerCopy, customerMessages]) for (const values of Object.values(group)) {
    for (const text of Object.values(values)) assert.equal(mentionsInternalData({ answer: text }), false, text);
  }
  assert.equal(mentionsInternalData({ answer: 'I found it in the catalog.' }), true);
  assert.equal(mentionsInternalData({ answer: 'Oui, nous avons ces pâtes.' }), false);
});

test('product matches are supplied before the model answers a misspelled availability question', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++calls === 1) return Response.json({ output: output({ allowed: true, language: 'en', priceOnly: false }) });
    const data = JSON.parse(body.input[0].content);
    assert.equal(data.serverProductMatches[0].results[0].id, '5651655');
    assert.match(body.instructions, /Speak as the COOP shop assistant/);
    // Simulate the model overlooking known matches; the server still returns the real products.
    return Response.json({ output: output(reply('We don’t have that pasta.')) });
  };
  try {
    const data = await (await worker.fetch(request('Do you have fettuccinin pasta and what is its brand and price?'), { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' })).json();
    assert.equal(data.mode, 'ai');
    assert.equal(data.products[0].id, '5651655');
    assert.equal(mentionsInternalData({ answer: data.text }), false);
    assert.doesNotMatch(data.text, /don.t have/i);
  } finally { globalThis.fetch = saved; }
});

test('internal search narration is rewritten as a natural COOP answer', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++calls === 1) return Response.json({ output: output({ allowed: true, language: 'en', priceOnly: false }) });
    if (calls === 2) return Response.json({ output: output(reply('I found Del Libano Fettucine Verdi in the catalog for $2.85.', [item])) });
    assert.match(body.input.at(-1).content, /Speak as COOP/);
    return Response.json({ output: output(reply('Yes, we have Del Libano Fettucine Verdi 400g for $2.85.', [item])) });
  };
  try {
    const data = await (await worker.fetch(request('Do you have fettuccinin pasta?'), { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' })).json();
    assert.equal(calls, 3);
    assert.equal(data.text, 'Yes, we have Del Libano Fettucine Verdi 400g for $2.85.');
    assert.equal(data.products[0].id, '5651655');
  } finally { globalThis.fetch = saved; }
});
