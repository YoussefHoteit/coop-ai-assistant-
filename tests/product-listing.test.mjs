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
  const summary=reply.typeSelection?{kind:'types',queries:reply.typeSelection.queries}:card?{kind:card.kind,comparisonContext:card.comparisonContext,items:card.items.slice(0,12).map(i=>[i.id])}:null;
  return [...history,{role:'user',content:message},{role:'assistant',content:(summary?JSON.stringify(summary)+'\n':'')+reply.text}];
}

test('product identities distinguish the actual item from flavours, fillings and accessories',()=>{
  const turkey=['5861408','5861404','136024','131957','136026','163053','131421'];
  const french=data.products.find(p=>/La Piara mrtd dinde/i.test(p.name.en));
  assert.ok(french?.available);turkey.push(french.id);
  const expectedDogs=data.products.filter(p=>p.available&&p.category==='pantry'&&/\b(?:hot ?dogs?|frankfurters?)\b/i.test(p.name.en));
  assert.equal(expectedDogs.length,5);
  for(const q of ['turkey','dinde','7abash','حبش'])assert.deepEqual(ids(stocked(q)),turkey.sort(),q);
  for(const q of ['hot dog','hot dogs','hotdog','frankfurters','هوت دوغ'])assert.deepEqual(ids(stocked(q)),ids(expectedDogs),q);
  assert.ok(search('turkey breast').some(p=>p.id==='163053'));
  assert.deepEqual(ids(stocked('hot dog bread')),['58467']);
  assert.deepEqual(ids(stocked('hot dog bun')),['58467']);
  assert.ok(stocked('bread').some(p=>p.id==='58467'));
  assert.equal(stocked('beef hot dog').length,3);
  assert.equal(stocked('chicken hot dog').length,2);
  assert.ok(search('turkey sandwich').every(p=>p.category==='ready'));
  const catTurkey=stocked('turkey cat food');assert.equal(catTurkey.length,7);assert.ok(catTurkey.every(p=>p.category==='pets'));
  assert.deepEqual(ids(stocked('dog food with turkey')),['57985']);
  // The shared rule applies to other actual product identities too.
  for(const term of ['salmon','tuna','sardines','sausage','mortadella','pepperoni']){
    const matches=stocked(term);assert.ok(matches.length,term);
    assert.ok(matches.every(p=>['fish','frozen','meat','pantry'].includes(p.category)),term);
    assert.ok(matches.every(p=>search.taxonomy.records.get(p.id).identityTypes.includes(term)),term);
  }
  assert.ok(stocked('tuna in water').length>1);
  assert.ok(stocked('tuna in water').every(p=>/water/i.test(p.name.en)&&p.category==='pantry'));
  assert.ok(stocked('veal').every(p=>p.category!=='pets'));
  assert.ok(stocked('liver').every(p=>p.category!=='pets'));
  assert.ok(stocked('friskies').length>1);
});

test('the same identity rules classify new inventory records by primary department and aisle',()=>{
  const fixture=(id,name,category,subcategory,additionalCategories=[])=>({id,name:{en:name,ar:name},size:{en:'200g',ar:'200g'},category,subcategory,additionalCategories,available:true,price:1});
  const items=[
    fixture('1','Turkey breast','meat','Cold Cuts'),
    fixture('2','Turkey chunks in gravy','pets','Cat Food',['meat']),
    fixture('3','Turkey sandwich','ready','Sandwiches'),
    fixture('4','Hot dog','pantry','Cans & Jars'),
    fixture('5','Hot dog bread','bakery','Bread',['pantry']),
    fixture('6','Hot dog flavour crisps','snacks','Chips & Crackers',['pantry']),
    fixture('7','Turkey flavoured seasoning','pantry','Herbs & Spices'),
    fixture('8','Salmon fillet','fish','Fresh Fish'),
    fixture('9','Salmon dog food','pets','Dog Food',['fish']),
    fixture('10','Salmon sandwich','ready','Sandwiches'),
    fixture('11','Duck and rice','pets','Dog Food'),
    fixture('12','Frankfurters','pantry','Cans & Jars'),
  ];
  const find=createInventorySearch(items,data.categories,normalize);
  assert.deepEqual(ids(find('turkey')),['1']);
  assert.deepEqual(ids(find('hot dog')),['12','4']);
  assert.deepEqual(ids(find('hot dog bread')),['5']);
  assert.deepEqual(ids(find('salmon')),['8']);
  assert.deepEqual(ids(find('turkey sandwich')),['3']);
  assert.deepEqual(ids(find('salmon dog food')),['9']);
  assert.deepEqual(ids(find('duck')),[]);
  assert.deepEqual(ids(find('duck','pets')),['11']);
});

test('chat type listings and cheapest follow-ups keep a verified identity across turns',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Direct identity searches must not use a model');};
  try{
    for(const [q,term] of [['Do you have turkey?','turkey'],['List all available hot dogs','hot dogs'],['Do you have hot dog bread?','hot dog bread'],['What options do you have for salmon?','salmon'],['Do you have turkey cat food?','turkey cat food']]){
      const expected=stocked(term);assert.ok(expected.length);
      const first=await chat(q);assert.equal(first.card?.kind,'products',q);assert.deepEqual(ids(first.products),ids(expected),q);
      const history=turn([],q,first);
      const cheapest=await chat('what is the cheapest option',history);assert.ok(cheapest.products.length,q);
      assert.ok(cheapest.products.every(p=>expected.some(item=>item.id===p.id)&&p.price===Math.min(...expected.map(p=>p.price))),q);
      const all=await chat('list all available options',turn(history,'what is the cheapest option',cheapest));
      assert.deepEqual(ids(all.products),ids(expected),q);
    }
  }finally{globalThis.fetch=original;}
});

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
    const question='what types of cheeses do you have';
    const discovery=await chat(question);
    assert.equal(discovery.card,null);assert.equal(discovery.products.length,0);assert.ok(discovery.typeSelection);
    assert.match(discovery.text,/Akkawi.*Mozzarella.*Halloumi.*Feta.*Cheddar/s);assert.match(discovery.text,/Which type are you interested in/);
    history=turn(history,question,discovery);
    const options=[
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
    for(const [message,language] of [['شو في شامبو عندكن؟','ar'],['shou fi shampoo 3andkon?','arz'],['Avez-vous du shampooing ?','fr']]){
      const r=await chat(message);
      assert.equal(r.language,language,message);
      assert.deepEqual(ids(r.products),ids(stocked('shampoo')),message);
    }
    assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});

test('type discovery asks for a type before retrieving SKUs and keeps the selected group for comparisons',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected provider call');};
  try{
    const cases=[
      {ask:'What types of cheeses do you have?',labels:['Akkawi','Mozzarella','Halloumi','Feta','Cheddar'],choose:'mozarela',expected:stocked('mozzarella')},
      {ask:'What types of meats do you have?',labels:['Beef','Lamb','Chicken','Turkey','Cold cuts'],choose:'beef',expected:stocked('meat poultry').filter(p=>!search.taxonomy.records.get(p.id).aisles.includes('Cold Cuts')&&/\b(?:beef|cow|boeuf|biftek|faux fillet|entrecote)\b/i.test(p.name.en))},
      {ask:'What types of mates do you have?',labels:['Beef','Lamb','Chicken'],choose:'chicken',expected:stocked('meat poultry').filter(p=>{const m=search.taxonomy.records.get(p.id);return !m.aisles.includes('Cold Cuts')&&(m.aisles.includes('Chicken')||/\b(?:chicken|poulet|poule|tawook)\b/i.test(p.name.en));})},
      {ask:'What kinds of rice do you have?',labels:['Basmati','Egyptian','American','Jasmine'],choose:'Basmati',expected:stocked('basmati rice')},
      {ask:'What types of pasta do you have?',labels:['Spaghetti','Penne','Fettuccine','Lasagna'],choose:'penne',expected:stocked('penne')},
      {ask:'What types of shampoo do you have?',labels:['Anti-dandruff','Anti-hair-fall','Repair','Baby shampoo'],choose:'baby shampoo',expected:stocked('shampoo').filter(p=>p.category==='baby'||/\b(?:baby|kids)\b/i.test(p.name.en))},
    ];
    for(const {ask,labels,choose,expected} of cases){
      const first=await chat(ask);assert.equal(first.card,null,ask);assert.deepEqual(first.products,[]);assert.ok(first.typeSelection);
      for(const label of labels)assert.ok(first.text.includes(label),`${ask}: ${label}`);
      assert.match(first.text,/Which type are you interested in/);
      let history=turn([],ask,first);
      const selected=await chat(choose,history);assert.equal(selected.card?.kind,'products',ask+' -> '+choose);assert.deepEqual(ids(selected.products),ids(expected),choose);
      assert.ok(selected.products.length>0,choose);history=turn(history,choose,selected);
      const cheapest=await chat('what is the cheapest option',history);assert.ok(cheapest.products.length);assert.ok(cheapest.products.every(p=>p.price===Math.min(...expected.map(p=>p.price))));
      const all=await chat('List all available options',turn(history,'what is the cheapest option',cheapest));assert.deepEqual(ids(all.products),ids(expected));
    }
    const all=await chat('List all available cheeses');assert.deepEqual(ids(all.products),ids(stocked('cheeses')));
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});

test('broad source aisles and multilingual type discovery return no individual products',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Unexpected provider call');};
  try{
    for(const [ask,lang,word] of [['What categories of beverages do you have?','en','Juices'],['Quels types de fromages avez-vous ?','fr','Mozzarella'],['شو في انواع اجبان عندكن؟','ar','موزاريلا'],['shou anwe3 shampoo 3andkon?','arz','Shampoo']]){
      const r=await chat(ask);assert.equal(r.language,lang,ask);assert.equal(r.card,null,ask);assert.equal(r.products.length,0,ask);assert.ok(r.text.includes(word),r.text);assert.ok(r.typeSelection);
      assert.ok(!r.text.includes('Chips & Crackers'));
    }
  }finally{globalThis.fetch=original;}
});
