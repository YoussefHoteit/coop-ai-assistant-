import {packQuantity,basketSummary,measurement,productMeasurement,purchaseAmount}from'../public/shopping.js';

export function conditionalPrice(product) {
  return /\b(?:free|gift)\b.{0,80}\b(?:order|spend|purchase|above|over)\b/i.test((product?.name.en||'')+' '+(product?.description?.en||''));
}

export function rankedPrices(products,basis='pack',preference='cheapest') {
  const rows=[];
  const units={kg:['weight',1000],g100:['weight',100],litre:['volume',1000],ml100:['volume',100],piece:['pieces',1]};
  for(const product of products){
    if(product.available!==true||!Number.isFinite(product.price)||conditionalPrice(product))continue;
    const pack=productMeasurement(product);
    const unit=units[basis];
    if(unit&&(!pack||pack.kind!==unit[0]))continue;
    rows.push({product,value:unit?product.price*unit[1]/pack.value:product.price});
  }
  const direction=preference==='premium'?-1:1;
  return rows.sort((a,b)=>direction*(a.value-b.value)||a.product.price-b.product.price||a.product.name.en.localeCompare(b.product.name.en));
}

export function optimizeRecipeBudget(entries,resolved,inventory,budget,requirements={}) {
  const conditional=conditionalPrice;
  const bounded=Number.isFinite(budget)&&budget>0;
  const preference=requirements.pricePreference||'standard';
  // Group repeated ingredients exactly as the shopping list does.
  const summary=products=>{
    const grouped=new Map();
    entries.forEach((entry,index)=>{
      const product=products[index];
      const id=product?.id||'missing:'+index;
      if(!grouped.has(id))grouped.set(id,{id,contributions:{}});
      grouped.get(id).contributions[index]=product?purchaseAmount(entry,product):entry.amount||'1 pack';
    });
    return basketSummary([...grouped.values()],new Map(products.filter(Boolean).map(p=>[p.id,p])));
  };
  const original=summary(resolved);
  if(requirements.allergy||preference==='standard'&&(!bounded||original.total<=budget&&!resolved.some(conditional)))return{products:resolved,summary:original};
  const choices=resolved.map((current,index)=>{
    if(!current||current.available!==true)return [current];
    const meta=inventory.taxonomy.records.get(current.id),entry=entries[index];
    const query=entry.catalogQuery||entry.name,info=inventory.taxonomy.queryInfo(query);
    const lockedBrand=requirements.preserveBrands||requirements.brands?.includes(meta.brandKey);
    if(lockedBrand&&!meta.brandKey)return [current];
    const basicQuery=!lockedBrand&&info.brands.length&&info.types.length?[info.types[0],...info.attributes,...info.qualifiers].join(' '):query;
    const clean={...entry,catalogQuery:basicQuery,name:basicQuery};
    const pack=productMeasurement(current);
    const requiredSize=pack&&[...(requirements.text||'').matchAll(/\d+(?:\.\d+)?\s*(?:kg|gr|g|ml|cl|l)\b/gi)].some(m=>{const size=measurement(m[0]);return size?.kind===pack.kind&&size.value===pack.value;});
    const candidates=[...new Map([current,...inventory.products.filter(p=>inventory.taxonomy.records.get(p.id)?.familyKey===meta.familyKey)].map(p=>[p.id,p])).values()].filter(p=>{
      const other=inventory.taxonomy.records.get(p.id);
      const size=productMeasurement(p);
      return !conditional(p)&&p.available===true&&Number.isFinite(p.price)&&inventory.eligible(clean,p)&&other.familyKey===meta.familyKey&&
        (!requiredSize||size?.kind===pack.kind&&size.value===pack.value)&&
        (!lockedBrand||other.brandKey===meta.brandKey)&&meta.attributes.every(a=>other.attributes.includes(a))&&
        [...meta.qualifiers,...(requirements.qualifiers||[])].every(q=>other.qualifiers.includes(q))&&(!meta.storage||!other.storage||meta.storage===other.storage)&&
        // Do not compare a known pack size with an unknown/incompatible one.
        (!pack||size?.kind===pack.kind);
    });
    const cost=p=>Math.round(p.price*100)*packQuantity(entry,p);
    return candidates.length?candidates.sort((a,b)=>cost(a)-cost(b)||a.price-b.price):[current];
  });
  const optimized=choices.map(list=>preference==='premium'&&!bounded?list.at(-1):list[0]);
  if(preference==='premium'&&bounded){
    // Start with the affordable basket, then choose the highest-cost eligible
    // alternatives that fit the remaining spending limit.
    for(let index=0;index<choices.length;index++){
      const previous=optimized[index];
      for(const candidate of [...choices[index]].reverse()){
        optimized[index]=candidate;
        if(summary(optimized).total<=budget)break;
        optimized[index]=previous;
      }
    }
  }
  const final=summary(optimized);final.unpriced+=optimized.filter(conditional).length;
  return{products:optimized,summary:final};
}

export function recipeBudgetText(summary,budget,language,allergy=false) {
  const locale=language==='ar'?'ar-LB':language==='fr'?'fr-FR':'en-US';
  const money=n=>new Intl.NumberFormat(locale,{style:'currency',currency:'USD'}).format(n);
  const total=money(summary.total),limit=money(budget),fits=summary.total<=budget;
  if(summary.uncertain)return {en:`The estimated shopping total is ${total}. Check the quantities for items with unclear pack sizes.`,ar:`المجموع التقديري للمشتريات ${total}. تأكد من كميات المنتجات التي لا يتضح حجم عبواتها.`,arz:`El majmou3 el ta2ribe ${total}. T2akkad men el kammiyet lal products li 7ajmon mish wade7.`,fr:`Le total estimé est de ${total}. Vérifiez les quantités lorsque le format des articles est incertain.`}[language];
  if(!Number.isFinite(budget)&&!summary.unpriced)return {en:`Estimated shopping total: ${total}.`,ar:`المجموع التقديري للمشتريات ${total}.`,arz:`El majmou3 el ta2ribe lal shopping ${total}.`,fr:`Total estimé des courses : ${total}.`}[language];
  const caution=allergy?{en:'Check each product label for your allergen; I cannot guarantee allergen-free status without confirmed labeling.',ar:'تحقق من ملصق كل منتج بخصوص مسببات حساسيتك؛ لا أستطيع ضمان خلوه منها دون معلومات مؤكدة.',arz:'T2akkad men label kel product la 7asasiyetak; ma fine 2adman eno khali men el allergen bala ma3loumet m2akkade.',fr:'Vérifiez chaque étiquette pour votre allergène ; je ne peux pas garantir son absence sans informations confirmées.'}[language]:'';
  if(summary.unpriced)return{en:'Some item prices are missing, so I cannot confirm a complete total yet.',ar:'بعض أسعار المنتجات غير متوفرة، لذلك لا أستطيع تأكيد المجموع الكامل الآن.',arz:'Fi as3ar na2sa, fa ma fine 2akked el majmou3 el kemel halla2.',fr:'Certains prix manquent, je ne peux donc pas confirmer le total complet.'}[language];
  const answer={
    en:fits?`Buying the listed items comes to about ${total}, within your ${limit} budget.`:`Buying the listed items comes to about ${total}, above your ${limit} budget. We can adjust the meal to spend less.`,
    ar:fits?`شراء المنتجات المدرجة يكلف تقريباً ${total}، ضمن ميزانيتك البالغة ${limit}.`:`شراء المنتجات المدرجة يكلف تقريباً ${total}، أكثر من ميزانيتك البالغة ${limit}. يمكننا تعديل الوجبة لتقليل التكلفة.`,
    arz:fits?`Kel el products bel list byetla3o ta2riban ${total}, ta7t el budget taba3ak ${limit}.`:`Kel el products bel list byetla3o ta2riban ${total}, aktar men el budget ${limit}. Fina n3addel el akle la nofre2 bel se3er.`,
    fr:fits?`L'achat des articles proposés revient à environ ${total}, dans votre budget de ${limit}.`:`L'achat des articles proposés revient à environ ${total}, au-dessus de votre budget de ${limit}. Nous pouvons adapter le repas pour réduire le coût.`,
  }[language];
  return[answer,caution].filter(Boolean).join(' ');
}
