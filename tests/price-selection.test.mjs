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
    const reply=await chat('What is your cheapest basmati rice per kg?');
    assert.equal(calls,1);
    assert.equal(reply.products[0].name.en,'Taj elegant extra long basmati rice 4kg');
    assert.match(reply.text,/1\.94/);
    assert.equal(reply.card.kind,'products');
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
