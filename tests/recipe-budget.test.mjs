import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';
import{createInventorySearch}from'../src/inventory-search.mjs';import{createRecipeInventory}from'../src/recipe-inventory.mjs';import{optimizeRecipeBudget,recipeBudgetText}from'../src/recipe-budget.mjs';
import worker from'../dist/server/index.js';
const data=JSON.parse(gunzipSync(await readFile('src/inventory-catalog.json.gz'))),normalize=v=>String(v).toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const inventory=createRecipeInventory(data.products,createInventorySearch(data.products,data.categories,normalize),normalize),expensive=data.products.find(p=>p.id==='143792');
test('budget planning compares full-pack prices for suitable brands and sizes without changing recipe quantities',()=>{
 const entries=[{id:expensive.id,name:'Olive oil',catalogQuery:'olive oil',amount:'30 ml',grams:28}];const original=structuredClone(entries);
 const result=optimizeRecipeBudget(entries,[expensive],inventory,15,inventory.taxonomy.queryInfo('I have a total budget of 15 dollars'));
 assert.ok(result.summary.total<=15);assert.notEqual(result.products[0].id,expensive.id);assert.equal(result.products[0].available,true);assert.deepEqual(entries,original);assert.equal(inventory.taxonomy.records.get(result.products[0].id).productType,'olive oil');
 const locked=optimizeRecipeBudget(entries,[expensive],inventory,15,{...inventory.taxonomy.queryInfo('Only Bacha olive oil 1550 ml'),preserveBrands:true});
 assert.equal(locked.products[0].id,expensive.id);assert.ok(locked.summary.total>15);assert.match(recipeBudgetText(locked.summary,15,'en'),/above/);
 const allergy=optimizeRecipeBudget(entries,[expensive],inventory,15,{allergy:true});assert.equal(allergy.products[0].id,expensive.id);
});
test('a price for a small portion must not replace the real checkout cost',()=>{
 assert.match(recipeBudgetText({total:28.49,unpriced:0},15,'en'),/28.49.*above/);
 assert.match(recipeBudgetText({total:10.24,unpriced:0},15,'arz'),/10.24.*15/);
 assert.match(recipeBudgetText({total:10.24,unpriced:1},15,'en'),/cannot confirm/);
 assert.match(recipeBudgetText({total:10.24,unpriced:0},15,'en',true),/label.*allergen/);
});
test('the live-discovered pantry assumption is replaced by the verified cost of listed products',async()=>{
 const previous=fetch,output=value=>[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}];
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);
  if(body.text.format.name==='shopping_scope')return Response.json({output:output({allowed:true,language:'en',priceOnly:false,request:{intent:'recipe',englishRequest:'Prepare a meal for 15 dollars',queries:['olive oil'],budgetUsd:15}})});
  return Response.json({output:output({inScope:true,recipe:{title:'A meal',servings:3,minutes:10,steps:['Use the oil.'],revisesRecipe:null},items:[{id:expensive.id,name:'Olive oil',catalogQuery:'olive oil',amount:'30 ml',grams:28}],answer:'Only the small portion costs $0.30; the rest is already in your pantry.',showNutrition:false})});
 };
 try{const r=await worker.fetch(new Request('https://test.local/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'I have a budget of $15 for three people.'})}),{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'});const reply=await r.json();assert.equal(reply.mode,'ai');assert.match(reply.text,/Buying the listed items/);assert.doesNotMatch(reply.text,/pantry|0\.30/);assert.ok(reply.products[0].price<=15);assert.equal(reply.card.items[0].amount,'30 ml');}finally{globalThis.fetch=previous;}
});
