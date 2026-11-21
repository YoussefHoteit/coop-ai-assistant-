import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createInventorySearch} from '../src/inventory-search.mjs';
const data=JSON.parse(gunzipSync(await readFile(new URL('../src/inventory-catalog.json.gz',import.meta.url))));
const normalize=value=>String(value).toLowerCase().normalize('NFKD').replace(/\p{M}|ـ/gu,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const search=createInventorySearch(data.products,data.categories,normalize),taxonomy=search.taxonomy,facets=taxonomy.facets();
const report={snapshotDate:data.snapshotDate,productCount:data.products.length,departmentCount:Object.keys(facets.departments).length,aisleCount:Object.keys(facets.aisles).length,
 familyCount:facets.familyCount,typedProducts:facets.typedProducts,sourceNameProducts:data.products.length-facets.typedProducts,unknownBrandProducts:facets.unbranded,
 departments:Object.entries(facets.departments).map(([id,count])=>({id,name:data.categories[id]?.[0]||id,products:count,available:data.products.filter(p=>p.category===id&&p.available===true).length})),
 aisles:facets.aisles,commonProductFamilies:Object.entries(facets.productTypes).sort((a,b)=>b[1]-a[1]).slice(0,60),
 notes:['Classification adds search metadata only; source inventory facts remain unchanged.','A product may belong to multiple aisles.','Source-name families are conservative fallbacks, not verified semantic equivalences.','Unknown brand, form and dietary information is not invented.','Search uses all 7,666 records; only matching records are sent to the model.']};
const output=new URL('../docs/',import.meta.url);await mkdir(output,{recursive:true});await writeFile(new URL('inventory-analysis.json',output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({products:report.productCount,departments:report.departmentCount,aisles:report.aisleCount,families:report.familyCount,typed:report.typedProducts,sourceName:report.sourceNameProducts,unknownBrand:report.unknownBrandProducts}));
