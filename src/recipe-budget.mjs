import {packQuantity,basketSummary,measurement}from'../public/shopping.js';

export function optimizeRecipeBudget(entries,resolved,inventory,budget,requirements={}) {
  const conditional=p=>/\b(?:free|gift)\b.{0,80}\b(?:order|spend|purchase|above|over)\b/i.test((p?.name.en||'')+' '+(p?.description?.en||''));
  const summary=products=>basketSummary(entries.map((entry,index)=>({...entry,id:products[index]?.id||'missing:'+index})),new Map(products.filter(Boolean).map(p=>[p.id,p])));
  const original=summary(resolved);
  if(!Number.isFinite(budget)||budget<=0||requirements.allergy||original.total<=budget&&!resolved.some(conditional))return{products:resolved,summary:original};
  const optimized=resolved.map((current,index)=>{
    if(!current||current.available!==true)return current;
    const meta=inventory.taxonomy.records.get(current.id),entry=entries[index];
    const query=entry.catalogQuery||entry.name,info=inventory.taxonomy.queryInfo(query);
    const lockedBrand=requirements.preserveBrands||requirements.brands?.includes(meta.brandKey);
    if(lockedBrand&&!meta.brandKey)return current;
    const basicQuery=!lockedBrand&&info.brands.length&&info.types.length?[info.types[0],...info.attributes,...info.qualifiers].join(' '):query;
    const clean={...entry,catalogQuery:basicQuery,name:basicQuery};
    const pack=measurement(current.size?.en);
    const requiredSize=pack&&[...(requirements.text||'').matchAll(/\d+(?:\.\d+)?\s*(?:kg|gr|g|ml|cl|l)\b/gi)].some(m=>{const size=measurement(m[0]);return size?.kind===pack.kind&&size.value===pack.value;});
    const candidates=[current,...inventory.candidates(clean,100)].filter(p=>{
      const other=inventory.taxonomy.records.get(p.id);
      const size=measurement(p.size?.en);
      return !conditional(p)&&p.available===true&&Number.isFinite(p.price)&&inventory.eligible(clean,p)&&other.familyKey===meta.familyKey&&
        (!requiredSize||size?.kind===pack.kind&&size.value===pack.value)&&
        (!lockedBrand||other.brandKey===meta.brandKey)&&meta.attributes.every(a=>other.attributes.includes(a))&&
        [...meta.qualifiers,...(requirements.qualifiers||[])].every(q=>other.qualifiers.includes(q))&&(!meta.storage||!other.storage||meta.storage===other.storage);
    });
    const cost=p=>Math.round(p.price*100)*packQuantity(entry,p);
    return candidates.sort((a,b)=>cost(a)-cost(b))[0]||current;
  });
  const final=summary(optimized);final.unpriced+=optimized.filter(conditional).length;
  return{products:optimized,summary:final};
}

export function recipeBudgetText(summary,budget,language,allergy=false) {
  const locale=language==='ar'?'ar-LB':language==='fr'?'fr-FR':'en-US';
  const money=n=>new Intl.NumberFormat(locale,{style:'currency',currency:'USD'}).format(n);
  const total=money(summary.total),limit=money(budget),fits=summary.total<=budget;
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
