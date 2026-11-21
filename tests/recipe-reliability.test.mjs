import test from 'node:test';
import assert from 'node:assert/strict';
import { repairCustomerProse,recipeAvailabilityProse,normalizeArabiziRemainders } from '../src/reply-repair.mjs';
import { replyUsesCorrectScript } from '../public/language.js';
import {detectReplyLanguage,chooseReplyLanguage}from'../public/language.js';
import { mentionsInternalData } from '../public/customer-copy.js';
import worker from '../dist/server/index.js';
const output=value=>[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}];
const post=(message,extra={})=>new Request('https://test.local/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({message,...extra})});
const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
const decision=(language='en',request={intent:'other',englishRequest:'Shopping question',queries:[]})=>({allowed:true,language,priceOnly:false,request});
const answer=text=>({inScope:true,recipe:null,items:[],answer:text,showNutrition:false});
async function replyFor(message,extra={}){const r=await worker.fetch(post(message,extra),env);const events=(await r.text()).trim().split('\n').map(JSON.parse);return events.at(-1).reply;}

test('a language-only repair keeps all recipe identities, quantities, servings and step order',async()=>{
 const original={inScope:true,answer:'Here is your recipe.',recipe:{title:'مجدرة',servings:4,minutes:50,steps:['اغسل العدس','Cook the rice.'],revisesRecipe:'existing-recipe'},items:[{id:'61612',name:'عدس',catalogQuery:'lentils',amount:'200 g',grams:200}],showNutrition:false};
 const before=structuredClone(original);
 const values={answer:'Hayde el wasfe.',title:'Mjadra','step:0':'Ghassel el 3adas.','step:1':'Etbokh el rezz.','name:0':'3adas','amount:0':'200 g'};
 const result=await repairCustomerProse(original,'arz',async body=>{
  assert.equal(body.text.format.name,'shopping_prose');assert.equal(body.tools,undefined);
  assert.ok(JSON.stringify(body).length<6000);return {texts:JSON.parse(body.input[0].content).requiredTexts.map(({key})=>({key,text:values[key]}))};
 },value=>replyUsesCorrectScript(value,'arz')&&!mentionsInternalData(value));
 assert.deepEqual(original,before);assert.equal(result.items[0].id,original.items[0].id);assert.equal(result.items[0].catalogQuery,'lentils');assert.equal(result.items[0].grams,200);assert.equal(result.items[0].amount,'200 g');assert.equal(result.recipe.servings,4);assert.equal(result.recipe.revisesRecipe,'existing-recipe');assert.deepEqual(result.recipe.steps,['Ghassel el 3adas.','Etbokh el rezz.']);
});

test('invalid repair keys and changed numeric quantities are rejected within the same request',async()=>{
 const original={...answer('Hello'),items:[{id:'x',name:'Rice',amount:'200 g',grams:200}]};let calls=0;
 const result=await repairCustomerProse(original,'en',async()=>({texts:[{key:'answer',text:'Hello'},{key:'name:0',text:'Rice'},{key:'amount:0',text:++calls===1?'20 g':'200 g'}]}),()=>true);
 assert.equal(calls,2);assert.equal(result.items[0].amount,'200 g');
 await assert.rejects(repairCustomerProse(original,'en',async()=>({texts:[{key:'answer',text:'One'},{key:'answer',text:'Two'},{key:'answer',text:'Three'}]}),()=>true),e=>e.code==='repair_keys');
});

test('Arabizi sound numerals are not mistaken for food quantities during text repair',async()=>{
 const original={...answer('Recipe'),items:[{id:'salt',name:'ملح',amount:'حسب الذوق',grams:null},{id:'oil',name:'زيت',amount:'2 mal3a2a kbar',grams:28}]};
 const texts=[{key:'answer',text:'Hayde el wasfe.'},{key:'name:0',text:'Mal7'},{key:'amount:0',text:'3a zaw2ak'},{key:'name:1',text:'Zeit'},{key:'amount:1',text:'2 ma3ale2 kbar'}];
 const result=await repairCustomerProse(original,'arz',async body=>({texts:JSON.parse(body.input[0].content).requiredTexts.map(({key})=>texts.find(row=>row.key===key))}),value=>replyUsesCorrectScript(value,'arz'));
 assert.equal(result.items[0].amount,'3a zaw2ak');assert.equal(result.items[1].amount,'2 mal3a2a kbar');assert.equal(result.items[1].grams,28);
});

test('an English sentence inside an Arabizi amount is repaired instead of being left outside the repair slots',async()=>{
 const original={...answer('Hayde el wasfe.'),items:[{id:'water',name:'Mayy',catalogQuery:'water',amount:'1 L to make the soup',grams:1000}]};
 const result=await repairCustomerProse(original,'arz',async body=>{const slots=JSON.parse(body.input[0].content).requiredTexts;assert.deepEqual(slots.map(s=>s.key),['amount:0']);return{texts:[{key:'amount:0',text:'1 L lal shorbe'}]};},value=>replyUsesCorrectScript(value,'arz'));
 assert.equal(result.items[0].amount,'1 L lal shorbe');assert.equal(result.items[0].grams,1000);
});

test('the first recipe request avoids serial lookup calls and ingredient names cannot become seasoning types',async()=>{
 const previous=fetch;let calls=0;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls++;
  if(body.text.format.name==='shopping_scope')return Response.json({output:output(decision('en',{intent:'recipe',englishRequest:'Chicken recipe',queries:['chicken']}))});
  assert.equal(body.tool_choice,'none');
  return Response.json({output:output({inScope:true,recipe:{title:'Chicken',servings:2,minutes:20,steps:['Cook the chicken.'],revisesRecipe:null},items:[{id:null,name:'Chicken Escalope, 1kg',catalogQuery:'chicken',amount:'200 g',grams:200}],answer:'',showNutrition:false})});
 };
 try{const reply=await replyFor('Help me cook chicken');assert.equal(reply.mode,'ai');assert.equal(reply.card.items[0].id,'132490');assert.equal(calls,2);assert.equal(reply.products[0].available,true);}finally{globalThis.fetch=previous;}
});

test('unlisted ingredient varieties remain distinct and planning receives clearly marked available alternatives',async()=>{
 const previous=fetch;let related=false;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);
  if(body.text.format.name==='shopping_scope')return Response.json({output:output(decision('en',{intent:'recipe',englishRequest:'A yellow lentil dish',queries:['yellow lentils']}))});
  if(body.text.format.name==='recipe_product_matching')return Response.json({output:output({matches:[]})});
  const data=JSON.parse(body.input[0].content);related=data.serverProductMatches.some(g=>g.relatedVarietiesOnly&&g.results.length);
  return Response.json({output:output({inScope:true,recipe:{title:'Lentils',servings:2,minutes:20,steps:['Cook the lentils.'],revisesRecipe:null},items:[{id:'58866',name:'Yellow lentils',catalogQuery:'yellow lentils',amount:'200 g',grams:200}],answer:'',showNutrition:false})});
 };
 try{const reply=await replyFor('I specifically need yellow lentils for this recipe');assert.equal(reply.mode,'ai');assert.equal(related,true);assert.equal(reply.card.items[0].id,null,'Red lentils must not silently become yellow lentils');}finally{globalThis.fetch=previous;}
});

test('completed provider streams without a final blank line are accepted without repeating the request',async()=>{
 const previous=fetch;let calls=0;
 globalThis.fetch=async()=>{
  if(++calls===1)return Response.json({output:output(decision())});
  return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:output(answer('Hello.'))}}),{headers:{'Content-Type':'text/event-stream'}});
 };
 try{assert.equal((await replyFor('Hello')).text,'Hello.');assert.equal(calls,2);}finally{globalThis.fetch=previous;}
});

test('temporary provider rate errors recover internally but credentials and exhausted quota do not loop',async()=>{
 const previous=fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;if(calls===1)return Response.json({error:{code:'rate_limit_exceeded'}},{status:429,headers:{'retry-after':'0'}});return Response.json({output:output(calls===2?decision():answer('Hello.'))});};
  assert.equal((await replyFor('Hello')).text,'Hello.');assert.equal(calls,3);
  for(const [status,code]of[[401,'invalid_api_key'],[429,'insufficient_quota']]){calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:{code}},{status});};const reply=await replyFor('Hello');assert.equal(reply.error,true);assert.equal(reply.errorCode,'provider_http_'+status);assert.match(reply.requestId,/^[\da-f-]{36}$/);assert.equal(calls,1);}
 }finally{globalThis.fetch=previous;}
});

test('well-formed structured output survives an incomplete status and malformed recipe shapes are repaired',async()=>{
 const previous=fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;if(calls===1)return Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:output(decision())});return Response.json({output:output(calls===2?{...answer('Hello'),recipe:{title:'Bad shape',servings:2,steps:'wrong'}}:answer('Hello.'))});};
 try{assert.equal((await replyFor('Hello')).text,'Hello.');assert.equal(calls,3);}finally{globalThis.fetch=previous;}
});

test('product fallback cannot replace an allergen warning or informational answer with a generic product list',async()=>{
 const previous=fetch;let calls=0;
 globalThis.fetch=async()=>{if(++calls===1)return Response.json({output:output(decision('en',{intent:'products',englishRequest:'Can you guarantee peanut-free chocolate?',queries:['chocolate']}))});return Response.json({output:output(answer('We cannot guarantee this without checking the product label and manufacturer allergen information.'))});};
 try{const reply=await replyFor('Can you guarantee the chocolate products are completely peanut-free?');assert.equal(reply.mode,'ai');assert.match(reply.text,/cannot guarantee/);assert.equal(reply.card,null);assert.equal(calls,2);}finally{globalThis.fetch=previous;}
});

test('post-match recipe prose cannot contradict verified stock and retains genuine label or variety warnings',()=>{
 const warning='Ma fi ta2kid iza l mele7, l felefel w l mayy mawjoudeen.';
 assert.doesNotMatch(recipeAvailabilityProse(warning,'arz',true),/ta2kid/);
 assert.equal(recipeAvailabilityProse(warning,'arz',false),warning);
 const variety='El 3adas el motawaffir howwe 3adas 7abbet kamle, mesh m2akkad eno nafs no3 el 3adas el asmar.';
 assert.equal(recipeAvailabilityProse(variety,'arz',true),variety);
 const allergy='We could not find allergen label information, so we cannot guarantee peanut safety.';
 assert.equal(recipeAvailabilityProse(allergy,'en',true),allergy);
 assert.doesNotMatch(recipeAvailabilityProse('We could not find the salt.','en',true),/could not find/);
});

test('English request wording takes precedence over a numeral inside a foreign dish name',()=>{
 for(const message of ['Help me cook shorbet 3adas safra','Give me a recipe for mlo5iye','Show me a recipe for 3adas'])assert.equal(detectReplyLanguage(message,'arz'),'en');
 assert.equal(chooseReplyLanguage('Help me cook shorbet 3adas safra','arz','arz'),'en');
 assert.equal(detectReplyLanguage('Help me cook مجدرة','ar'),'en');
 assert.equal(detectReplyLanguage('Je voudrais faire ملوخية','ar'),'fr');
 for(const message of ['baddi a3mel shorbet 3adas safra','bade 2e3mal mjadra'])assert.equal(detectReplyLanguage(message,'en'),'arz');
});

test('small Arabic-script remainders in Arabizi do not discard an otherwise valid recipe',()=>{
 const input={...answer('Hayde el wasfe.'),recipe:{title:'Shorbe',servings:4,steps:['Khalliha 3a نار hadiye la testawe mni7.']},items:[{id:'x',name:'Mal7',amount:'2 رشة',grams:1}]};
 const fixed=normalizeArabiziRemainders(input);
 assert.equal(replyUsesCorrectScript(fixed,'arz'),true);assert.match(fixed.recipe.steps[0],/nar/);assert.equal(fixed.items[0].amount,'2 rshe');assert.equal(fixed.items[0].grams,1);
 const arabic=answer('اغسل الخضار جيداً ثم قطّعها وأضفها إلى الطنجرة.');assert.equal(normalizeArabiziRemainders(arabic).answer,arabic.answer,'Full Arabic sentences must go through real translation');
});

test('an unconstrained recipe can revise an unmatched form using an available product of the same food family',async()=>{
 const previous=fetch;let revisions=0;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);
  if(body.text.format.name==='shopping_scope')return Response.json({output:output(decision('en',{intent:'recipe',englishRequest:'A chicken meal',queries:['chicken breast']}))});
  if(body.text.format.name==='recipe_product_matching')return Response.json({output:output({matches:[]})});
  const revision=JSON.parse(body.input[0].content).serverRecipeRevision;
  if(revision){revisions++;assert.equal(body.tool_choice,'none');assert.equal(revision.unmatched[0].requiredFamily,'chicken');assert.ok(revision.unmatched[0].choices.every(p=>p.available));}
  return Response.json({output:output({inScope:true,recipe:{title:'Chicken meal',servings:2,minutes:30,steps:[revision?'Remove the bones from the whole chicken, then cook its meat.':'Cook the chicken breast.'],revisesRecipe:null},items:[{id:revision?'136033':null,name:revision?'Whole chicken':'Chicken breast',catalogQuery:revision?'whole chicken':'chicken breast',amount:'500 g',grams:500}],answer:revision?'Use boneless meat from a whole chicken for this version.':'',showNutrition:false})});
 };
 try{const result=await replyFor('Help me cook a chicken meal');assert.equal(result.mode,'ai');assert.equal(result.card.items[0].id,'136033',JSON.stringify({revisions,result}));assert.match(result.card.steps[0],/Remove the bones/);assert.equal(revisions,1);}finally{globalThis.fetch=previous;}
});

test('explicit ingredient forms and dietary constraints are never relaxed to fill a recipe card',async()=>{
 const previous=fetch;let revisions=0;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);
  if(body.text.format.name==='shopping_scope')return Response.json({output:output(decision('en',{intent:'recipe',englishRequest:'Use chicken breast only',queries:['chicken breast']}))});
  if(body.text.format.name==='recipe_product_matching')return Response.json({output:output({matches:[]})});
  if(JSON.parse(body.input[0].content).serverRecipeRevision)revisions++;
  return Response.json({output:output({inScope:true,recipe:{title:'Chicken',servings:2,minutes:20,steps:['Cook the breast.'],revisesRecipe:null},items:[{id:null,name:'Chicken breast',catalogQuery:'chicken breast',amount:'500 g',grams:500}],answer:'',showNutrition:false})});
 };
 try{for(const message of ['Use chicken breast only, no other cuts','I have a peanut allergy and need a chicken meal']){const result=await replyFor(message);assert.equal(result.mode,'ai');assert.equal(result.card.items[0].id,null);assert.equal(revisions,0);}}finally{globalThis.fetch=previous;}
});

test('clear recipe plans recover an unnecessary follow-up or mistaken refusal within the first request',async()=>{
 const previous=fetch;
 try{for(const refuse of [false,true]){let calls=0;globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls++;
  if(calls===1)return Response.json({output:output(decision('en',{intent:'recipe',englishRequest:'Prepare a rice dish',queries:['rice']}))});
  if(calls===2)return Response.json({output:output({...answer(refuse?'':'How many people?'),inScope:!refuse})});
  assert.match(body.input.at(-1).content,/four servings/);
  return Response.json({output:output({inScope:true,recipe:{title:'Rice',servings:4,minutes:20,steps:['Cook the rice.'],revisesRecipe:null},items:[{id:null,name:'Rice',catalogQuery:'rice',amount:'200 g',grams:200}],answer:'',showNutrition:false})});
 };
 const result=await replyFor('Help me cook rice');assert.equal(result.mode,'ai');assert.equal(result.card.servings,4);assert.ok(result.card.items[0].id);assert.equal(calls,3);}}
 finally{globalThis.fetch=previous;}
});
