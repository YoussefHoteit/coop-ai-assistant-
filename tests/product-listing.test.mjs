import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import worker from '../dist/server/index.js';
import {createInventorySearch} from '../src/inventory-search.mjs';

const data=JSON.parse(gunzipSync(await readFile('src/inventory-catalog.json.gz')));
const normalize=s=>String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const search=createInventorySearch(data.products,data.categories,normalize);
const chat=async(message,history=[])=>(await worker.fetch(new Request('https://demo.test/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history})}),{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'})).json();
const ids=products=>products.map(p=>p.id).sort();
const stocked=query=>search(query).filter(p=>p.available===true);
function turn(history,message,reply){
  const card=reply.card;
  return [...history,{role:'user',content:message},{role:'assistant',content:JSON.stringify({kind:card.kind,comparisonContext:card.comparisonContext,items:card.items.slice(0,12).map(i=>[i.id])})+'\n'+reply.text}];
}

test('metadata retrieves every mozzarella spelling, independent of customer spelling or punctuation',()=>{
  const raw=data.products.filter(p=>p.category==='dairy'&&p.available===true&&/mo(?:zz|z)arell?a/i.test(p.name.en));
  assert.equal(raw.length,20);
  for(const term of ['mozzarella','mozarella','mozarela','mozzarela'])assert.deepEqual(ids(stocked(term)),ids(raw),term);
  assert.equal(Math.min(...raw.map(p=>p.price)),1.97);
  assert.equal(stocked('permisan').length,0);
  assert.ok(search('permisan').some(p=>/parmesan/i.test(p.name.en)));
  assert.ok(stocked('shredded mozzarella').length>5);
  assert.ok(stocked('shredded mozzarella').every(p=>/shred/i.test(p.name.en)));
});

test('the full reported conversation retains the complete family, not the last selected SKU',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('Inventory lookups must not require generative selection');};
  try{
    let history=[];
    const options=[
      ['what types of cheeses do you have',stocked('cheeses')],
      ['do you have mozarela or permisan',[...stocked('mozzarella'),...search('parmesan')]],
      ['what other mozzarella options do you have',stocked('mozzarella')],
      ['what is the cheapest mozzarella that you have available',stocked('mozzarella').filter(p=>p.price===1.97)],
      ['list for me all the available mozzarella options that you have',stocked('mozzarella')],
      ['list all available options',stocked('mozzarella')],
    ];
    for(const [message,expected] of options){
      const result=await chat(message,history);
      assert.equal(result.card?.kind,'products',message);
      assert.deepEqual(ids(result.products),ids(expected),message);
      if(message.includes('types of')){
        assert.ok(result.products.length>100);
        assert.ok(['mozzarella','cheddar','halloumi','feta','akkawi'].every(tag=>result.products.slice(0,24).some(p=>search.taxonomy.records.get(p.id).attributes.includes(tag))), 'first page should represent distinct varieties');
      }
      history=turn(history,message,result);
    }
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});

test('all products and price extrema use the same complete retrieval across departments',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Provider should not be needed');};
  try{
    for(const family of ['eggs','basmati rice','shampoo','pencils','diapers','water','dog food','cat food','chocolate','olive oil']){
      const expected=stocked(family);
      assert.ok(expected.length>1,family);
      const question=`What options do you have for ${family}?`;
      const first=await chat(question);
      assert.deepEqual(ids(first.products),ids(expected),family);
      let history=turn([],question,first);
      for(const [message,extreme] of [['what is the cheapest option',Math.min],['what is the most expensive option',Math.max]]){
        const reply=await chat(message,history);
        const cost=extreme(...expected.filter(p=>Number.isFinite(p.price)).map(p=>p.price));
        assert.ok(reply.products.length,`${family} ${message}`);
        assert.ok(reply.products.every(p=>p.available&&p.price===cost),`${family} ${message}`);
        history=turn(history,message,reply);
      }
      const all=await chat('List all available options',history);
      assert.deepEqual(ids(all.products),ids(expected),family+' after price comparison');
    }
  }finally{globalThis.fetch=original;}
});

test('source aisles are complete categories even without a hand-authored taxonomy rule',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Provider should not be needed');};
  try{
    for(const [term,label] of [['stationery','Stationery'],['kitchen tools','Kitchen tools'],['fruits','Fruits']]){
      const expected=data.products.filter(p=>p.available===true&&(p.subcategory||'').split(',').some(s=>s.trim()===label));
      assert.ok(expected.length>1,term);
      const r=await chat('List all available '+term);
      assert.deepEqual(ids(r.products),ids(expected),term);
    }
    const reply=await chat('List all available stationry');
    assert.deepEqual(ids(reply.products),ids(stocked('stationery')));
  }finally{globalThis.fetch=original;}
});

test('multilingual intent translation uses the same complete classification lookup',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({allowed:true,language:calls===1?'ar':'arz',priceOnly:false,request:{intent:'products',queries:['shampoo'],lookupKind:'availability',pricePreference:'standard'}})}]}]});};
  try{
    for(const [message,language] of [['شو في أنواع شامبو عندكن؟','ar'],['shou anwe3 shampoo 3andkon?','arz'],['Quels types de shampooing avez-vous ?','fr']]){
      const r=await chat(message);
      assert.equal(r.language,language,message);
      assert.deepEqual(ids(r.products),ids(stocked('shampoo')),message);
    }
    assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});
