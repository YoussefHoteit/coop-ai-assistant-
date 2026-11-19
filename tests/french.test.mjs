import test from 'node:test';
import assert from 'node:assert/strict';
import { detectReplyLanguage, chooseReplyLanguage, replyUsesCorrectScript } from '../public/language.js';
import worker from '../dist/server/index.js';

const request = (message, options = {}, stream = false) => new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(stream && { accept: 'application/x-ndjson' }) },
  body: JSON.stringify({ message, ...options }),
});
const chat = async (message, options, env) => (await worker.fetch(request(message, options), env)).json();
const output = value => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }];
const result = answer => ({ inScope: true, recipe: null, items: [], showNutrition: false, answer });

test('French detection handles accents, unaccented text and follow-ups while preserving other languages', () => {
  for (const message of ['Bonjour', 'Je voudrais une recette de poulet', 'Combien ça coûte ?', 'Combien ca coute ?', 'Avez-vous des chaussettes ?', 'Et pour 6 personnes ?', 'Pour 3', 'Merci', 'Oui']) assert.equal(detectReplyLanguage(message), 'fr', message);
  assert.equal(detectReplyLanguage('6', 'fr'), 'fr');
  assert.equal(detectReplyLanguage('ok', 'fr'), 'fr');
  assert.equal(chooseReplyLanguage('Merci', 'arz', 'arz'), 'arz');
  assert.equal(chooseReplyLanguage('Je voudrais une recipe de poulet', 'en', 'en'), 'fr');
  assert.equal(chooseReplyLanguage('How much is it?', 'fr', 'fr'), 'en');
  assert.equal(chooseReplyLanguage('baddi chicken', 'fr', 'fr'), 'arz');
  assert.equal(chooseReplyLanguage('قديش سعره؟', 'fr', 'fr'), 'ar');
  assert.equal(replyUsesCorrectScript(result('Vous pouvez préparer des pâtes.'), 'fr'), true);
  assert.equal(replyUsesCorrectScript(result('You can make pasta.'), 'fr'), false);
});

test('French catalog searches return groceries and non-food merchandise', async () => {
  for (const q of ['poulet', 'tomates', 'pois chiches', 'chargeur de voiture', 'chaussettes', 'crayons', 'sac a dos', 'cahiers']) {
    const response = await (await worker.fetch(new Request('https://demo.test/api/catalog?q=' + encodeURIComponent(q)))).json();
    assert.ok(response.total > 0, q);
  }
  const reply = await chat('Avez-vous des chaussettes ?');
  assert.equal(reply.language, 'fr');
  assert.ok(reply.products.some(product => /socks/i.test(product.name.en)));
  assert.match(reply.text, /^Voici/);
});

test('French fallback recipes and school kits have French preparation text and labels', async () => {
  const recipe = await chat('Je voudrais une recette de taboulé pour 3 personnes');
  assert.equal(recipe.language, 'fr');
  assert.equal(recipe.card.title, 'Taboulé');
  assert.equal(recipe.card.servings, 3);
  assert.match(recipe.card.steps[0], /Lavez/);
  assert.ok(recipe.card.items.some(item => item.name === 'persil'));
  const kit = await chat('Préparez un cartable complet pour mon enfant');
  assert.equal(kit.language, 'fr');
  assert.equal(kit.card.kind, 'products');
  assert.match(kit.text, /fournitures scolaires/);
  assert.match(kit.text, /trousse/);
});

test('French price-only follow-ups use the same catalog product and French decimal formatting', async () => {
  const product = (await (await worker.fetch(new Request('https://demo.test/api/catalog?ids=188331'))).json()).products[0];
  const price = await chat('Combien ça coûte ?', { lang: 'fr', history: [{ role: 'assistant', content: JSON.stringify({ kind: 'products', items: [[product.id]] }) }] });
  assert.equal(price.language, 'fr');
  assert.equal(price.priceOnly, true);
  assert.equal(price.text, '$' + product.price.toFixed(2).replace('.', ','));
});

test('French AI replies preserve history, enforce French and correct English output', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++calls === 1) {
      assert.ok(body.text.format.schema.properties.language.enum.includes('fr'));
      assert.equal(JSON.parse(body.input).recentLanguage, 'fr');
      return Response.json({ output: output({ allowed: true, language: 'fr', priceOnly: false }) });
    }
    assert.match(body.instructions, /French. Write all prose/);
    assert.ok(body.input[0].content.includes('Earlier shopping context'));
    if (calls === 2) return Response.json({ output: output(result('You can prepare pasta.')) });
    assert.match(body.input.at(-1).content, /Rewrite the same shopping reply/);
    return Response.json({ output: output(result('Vous pouvez préparer des pâtes au poulet.')) });
  };
  try {
    const reply = await chat('Et pour 6 personnes ?', { lang: 'fr', history: [{ role: 'assistant', content: 'Earlier shopping context' }] }, { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' });
    assert.equal(reply.language, 'fr');
    assert.equal(reply.mode, 'ai');
    assert.equal(reply.text, 'Vous pouvez préparer des pâtes au poulet.');
    assert.equal(calls, 3);
  } finally { globalThis.fetch = saved; }
});

test('French streaming carries French text and language metadata', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) return Response.json({ output: output({ allowed: true, language: 'fr', priceOnly: false }) });
    const reply = result('Vous pouvez préparer des pâtes au poulet.');
    const events = [{ type: 'response.output_text.delta', item_id: 'reply', delta: JSON.stringify(reply) },
      { type: 'response.completed', response: { output: output(reply) } }];
    return new Response(events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join(''));
  };
  try {
    const reply = await worker.fetch(request('Je voudrais une idée de repas', {}, true), { OPENAI_API_KEY: 'test-key' });
    const frames = (await reply.text()).trim().split('\n').map(JSON.parse);
    assert.ok(frames.some(frame => frame.type === 'text' && frame.language === 'fr'));
    assert.equal(frames.at(-1).reply.language, 'fr');
  } finally { globalThis.fetch = saved; }
});

test('French service errors and scope refusals remain French', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Test service failure'); };
  try {
    const reply = await chat('Bonjour, avez-vous du lait ?', {}, { OPENAI_API_KEY: 'test-key' });
    assert.equal(reply.language, 'fr');
    assert.match(reply.text, /Impossible de charger/);
  } finally { globalThis.fetch = saved; }
  const refusal = await chat('Je voudrais que vous write code');
  assert.equal(refusal.language, 'fr');
  assert.match(refusal.text, /^Je peux vous aider/);
});
