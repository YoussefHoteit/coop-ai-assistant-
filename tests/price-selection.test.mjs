import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createInventorySearch } from '../src/inventory-search.mjs';
import { createRecipeInventory } from '../src/recipe-inventory.mjs';
import { optimizeRecipeBudget, rankedPrices } from '../src/recipe-budget.mjs';
import worker from '../dist/server/index.js';

const catalog = JSON.parse(gunzipSync(await readFile('src/inventory-catalog.json.gz')));
const normalize = value => String(value).toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const inventory = createRecipeInventory(catalog.products, createInventorySearch(catalog.products,catalog.categories,normalize),normalize);
const get = id => catalog.products.find(product=>product.id===id);
const output = data => Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
const chat = async(message,history=[]) => (await worker.fetch(new Request('https://demo.test/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history})}),{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'})).json();

test('whole-wheat, basmati and almond are required product attributes in search',()=>{
  for(const [query,pattern] of [['basmati rice',/basmati/i],['whole wheat pasta',/whole.?wheat|whole grain|integral|complet|wholemeal/i],['almond milk',/almond|amande/i]]){
    const products=inventory.search(query);
    assert.ok(products.length,query);
    assert.ok(products.every(product=>pattern.test(product.name.en)),query);
  }
});

test('explicit cheap and premium requests select opposite compatible whole-pack costs',()=>{
  const original=get('178830');
  const entry={name:'Unsalted butter',catalogQuery:'unsalted butter',amount:'50 g',grams:50};
  const cheap=optimizeRecipeBudget([entry],[original],inventory,null,{pricePreference:'cheapest'});
  const premium=optimizeRecipeBudget([entry],[original],inventory,null,{pricePreference:'premium'});
  assert.equal(cheap.products[0].price,1.65);
  assert.equal(premium.products[0].price,5.12);
  assert.ok(premium.summary.total>cheap.summary.total);
  const bounded=optimizeRecipeBudget([entry],[original],inventory,3,{pricePreference:'premium'});
  assert.equal(bounded.summary.total,2.99);
  assert.ok([cheap,premium,bounded].every(result=>result.products[0].available===true));
});

test('price-per-kilo comparison ranks the full set and converts pounds',()=>{
  const rows=rankedPrices(inventory.search('basmati rice'),'kg');
  assert.equal(rows[0].product.name.en,'Taj elegant extra long basmati rice 4kg');
  assert.equal(rows[0].value,7.75/4);
  assert.ok(rows.some(row=>row.product.name.en.includes('8lb')));
});

test('a numerical comparison completes after one model planning call',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async(_url,options)=>{
    calls++;
    assert.equal(JSON.parse(options.body).text.format.name,'shopping_scope');
    return output({allowed:true,language:'en',priceOnly:false,request:{intent:'products',queries:['basmati rice'],englishRequest:'Cheapest basmati rice per kilogram',budgetUsd:null,servings:null,lookupKind:'comparison',comparisonBasis:'kg',pricePreference:'cheapest'}});
  };
  try{
    const reply=await chat('Compare the different brands of basmati rice after converting sizes to kilograms.');
    assert.equal(calls,1);
    assert.equal(reply.products[0].name.en,'Taj elegant extra long basmati rice 4kg');
    assert.match(reply.text,/1\.94/);
    assert.equal(reply.card.kind,'products');
  }finally{globalThis.fetch=original;}
});

test('complete and unambiguous product requests bypass the provider',async()=>{
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('The provider is unavailable');};
  try{
    const price=await chat('What is the price of Aoun rough salt 900g?');
    assert.equal(price.text,'$0.75');
    const stock=await chat('Do you have a car charger?');
    assert.ok(stock.products.some(product=>product.id==='188331'));
    const value=await chat('What is your cheapest basmati rice per kg?');
    assert.equal(value.products[0].name.en,'Taj elegant extra long basmati rice 4kg');
    const arz=await chat('baddi riz basmati, shou ar5as wahad bel kilo?');
    assert.equal(arz.language,'arz');
    assert.equal(arz.products[0].name.en,'Taj elegant extra long basmati rice 4kg');
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});

function historyTurn(history,message,reply){
  const products=new Map(reply.products.map(product=>[product.id,product]));
  const card=reply.card;
  return [...history,{role:'user',content:message},{role:'assistant',content:[card&&JSON.stringify({kind:card.kind,comparisonContext:card.comparisonContext,items:card.items.map(item=>[item.id,products.get(item.id)?.name.en,item.amount])}),reply.text].filter(Boolean).join('\n')}];
}

test('contextual cheapest and most expensive results keep the entire original product search and clickable cards',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('Direct contextual comparison should not use the provider');};
  try{
    for(const query of ['eggs','unsalted butter','basmati rice','whole wheat pasta','pencils']){
      const question='Do you have '+query+'?';
      const first=await chat(question);
      assert.ok(first.card?.comparisonContext?.queries.length,query);
      let history=historyTurn([],question,first);
      const stocked=inventory.search(query).filter(p=>p.available===true&&Number.isFinite(p.price));
      assert.ok(stocked.length,query);
      const min=Math.min(...stocked.map(p=>p.price)),max=Math.max(...stocked.map(p=>p.price));
      for(const [message,expected] of [['what is the cheapest option',min],['what is the most expensive option',max],['cheapest one',min]]){
        const reply=await chat(message,history);
        assert.equal(reply.priceOnly,false,message+' '+query);
        assert.equal(reply.card?.kind,'products');assert.ok(reply.products.length);
        assert.ok(reply.products.every(p=>p.price===expected&&p.available===true),query+' '+message+' '+expected);
        assert.deepEqual(reply.card.comparisonContext.queries,first.card.comparisonContext.queries);
        history=historyTurn(history,message,reply);
      }
    }
    assert.equal(calls,0);
  }finally{globalThis.fetch=original;}
});

test('legacy chats and multilingual follow-ups recover the product group, not the last winner',async()=>{
  const options=inventory.search('eggs').filter(p=>p.available===true);
  const highest=options.reduce((a,b)=>a.price>b.price?a:b);
  const history=[{role:'user',content:'What options do they have for eggs?'},{role:'assistant',content:JSON.stringify({kind:'products',items:options.slice(0,8).map(p=>[p.id,p.name.en])})},{role:'user',content:'what is the most expensive option'},{role:'assistant',content:JSON.stringify({kind:'products',items:[[highest.id,highest.name.en]]})}];
  const minimum=Math.min(...options.map(product=>product.price));
  for(const [message,language] of [['شو أرخص خيار؟','ar'],['shou ar5as wa7ad?','arz'],['Quel est le moins cher ?','fr']]){
    const reply=await chat(message,history);
    assert.equal(reply.language,language);assert.equal(reply.priceOnly,false);assert.ok(reply.products.length);
    assert.ok(reply.products.every(product=>product.price===minimum));
  }
});

test('unit-price follow-ups preserve the comparison basis and genuine price-only questions remain text-only',async()=>{
  const message='What is your cheapest basmati rice per kg?';
  const first=await chat(message);const history=historyTurn([],message,first);
  const highest=await chat('what is the most expensive option',history);
  const expected=rankedPrices(inventory.search('basmati rice'),'kg','premium')[0];
  assert.equal(highest.products[0].id,expected.product.id);assert.equal(highest.card.comparisonContext.basis,'kg');
  assert.equal(highest.priceOnly,false);
  const single=await chat('How much is it?',historyTurn(history,'what is the most expensive option',highest));
  if(highest.products.length===1){assert.equal(single.priceOnly,true);assert.equal(single.text,'$'+highest.products[0].price.toFixed(2));}
});

test('a comparison incorrectly classified as a price lookup still returns an interactive card',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(_url,options)=>{
    calls++;assert.equal(JSON.parse(options.body).text.format.name,'shopping_scope');
    return output({allowed:true,language:'en',priceOnly:true,request:{intent:'followup',queries:['unsalted butter'],pricePreference:'standard',lookupKind:'price',comparisonBasis:'pack'}});
  };
  try{
    const reply=await chat('Can you tell me which is the least expensive one?');
    assert.equal(calls,1);assert.equal(reply.priceOnly,false);assert.equal(reply.card.kind,'products');assert.ok(reply.products.length);
    assert.equal(reply.products[0].price,1.65);
  }finally{globalThis.fetch=original;}
});

test('serving-count revisions are validated before returning a shopping card',async()=>{
  const original=globalThis.fetch;
  let drafts=0;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.text.format.name==='shopping_scope')return output({allowed:true,language:'en',priceOnly:false,request:{intent:'recipe',queries:['unsalted butter'],englishRequest:'Scale the recipe to six people',budgetUsd:null,servings:6,servingsOnly:true,lookupKind:'none',comparisonBasis:'pack',pricePreference:'standard'}});
    const grams=++drafts===1?200:300;
    return output({inScope:true,recipe:{title:'Butter recipe',servings:6,minutes:10,steps:['Use '+grams+' g of butter.'],revisesRecipe:null},items:[{id:'178830',name:'Unsalted butter',catalogQuery:'unsalted butter',amount:grams+' g',grams}],answer:'',showNutrition:false});
  };
  try{
    const reply=await chat('Make it for six people.',[{role:'assistant',content:JSON.stringify({kind:'recipe',recipeKey:'old',title:'Butter recipe',servings:4,items:[['178830','Unsalted butter','200 g','200g',1.77,true,200,'unsalted butter']]})}]);
    assert.equal(drafts,2);
    assert.equal(reply.card.servings,6);
    assert.equal(reply.card.items[0].amount,'300 g');
    assert.equal(reply.card.items[0].purchaseAmount,'300 g');
    assert.equal(reply.card.revisesRecipe,'old');
  }finally{globalThis.fetch=original;}
});
