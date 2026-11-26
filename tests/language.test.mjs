import test from 'node:test';
import assert from 'node:assert/strict';
import { detectReplyLanguage, chooseReplyLanguage, replyUsesCorrectScript, arabiziChatCopy } from '../public/language.js';
import worker from '../dist/server/index.js';

const env = { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' };
const request = (message, options = {}, stream = false) => new Request('https://demo.test/api/chat', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(stream && { accept: 'application/x-ndjson' }) },
  body: JSON.stringify({ message, ...options }),
});
const output = reply => [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }];
const reply = answer => ({ inScope: true, recipe: null, items: [], showNutrition: false, answer });
const arabicLetters = /(?=\p{L})\p{Script=Arabic}/u;

test('detect English, Arabic and Lebanese Arabizi without mistaking quantities or brand names for Arabizi', () => {
  for (const text of ['Chicken Alfredo recipe please', 'How much is it?', 'Do you have 7Up?', 'Give me a recipe for 3 people', 'Vitamin B12', 'Pepsi 330ml']) assert.equal(detectReplyLanguage(text, 'arz'), 'en', text);
  for (const text of ['بدي وصفة دجاج', 'قديش سعره؟', 'عندكن chicken Alfredo؟']) assert.equal(detectReplyLanguage(text), 'ar', text);
  for (const text of ['ma3e 15$ w ne7na 3 badna nekol', 'baddi chicken Alfredo recipe', 'shu fina netbokh', 'adde se3ro?', '3mela la 6', 'baddi 7alib']) assert.equal(detectReplyLanguage(text), 'arz', text);
  for (const lang of ['en', 'ar', 'arz']) {
    assert.equal(detectReplyLanguage('6', lang), lang);
    assert.equal(detectReplyLanguage('ok', lang), lang);
  }
  assert.equal(chooseReplyLanguage('baddi chicken', 'en', 'ar'), 'arz');
  assert.equal(chooseReplyLanguage('How much is it?', 'arz', 'ar'), 'en');
  assert.equal(chooseReplyLanguage('قديش سعره؟', 'en', 'en'), 'ar');
});

test('language validation covers prose, recipe steps, ingredients and quantities', () => {
  assert.equal(replyUsesCorrectScript(reply('Eh, fik ta3mol pasta.'), 'arz'), true);
  assert.equal(replyUsesCorrectScript(reply('You can make pasta.'), 'arz'), false);
  assert.equal(replyUsesCorrectScript(reply('يمكنك تحضير المعكرونة.'), 'arz'), false);
  assert.equal(replyUsesCorrectScript(reply('Pasta is easy to prepare.'), 'en'), true);
  assert.equal(replyUsesCorrectScript({ ...reply(''), recipe: { title: 'Pasta', steps: ['أضف الدجاج'] } }, 'en'), false);
  assert.ok(Object.values(arabiziChatCopy).every(text => !arabicLetters.test(text)));
});

test('AI requests enforce the latest language through English, Arabic and Arabizi switches', async () => {
  const saved = globalThis.fetch;
  try {
    for (const [message, recent, lang, answer] of [
      ['Chicken Alfredo recipe please', 'arz', 'en', 'Chicken Alfredo uses pasta, chicken and a creamy sauce.'],
      ['كيف بحفظ الدجاج؟', 'en', 'ar', 'احفظ الدجاج في البراد.'],
      ['shu fina netbokh?', 'ar', 'arz', 'Fik ta3mol pasta ma3 djej.'],
      ['How do I store rice?', 'arz', 'en', 'Keep dry rice in a sealed container.'],
    ]) {
      let calls = 0;
      globalThis.fetch = async (_url, options) => {
        const body = JSON.parse(options.body);
        if (++calls === 1) {
          assert.deepEqual(body.text.format.schema.properties.language.enum, ['en', 'ar', 'arz', 'fr']);
          return Response.json({ output: output({ allowed: true, language: lang, priceOnly: false }) });
        }
        assert.ok(body.instructions.includes(lang === 'arz' ? 'Arabizi: conversational Lebanese Arabic' : lang === 'ar' ? 'Arabic using Arabic script' : 'English. Write all prose'));
        assert.ok(body.input[0].content.includes('earlierMessages'));
        return Response.json({ output: output(reply(answer)) });
      };
      const result = await (await worker.fetch(request(message, { lang: recent, history: [{ role: 'assistant', content: 'Earlier shopping context.' }] }), env)).json();
      assert.equal(result.language, lang);
      assert.equal(result.text, answer);
      assert.equal(result.mode, 'ai');
    }
  } finally { globalThis.fetch = saved; }
});

test('a wrong script is corrected once instead of returning Arabic script to an Arabizi shopper', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (++calls === 1) return Response.json({ output: output({ allowed: true, language: 'arz', priceOnly: false }) });
    if (calls === 2) return Response.json({ output: output(reply('يمكنك تحضير المعكرونة.')) });
    assert.equal(body.text.format.name,'shopping_prose');
    assert.ok(!body.tools,'Language repair must not restart inventory lookups');
    return Response.json({ output: output({texts:[{key:'answer',text:'Fik ta3mol pasta.'}]}) });
  };
  try {
    const result = await (await worker.fetch(request('shu fina netbokh'), env)).json();
    assert.equal(result.language, 'arz');
    assert.equal(result.text, 'Fik ta3mol pasta.');
    assert.equal(calls, 3);
  } finally { globalThis.fetch = saved; }
});

test('Arabizi fallback recipes, scope replies and price follow-ups retain the language', async () => {
  const recipe = await (await worker.fetch(request('baddi tabbouleh la 4'))).json();
  assert.equal(recipe.language, 'arz');
  assert.equal(recipe.card.kind, 'recipe');
  assert.ok(recipe.card.steps.every(step => !arabicLetters.test(step)));
  assert.ok(recipe.card.items.some(item => /parsley/i.test(item.name)));
  assert.ok(recipe.card.items.every(item => !/ba2dounes|damme|7abbe|ma3ale2|mal3a2a/i.test(item.name+' '+item.amount)));
  const scope = await (await worker.fetch(request('baddi write code'))).json();
  assert.equal(scope.language, 'arz');
  assert.ok(scope.text.startsWith('Fiyye'));
  const item = (await (await worker.fetch(new Request('https://demo.test/api/catalog?limit=1'))).json()).products[0];
  const price = await (await worker.fetch(request('adde 7a2o?', {
    lang: 'arz', history: [{ role: 'assistant', content: JSON.stringify({ kind: 'products', items: [[item.id]] }) }],
  }))).json();
  assert.equal(price.language, 'arz');
  assert.equal(price.priceOnly, true);
  assert.equal(price.text, '$' + item.price.toFixed(2));
});

test('Arabizi streamed text and completed response carry the same language', async () => {
  const saved = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) return Response.json({ output: output({ allowed: true, language: 'arz', priceOnly: false }) });
    const result = reply('Fik ta3mol pasta ma3 djej.');
    const events = [
      { type: 'response.output_text.delta', item_id: 'text', delta: JSON.stringify(result) },
      { type: 'response.completed', response: { output: output(result) } },
    ];
    return new Response(events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join(''), { headers: { 'content-type': 'text/event-stream' } });
  };
  try {
    const result = await worker.fetch(request('ma3e 15$ w ne7na 3 badna nekol', {}, true), env);
    const events = (await result.text()).trim().split('\n').map(JSON.parse);
    assert.ok(events.some(event => event.type === 'text'));
    assert.ok(events.filter(event => event.type === 'text').every(event => event.language === 'arz' && !arabicLetters.test(event.delta)));
    assert.equal(events.at(-1).reply.language, 'arz');
    assert.equal(events.at(-1).reply.text, 'Fik ta3mol pasta ma3 djej.');
  } finally { globalThis.fetch = saved; }
});
