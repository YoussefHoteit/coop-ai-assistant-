import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import { chooseReplyLanguage, recipeIngredientLanguage, recipeReplyUsesCorrectLanguages } from '../public/language.js';
import { packQuantity } from '../public/shopping.js';

const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
const output=value=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const request=async(message,lang='en',history=[]) => (await worker.fetch(new Request('https://demo.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,lang,history})}),env)).json();
const plan=(language,extra={})=>({allowed:true,language,priceOnly:false,request:{intent:'recipe',englishRequest:'A recipe using unsalted butter',queries:['unsalted butter'],servings:4,budgetUsd:null,pricePreference:'standard',servingsOnly:false,lookupKind:'none',comparisonBasis:'pack',clarification:null,...extra}});
const latin=/\p{Script=Latin}/u;

test('mixed Arabic requests retain Arabic and recipe row language differs only for Arabizi',()=>{
  assert.equal(chooseReplyLanguage('بدي اعمل chicken Alfredo لأربعة','fr','en'),'ar');
  assert.deepEqual(['en','ar','arz','fr'].map(recipeIngredientLanguage),['en','ar','en','fr']);
  assert.equal(recipeReplyUsesCorrectLanguages({answer:'هاي الوصفة',recipe:{title:'أرز',steps:['اغسل الأرز','Cook the rice.']},items:[{name:'أرز',amount:'٢٠٠ غ'}]},'ar'),false);
  assert.equal(recipeReplyUsesCorrectLanguages({answer:'هاي الوصفة',recipe:{title:'أرز',steps:['اغسل الأرز']},items:[{name:'White rice',amount:'٢٠٠ غ'}]},'ar'),false);
  assert.equal(recipeReplyUsesCorrectLanguages({answer:'Hayde el wasfe.',recipe:{title:'Rezz',steps:['Ghassel el rezz.']},items:[{name:'Rice',amount:'200 g'}]},'arz'),true);
  assert.equal(recipeReplyUsesCorrectLanguages({answer:'Hayde el wasfe.',recipe:{title:'Rezz',steps:['Ghassel el rezz.']},items:[{name:'Rezz',amount:'2 ma3ale2'}]},'arz'),false);
});

test('unclear Arabic wording gets a specific clarification and its answer can use the earlier context',async()=>{
  const saved=globalThis.fetch;let calls=0;
  globalThis.fetch=async(_url,options)=>{
    calls++;const body=JSON.parse(options.body);
    assert.equal(body.text.format.name,'shopping_scope');
    assert.match(body.instructions,/colloquial food names/);
    if(calls===1)return output(plan('ar',{intent:'clarify',englishRequest:'An ambiguous cooking request',queries:[],clarification:'قصدك أكلة بالرز أو بالبرغل؟'}));
    const input=JSON.parse(body.input);assert.ok(input.earlierMessages.some(msg=>msg.content.includes('بالبرغل')));
    return output(plan('ar',{intent:'products',englishRequest:'Price of bulgur',queries:['bulgur'],lookupKind:'price'}));
  };
  try{
    const first=await request('بدي اعمل شي بالزغنط','ar');
    assert.equal(first.text,'قصدك أكلة بالرز أو بالبرغل؟');assert.equal(first.card,undefined);assert.equal(first.error,undefined);assert.equal(calls,1);
    const second=await request('قصدي البرغل قديش سعره','ar',[{role:'user',content:'بدي اعمل شي بالزغنط'},{role:'assistant',content:first.text}]);
    assert.equal(second.language,'ar');assert.ok(second.products.length);assert.equal(calls,2);
  }finally{globalThis.fetch=saved;}
});

test('Arabic recipe localizes the actual package after premium brand and size selection',async()=>{
  const saved=globalThis.fetch;let repairs=0;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.text.format.name==='shopping_scope')return output(plan('ar',{pricePreference:'premium'}));
    if(body.text.format.name==='shopping_prose'){
      repairs++;const slots=JSON.parse(body.input[0].content).requiredTexts;
      assert.equal(slots[0].key,'name:0');assert.match(slots[0].requiredLanguage,/Arabic using Arabic script/);
      assert.match(slots[0].text,/400g/i);
      return output({texts:slots.map(slot=>({key:slot.key,text:'زبدة غير مملحة بريزيدان ٤٠٠ غ'}))});
    }
    return output({inScope:true,answer:'حضّر هذه الوصفة.',recipe:{title:'وصفة بالزبدة',servings:4,minutes:20,steps:['أضف 50 g من الزبدة.'],revisesRecipe:null},items:[{id:'178830',name:'زبدة أمباسادور غير مملحة',amount:'50 g',grams:50,catalogQuery:'unsalted butter'}],showNutrition:false});
  };
  try{
    const result=await request('بدي وصفة بالزبدة لأربعة بأغلى خيار');
    assert.equal(result.mode,'ai');assert.equal(result.card.kind,'recipe');assert.equal(repairs,1);
    assert.equal(result.products[0].price,5.12);assert.equal(result.card.items[0].id,result.products[0].id);
    assert.equal(result.card.items[0].amount,'50 غ');assert.equal(result.card.items[0].grams,50);
    assert.ok(!latin.test(result.card.items[0].name+result.card.items[0].amount+result.card.steps.join(' ')));
    assert.equal(packQuantity(result.card.items[0],result.products[0]),1);
  }finally{globalThis.fetch=saved;}
});

test('Arabizi recipe instructions keep Arabizi while incorrect ingredient quantities are repaired into English',async()=>{
  const saved=globalThis.fetch;let repairs=0;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.text.format.name==='shopping_scope')return output(plan('arz'));
    if(body.text.format.name==='shopping_prose'){
      repairs++;const slots=JSON.parse(body.input[0].content).requiredTexts;
      for(const slot of slots)assert.match(slot.requiredLanguage,/English/);
      return output({texts:slots.map(slot=>({key:slot.key,text:slot.key.startsWith('amount:')?'2 tablespoons':'Unsalted butter'}))});
    }
    return output({inScope:true,answer:'Hayde el wasfe.',recipe:{title:'Wasfe bel zebde',servings:4,minutes:20,steps:['Dawwib el zebde 3a nar hadye.'],revisesRecipe:null},items:[{id:'178830',name:'Zebde',amount:'2 ma3ale2 kbar',grams:28,catalogQuery:'unsalted butter'}],showNutrition:false});
  };
  try{
    const reply=await request('baddi a3mel wasfe bel zebde');
    assert.equal(reply.mode,'ai');assert.equal(repairs,1);assert.equal(reply.card.steps[0],'Dawwib el zebde 3a nar hadye.');
    assert.equal(reply.card.items[0].name,reply.products[0].name.en);assert.equal(reply.card.items[0].amount,'2 tablespoons');
  }finally{globalThis.fetch=saved;}
});
