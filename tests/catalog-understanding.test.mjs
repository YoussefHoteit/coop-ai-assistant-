import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';
import{createInventorySearch}from'../src/inventory-search.mjs';import{createRecipeInventory}from'../src/recipe-inventory.mjs';import worker from'../dist/server/index.js';
import{detectReplyLanguage}from'../public/language.js';
const data=JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz',import.meta.url))));
const normalize=v=>String(v).toLowerCase().normalize('NFKD').replace(/\p{M}|ـ/gu,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const search=createInventorySearch(data.products,data.categories,normalize),resolver=createRecipeInventory(data.products,search,normalize),taxonomy=search.taxonomy;
const output=value=>[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}];
const post=(message,options={})=>new Request('https://test.local/api/chat',{method:'POST',headers:{'content-type':'application/json',...(options.stream&&{accept:'application/x-ndjson'})},body:JSON.stringify({message,...options})});
const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
test('joined Arabizi tokens and numeral spellings retain the shopper language',()=>{
 for(const message of ['bade2e3mal mjadra','bade 2e3mal mlo5iye','mlo5iye'])assert.equal(detectReplyLanguage(message),'arz');
 assert.equal(detectReplyLanguage('I need 3 bananas and 200g of cheese'),'en');
 assert.equal(detectReplyLanguage('Do you have B6complex vitamins?'),'en');
 assert.equal(detectReplyLanguage('Avez-vous Q5mini ?'),'fr');
});
test('all 7666 products have non-mutating department, aisle, family and variant metadata',()=>{
 assert.equal(taxonomy.records.size,7666);assert.equal(Object.keys(taxonomy.facets().departments).length,23);
 for(const p of data.products){const m=taxonomy.records.get(p.id);assert.equal(m.department,p.category);assert.ok(m.familyKey&&m.variantKey&&Array.isArray(m.aisles));assert.equal(p.familyKey,undefined);}
});
test('ingredient forms, translated product names and common preparations resolve beyond literal names',()=>{
 for(const query of ['lentils','red lentils','عدس','lentilles','adass','dried coriander','coriander','coriandre','كزبرة ناشفة','all purpose flour','ground cinnamon','chopped spinach','milk','eggs']){
  const p=resolver.resolve({name:query,catalogQuery:query},new Set());assert.ok(p,query);assert.equal(p.available,true,query);assert.ok(taxonomy.records.get(p.id).edible,query);
 }
 const lentils=resolver.resolve({name:'Brown or green lentils',catalogQuery:'lentils'},new Set());assert.ok(lentils);assert.equal(taxonomy.records.get(lentils.id).productType,'lentils');assert.ok(!/ahmar|majrou/i.test(lentils.name.en));
 const coriander=resolver.resolve({name:'Dried coriander',catalogQuery:'dried coriander'},new Set());assert.equal(coriander.id,'56113');
});
test('ingredient matching cannot confuse chicken with chickpeas or pet food, or milk with condensed milk',()=>{
 for(const q of ['chicken','chickpeas','milk']){const p=resolver.resolve({name:q,catalogQuery:q},new Set());assert.ok(p,q);assert.equal(taxonomy.records.get(p.id).productType,q);assert.notEqual(p.category,'pets');}
 assert.equal(search('pencil case').length,0);assert.equal(resolver.resolve({name:'imaginary moon dust',catalogQuery:'imaginary moon dust'},new Set()),null);
 const red=data.products.find(p=>/adass ahmar/i.test(p.name.en));assert.equal(resolver.eligible({name:'brown or green lentils',catalogQuery:'lentils'},red),false);
 assert.equal(resolver.eligible({name:'gluten-free wheat flour',catalogQuery:'gluten free flour'},data.products.find(p=>p.id==='167437')),false);
});
test('brand alternatives stay within product type, variety and qualifiers, and retain real facts',()=>{
 const source=data.products.find(p=>taxonomy.records.get(p.id).productType==='rice'&&taxonomy.records.get(p.id).brandKey&&taxonomy.alternatives(p.id).length>1);
 assert.ok(source);const original=taxonomy.records.get(source.id);const alternatives=taxonomy.alternatives(source.id);
 assert.ok(alternatives.length>1);for(const p of alternatives){const m=taxonomy.records.get(p.id);assert.equal(m.familyKey,original.familyKey);assert.notEqual(m.brandKey,original.brandKey);assert.deepEqual(p,data.products.find(x=>x.id===p.id));}
 const cheddar=data.products.find(p=>taxonomy.records.get(p.id).attributes.includes('cheddar')&&taxonomy.alternatives(p.id).length);
 if(cheddar)assert.ok(taxonomy.alternatives(cheddar.id).every(p=>taxonomy.records.get(p.id).attributes.includes('cheddar')));
 const packSource=data.products.find(p=>taxonomy.records.get(p.id).productType==='cinnamon'&&taxonomy.alternatives(p.id,{differentBrand:false}).length);
 assert.ok(packSource);for(const p of taxonomy.alternatives(packSource.id,{differentBrand:false})){assert.equal(taxonomy.records.get(p.id).brandKey,taxonomy.records.get(packSource.id).brandKey);assert.notEqual(p.size.en,packSource.size.en);}
});
test('canonical request planning supplies ingredients on the first request in all four languages without dish-specific routing',async()=>{
 const previous=globalThis.fetch;
 const fixtures=[
  ['بدي أعمل مجدرة','ar','Lebanese lentils with rice and onions',['lentils','rice','onions','olive oil','salt'],'مجدرة','اسلق العدس ثم اطبخ الأرز وقدّمه مع البصل.'],
  ['bade 2e3mal mlo5iye','arz','Leafy vegetable chicken stew',['molokhia','dried coriander','garlic','chicken','rice'],'Mlo5iye','Eslo2 el djej w 7addir el khodra ma3 el toum.'],
  ['بدي أعمل الملوخية','ar','Leafy vegetable chicken stew',['molokhia','dried coriander','garlic','chicken','rice'],'ملوخية','اطبخ الدجاج والملوخية مع الثوم والكزبرة.'],
  ['I want to make pancakes','en','Pancakes',['all purpose flour','milk','eggs'],'Pancakes','Mix the ingredients and cook the pancakes.'],
  ['Je voudrais préparer une soupe','fr','Vegetable soup',['carrot','onions','potatoes'],'Soupe de légumes','Coupez les légumes et faites cuire la soupe.'],
 ];
 try{for(const[message,language,englishRequest,queries,title,step]of fixtures){let calls=0;globalThis.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);calls++;
   if(body.text.format.name==='shopping_scope')return Response.json({output:output({allowed:true,language,priceOnly:false,request:{intent:'recipe',englishRequest,queries}})});
   if(body.text.format.name==='shopping_prose'){
     const ar={lentils:'عدس',rice:'أرز',onions:'بصل','olive oil':'زيت زيتون',salt:'ملح',molokhia:'ملوخية','dried coriander':'كزبرة مجففة',garlic:'ثوم',chicken:'دجاج'};
     const fr={carrot:'Carottes',onions:'Oignons',potatoes:'Pommes de terre'};
     return Response.json({output:output({texts:JSON.parse(body.input[0].content).requiredTexts.map(row=>({key:row.key,text:(language==='ar'?ar:fr)[queries[Number(row.key.split(':')[1])]]}))})});
   }
   const context=JSON.parse(body.input[0].content);assert.equal(context.message,message);assert.equal(context.interpretedRequest,englishRequest);assert.ok(context.serverProductMatches.length>=queries.length-1);
   for(const group of context.serverProductMatches)assert.ok(group.results.every(p=>p.classification&&p.sourceKind==='catalog'));
   const reply={inScope:true,recipe:{title,servings:4,minutes:30,steps:[step],revisesRecipe:null},items:queries.map(query=>({id:null,name:query,catalogQuery:query,amount:'100 g',grams:100})),showNutrition:false,answer:''};
   return Response.json({output:output(reply)});
  };
  const reply=await(await worker.fetch(post(message),env)).json();assert.equal(reply.mode,'ai',message);assert.equal(reply.language,language);assert.equal(reply.card.kind,'recipe');assert.ok(reply.card.items.every(i=>i.id),message);assert.equal(reply.error,undefined);assert.equal(calls,['ar','fr'].includes(language)?3:2);
 }}finally{globalThis.fetch=previous;}
});
test('incomplete output and malformed JSON are repaired within the same user request',async()=>{
 const previous=globalThis.fetch;
 try{for(const malformed of [false,true]){let calls=0,lastBudget;globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls++;if(calls===1)return Response.json({output:output({allowed:true,language:'arz',priceOnly:false,request:{intent:'recipe',englishRequest:'A vegetable dish',queries:['onions','potatoes']}})});
  if(calls===2){lastBudget=body.max_output_tokens;return malformed?Response.json({output:[{type:'message',content:[{type:'output_text',text:'{"inScope":true,"recipe":'}]}]}):Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[]});}
  if(!malformed)assert.ok(body.max_output_tokens>lastBudget);
  return Response.json({output:output({inScope:true,recipe:{title:'Khodra',servings:2,minutes:20,steps:['2atta3 el khodra w etbokha.'],revisesRecipe:null},items:[{id:null,name:'basal',catalogQuery:'onions',amount:'1 whole',grams:100}],showNutrition:false,answer:''})});
 };
 const reply=await(await worker.fetch(post('bade etbokh khodra'),env)).json();assert.equal(reply.mode,'ai');assert.equal(reply.card.kind,'recipe');assert.equal(calls,3);
 }}finally{globalThis.fetch=previous;}
});
test('alternative-brand tool and catalog facets use the complete shared taxonomy',async()=>{
 const previous=globalThis.fetch;const source=data.products.find(p=>taxonomy.records.get(p.id).productType==='rice'&&taxonomy.alternatives(p.id).length>1);let calls=0;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls++;
  if(calls===1)return Response.json({output:output({allowed:true,language:'en',priceOnly:false})});
  if(calls===2)return Response.json({output:[{type:'function_call',name:'find_alternatives',call_id:'other-brand',arguments:JSON.stringify({productId:source.id,differentBrand:true})}]});
  const found=JSON.parse(body.input.find(x=>x.type==='function_call_output').output)[0].results;assert.ok(found.length);assert.ok(found.every(p=>p.classification.type==='rice'));
  return Response.json({output:output({inScope:true,recipe:null,items:found.slice(0,3).map(p=>({id:p.id,name:p.name.en,amount:null,grams:null,catalogQuery:'rice'})),showNutrition:false,answer:'Here are other brands of the same type of rice.'})});};
 try{const reply=await(await worker.fetch(post('Do you have another brand of that rice?',{history:[{role:'assistant',content:JSON.stringify({kind:'products',items:[[source.id,source.name.en]]})}]}),env)).json();assert.equal(reply.mode,'ai');assert.ok(reply.products.length>0);assert.ok(reply.products.every(p=>p.id!==source.id));}finally{globalThis.fetch=previous;}
 const api=await(await worker.fetch(new Request('https://test.local/api/catalog?facets=1&alternativesFor='+source.id))).json();assert.equal(api.facets.productCount,7666);assert.ok(api.products.length>0);
});
