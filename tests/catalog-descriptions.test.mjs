import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createInventorySearch} from '../src/inventory-search.mjs';
import worker from '../dist/server/index.js';

const source=JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz',import.meta.url))));
const norm=s=>String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const search=createInventorySearch(source.products,source.categories,norm);
const byId=new Map(source.products.map(p=>[p.id,p]));
const findTitle=(rx,dept)=>source.products.find(p=>p.category===dept&&rx.test(p.name.en));

test('all 7666 records have a grounded description and preserve source data, including all 23 supplier descriptions',()=>{
  assert.equal(search.descriptions.size,7666);
  let supplied=0;
  for(const p of source.products){const profile=search.descriptions.get(p.id);assert.ok(profile.description.trim());
    assert.ok(profile.description.startsWith(p.name.en.replace(/\s+/g,' ').trim().replace(/[.\s]+$/,'')),p.id);
    assert.deepEqual(profile.sourceDescription,p.description);assert.equal(p.nutrition,null);assert.equal(p.allergens,'');
    if(p.description?.en?.trim())supplied++;
    assert.ok(profile.method&&profile.department);assert.equal(p.descriptionSource,undefined);
  }
  assert.equal(supplied,23);
  for(const id of ['5860999','163500','132707'])assert.match(search.descriptions.get(id).description,/raw chicken breast fillet/i);
  assert.doesNotMatch(search.descriptions.get('132490').description,/raw chicken breast/i);
  assert.match(search.descriptions.get('5651655').description,/fettuccine pasta/i);
});

test('description-backed product names recover supplier abbreviations and alternate terms without changing product identity',()=>{
  const examples=[
    ['toothpaste',/Colgate T\/P charcoal/i,'personal-care'],
    ['shower gel',/Cameo S\/G Avocado/i,'personal-care'],
    ['shampoo',/Beesline shp nourishing/i,'personal-care'],
    ['wireless charger',/3 in 1 Wireless Charging Station/i,'electronics'],
    ['car phone charger',/^Car Charger$/i,'electronics'],
    ['trash bags',/Marvel Trash bag/i,'home-care'],
    ['school bag',/BackPack Jar/i,'school'],
    ['vermicelli',/Arbella vermicilli/i,'pantry'],
  ];
  for(const [query,title,department] of examples){const product=findTitle(title,department);assert.ok(product,query);const found=search(query);assert.ok(found.some(p=>p.id===product.id),`${query}: ${product.name.en}`);assert.ok(found.every(p=>p.category===department||query==='shower gel'&&p.category==='baby'||query==='shampoo'&&p.category==='baby'||query==='vermicelli'&&p.category==='organic'),query);}
  assert.equal(search('raw chicken').filter(p=>p.available).length,7);
  assert.equal(search('chicken breast').filter(p=>p.available).length,3);
  assert.ok(search('turkey').every(p=>p.category!=='pets'));
  assert.ok(search('hot dog').every(p=>p.category!=='bakery'));
});

test('the deployed catalog API exposes the enrichment and the exact original supplier text',async()=>{
  const original=byId.get('136133');
  const api=await(await worker.fetch(new Request('https://local.coop.test/api/catalog?ids=136133,5860999'))).json();
  assert.equal(api.products.length,2);
  const supplier=api.products.find(p=>p.id===original.id);assert.deepEqual(supplier.sourceDescription,original.description);
  assert.match(supplier.description.en,/250g/);assert.equal(supplier.descriptionSource,'catalog-derived');
  const chicken=api.products.find(p=>p.id==='5860999');assert.match(chicken.description.en,/raw chicken breast fillet/i);
  for(const p of api.products){const src=byId.get(p.id);assert.equal(p.price,src.price);assert.equal(p.available,src.available);assert.deepEqual(p.name,src.name);assert.equal(p.nutrition,null);assert.equal(p.allergens,'');}
});

test('description aliases give complete direct product listings and provide product detail to the model',async()=>{
  const previous=globalThis.fetch,env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
  const chat=async(message)=>await(await worker.fetch(new Request('https://local.coop.test/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message})}),env)).json();
  try{
    globalThis.fetch=async()=>{throw Error('No provider needed for a direct alias query');};
    const direct=await chat('Do you have wireless chargers?');assert.equal(direct.products.length,2);assert.ok(direct.products.every(p=>p.description.en.includes('Wireless Charging Station')));
    let calls=0;
    globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls++;
      const out=value=>Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
      if(body.text.format.name==='shopping_scope')return out({allowed:true,language:'en',priceOnly:false,request:{intent:'products',queries:['whole fillet'],lookupKind:'none'}});
      const match=JSON.parse(body.input[0].content).serverProductMatches.flatMap(g=>g.results).find(p=>p.id==='5860999');
      assert.match(match.description.en,/raw chicken breast fillet/);assert.equal(match.descriptionSource,'catalog-derived');assert.equal(match.ingredients,'');
      return out({inScope:true,answer:'The 1 kg Poule Dor product is a raw chicken breast fillet.',recipe:null,showNutrition:false,items:[{id:'5860999',name:'Fresh whole fillet poule dor 1kg',catalogQuery:'whole fillet',amount:null,grams:null}]});
    };
    const described=await chat('Describe the Poule Dor whole fillet');assert.equal(described.card?.kind,'products');assert.match(described.text,/raw chicken breast fillet/);assert.equal(calls,2);
  }finally{globalThis.fetch=previous;}
});
