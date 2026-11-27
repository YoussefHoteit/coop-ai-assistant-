// Export and audit the exact enriched product records served by the built API.
// The imported retailer archive remains immutable, so refreshes cannot lose
// original label text or source facts. Run `npm run enrich` after an import.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const source=JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz',import.meta.url))));
const products=[];
for(let offset=0;offset<source.productCount;offset+=100){
  const response=await worker.fetch(new Request(`https://local.coop.test/api/catalog?offset=${offset}&limit=100`));
  assert.equal(response.status,200);const page=await response.json();
  assert.equal(page.catalogTotal,source.productCount);products.push(...page.products);
}
assert.equal(products.length,source.productCount);
assert.equal(new Set(products.map(p=>p.id)).size,source.productCount);
const originals=new Map(source.products.map(p=>[p.id,p]));
const methods={},departments={};let supplierCount=0,identityCount=0;
for(const p of products){
  const original=originals.get(p.id);assert.ok(original,p.id);
  const {imageUrl,description,sourceDescription,descriptionSource,descriptionIdentity,descriptionMethod,...facts}=p;
  assert.deepEqual({...facts,description:sourceDescription},original,`Changed original facts: ${p.id}`);
  assert.equal(descriptionSource,'catalog-derived');assert.ok(description.en?.trim(),p.id);
  assert.ok(description.en.startsWith(original.name.en.replace(/\s+/g,' ').trim().replace(/[.\s]+$/,'')),p.id);
  methods[descriptionMethod]=(methods[descriptionMethod]||0)+1;
  departments[p.category]??={products:0,withDescriptions:0,withSpecificIdentity:0};
  departments[p.category].products++;departments[p.category].withDescriptions++;
  if(descriptionIdentity){identityCount++;departments[p.category].withSpecificIdentity++;}
  if(sourceDescription?.en?.trim()||sourceDescription?.ar?.trim())supplierCount++;
}
const report={source:source.source,snapshotDate:source.snapshotDate,sourceSha256:source.sourceSha256,productCount:source.productCount,descriptionCount:products.length,uniqueIds:products.length,missingDescriptions:0,originalSupplierDescriptionsPreserved:supplierCount,sourceFactsUnchanged:true,specificIdentityCount:identityCount,methods,departments,notes:['Descriptions are derived from each individual source title, listed category, brand, unit, supplier text and evidence-based product identity.','Broad source aisles and ambiguous names are retained without guessing more specific details.','The descriptions are not new manufacturer label data; ingredients, nutrition and allergens remain unchanged.']};
const dest=new URL('../dist/',import.meta.url);await mkdir(dest,{recursive:true});
await writeFile(new URL('inventory-catalog-enriched.json.gz',dest),gzipSync(JSON.stringify({...source,descriptionAudit:report,products}),{mtime:0}));
const heading=['Product ID','SKU','Product name','Brand','Size','Department','Categories','Price (USD)','Availability','Enriched description','Specific identity','Description evidence','Original supplier description','Product URL'];
const escape=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
const rows=products.map(p=>[p.id,p.sku,p.name.en,p.brand,p.size.en,p.department,p.subcategory,p.price,p.available===true?'Available':p.available===false?'Sold out':'Unknown',p.description.en,p.descriptionIdentity,p.descriptionMethod,p.sourceDescription?.en,p.sourceUrl]);
await writeFile(new URL('COOP_Enriched_Product_Catalog.csv',dest),'\uFEFF'+[heading,...rows].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n','utf8');
await writeFile(new URL('../docs/inventory-description-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({products:report.productCount,descriptions:report.descriptionCount,specificIdentity:identityCount,supplierDescriptionsPreserved:supplierCount,methods,sourceFactsUnchanged:true}));
