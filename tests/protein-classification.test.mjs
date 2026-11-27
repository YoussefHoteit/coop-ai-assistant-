import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createInventorySearch} from '../src/inventory-search.mjs';
import {createRecipeInventory} from '../src/recipe-inventory.mjs';
import {createProductDiscovery} from '../src/product-discovery.mjs';
import worker from '../dist/server/index.js';

const source=JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz',import.meta.url))));
const normalize=s=>String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const search=createInventorySearch(source.products,source.categories,normalize),inventory=createRecipeInventory(source.products,search,normalize);
const byId=id=>source.products.find(p=>p.id===id),ids=items=>items.map(p=>p.id).sort(),available=q=>search(q).filter(p=>p.available===true);
const fillets=['132707','163500','5860999'].sort(),raw=['5860999','185952','136033','163500','132707','132709','132708'].sort();
const entry=(query,name=query,id=null)=>({id,name,catalogQuery:query,amount:'600 g',grams:600});
const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
const chat=async(message,history=[])=>await(await worker.fetch(new Request('https://test.local/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,history})}),env)).json();
const output=value=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
function turn(history,message,reply){const summary=reply.typeSelection?{kind:'types',queries:reply.typeSelection.queries}:reply.card?{kind:reply.card.kind,items:reply.card.items.slice(0,12).map(i=>[i.id]),comparisonContext:reply.card.comparisonContext}:null;return [...history,{role:'user',content:message},{role:'assistant',content:(summary?JSON.stringify(summary)+'\n':'')+reply.text}];}

test('all three actual source fillets are raw chicken breasts even without the species in their names',()=>{
  for(const q of ['chicken breast','boneless chicken breast','chicken fillet','whole fillet','fresh whole fillet','poulet filet','صدر دجاج'])assert.deepEqual(ids(available(q)),fillets,q);
  assert.deepEqual(ids(available('chicken breast 500g')),['163500']);
  for(const id of fillets){const m=search.taxonomy.records.get(id);assert.equal(m.productType,'chicken');assert.equal(m.protein.species,'chicken');assert.equal(m.protein.cut,'breast');assert.equal(m.protein.preparation,'raw');assert.ok(m.protein.boneless);}
  for(const q of ['raw chicken','raw chicken cuts','fresh chicken','poulet cru','djej nay'])assert.deepEqual(ids(available(q)),raw,q);
  assert.deepEqual(ids(available('chicken liver')),['161018','186562']);
  assert.deepEqual(ids(available('chicken wings')),['132708','185952']);
  assert.deepEqual(ids(available('chicken legs')),['132709']);
  const all=available('chicken');assert.equal(all.length,73);assert.ok(raw.every(id=>all.some(p=>p.id===id)));assert.ok(all.every(p=>search.taxonomy.records.get(p.id).protein?.species==='chicken'&&['meat','pantry','frozen'].includes(p.category)));
  assert.ok(all.every(p=>!/chick peas|chickpeas|palmito|mushrooms|spice|stock|soup/i.test(p.name.en)));
});

test('raw recipe candidates reject processed products, wrong cuts and sold-out alternatives',()=>{
  for(const q of ['chicken','raw chicken','chicken breast','boneless skinless chicken breast','chicken fillet']){
    const all=inventory.candidates(entry(q),12),selected=inventory.resolve(entry(q),new Set());
    assert.ok(fillets.includes(selected?.id),q);
    assert.deepEqual(ids(all.filter(p=>p.available)),fillets,q);
    for(const wrong of ['132490','209295','132704','131392','131396','136033','132709','161018'])assert.equal(inventory.eligible(entry(q),byId(wrong)),false,`${q} ${wrong}`);
  }
  const wrong=entry('chicken','Chicken Escalope, 1kg','132490');assert.equal(inventory.resolve(wrong,new Set(['132490'])).id,'5860999');
  const sold=entry('chicken breast','Chicken Whole Fillet safa 1kg','167608');assert.ok(fillets.includes(inventory.resolve(sold,new Set(['167608'])).id));
  assert.equal(inventory.resolve(entry('whole chicken'),new Set()).id,'136033');
  assert.equal(inventory.resolve(entry('chicken leg'),new Set()).id,'132709');
  assert.equal(inventory.resolve(entry('chicken escalope'),new Set()).id,'132490');
});

test('type discovery, raw-cut listing and all-product requests use the complete matching set',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('No model required for supported inventory queries');};
  try{
    const question='what types of chicken do you have';const discovery=await chat(question);
    assert.equal(discovery.card,null);assert.equal(discovery.products.length,0);assert.ok(discovery.typeSelection);
    for(const name of ['Raw chicken','Whole chicken','Raw breast / fillet','Raw legs','Raw wings','Marinated','Escalope','Nuggets'])assert.ok(discovery.text.includes(name),name);
    assert.doesNotMatch(discovery.text,/Meat & Chicken/);
    const history=turn([],question,discovery);
    const rawReply=await chat('i want raw chicken',history);assert.deepEqual(ids(rawReply.products),raw);
    const cold=await chat('cold cuts',history);assert.ok(cold.products.length);assert.ok(cold.products.every(p=>search.taxonomy.records.get(p.id).protein.form==='cold-cut'));
    assert.deepEqual(ids((await chat('i want raw chicken',turn(history,'cold cuts',cold))).products),raw);
    for(const q of ['what raw chicken cuts do you have','do you have raw chicken','i want raw chicken'])assert.deepEqual(ids((await chat(q)).products),raw,q);
    for(const q of ['chicken fillet ?','chicken fillet?','chicken breast'])assert.deepEqual(ids((await chat(q,turn(history,'do you have raw chicken',rawReply))).products),fillets,q);
    assert.deepEqual(ids((await chat('chicken fillet ?')).products),fillets);
    const breast=await chat('chicken breast',history);assert.deepEqual(ids(breast.products),fillets);
    const all=await chat('list for me all the chicken that you have',turn(history,'i want raw chicken',rawReply));assert.equal(all.card.listing.total,73);assert.deepEqual(ids(all.products),ids(available('chicken')));
    const cheap=await chat('what is the cheapest option',turn(history,'chicken breast',breast));assert.deepEqual(ids(cheap.products),['5860999']);
  }finally{globalThis.fetch=original;}
});

test('the reported butter-chicken mistake is corrected during recipe resolution, even with a wrong model SKU or query',async()=>{
  const original=globalThis.fetch;
  try{for(const draftQuery of ['chicken','chicken breast','chicken escalope']){
    let calls=0;
    globalThis.fetch=async(_url,options)=>{const request=JSON.parse(options.body);calls++;
      if(request.text.format.name==='shopping_scope')return output({allowed:true,language:'en',priceOnly:false,request:{intent:'recipe',englishRequest:'Butter chicken',queries:['boneless chicken breast','butter','tomato paste']}});
      assert.equal(request.text.format.name,'shopping_reply');
      const planned=JSON.parse(request.input[0].content).serverProductMatches.find(g=>g.query==='boneless chicken breast');
      assert.deepEqual(ids(planned.results),fillets);assert.ok(planned.results.every(p=>p.classification.protein.preparation==='raw'));
      return output({inScope:true,recipe:{title:'Butter chicken',servings:4,minutes:45,steps:['Cut the chicken into cubes, add the marinade and cook in the sauce.'],revisesRecipe:null},items:[{id:'132490',name:'Chicken Escalope, 1kg',catalogQuery:draftQuery,amount:'600 g',grams:600}],answer:'',showNutrition:false});
    };
    const reply=await chat('Give me a butter chicken recipe');assert.equal(reply.card?.kind,'recipe',JSON.stringify(reply));assert.ok(fillets.includes(reply.card.items[0].id),draftQuery);assert.equal(reply.card.items[0].grams,600);assert.equal(reply.card.items[0].id,'5860999');assert.equal(calls,2);
  }}finally{globalThis.fetch=original;}
});

test('shared category, species and preparation rules apply to new products and other proteins',()=>{
  const item=(id,name,category,subcategory,brand='')=>({id,name:{en:name,ar:name},size:{en:'500g',ar:'500g'},price:4,available:true,category,subcategory,brand});
  const fixtures=[item('a','Whole fillet 500g','meat','Chicken'),item('b','Whole wings 500g','meat','Chicken'),item('c','Fillet crispy','meat','Chicken'),item('d','Chicken escalope','meat','Chicken'),item('e','Whole fillet','fish','Fresh Fish'),item('f','Chicken flavored stock','pantry','Soups'),item('g','Chicken cat food','pets','Cat Food'),item('h','Beef mince','meat','Meat'),item('i','Beef burger','frozen','Meat & Chicken'),item('j','Salmon fillet','frozen','Fish & Shrimp'),item('k','Smoked salmon','frozen','Fish & Shrimp'),item('l','Salmon cat food','pets','Cat Food'),item('m','Whole leg','meat','Meat')];
  const lookup=createInventorySearch(fixtures,source.categories,normalize),recipes=createRecipeInventory(fixtures,lookup,normalize);
  assert.deepEqual(ids(lookup('raw chicken')),['a','b']);assert.deepEqual(ids(lookup('chicken fillet')),['a']);assert.deepEqual(ids(lookup('raw beef')),['h']);assert.deepEqual(ids(lookup('raw salmon')),['j']);
  assert.equal(recipes.resolve(entry('salmon'),new Set()).id,'j');assert.equal(recipes.resolve(entry('raw chicken'),new Set()).id,'a');
  assert.equal(recipes.eligible(entry('raw beef'),fixtures[8]),false);
  const discover=createProductDiscovery(lookup.taxonomy,normalize,source.categories);const groups=discover.discover('salmon',lookup('salmon'));assert.ok(groups.some(g=>g.key==='smoked'));assert.ok(groups.some(g=>g.key==='fillet'));assert.ok(!groups.some(g=>g.key.startsWith('aisle ')));
});
