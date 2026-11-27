// Species, cut, and preparation are independent of the supplier's display name.
// A source aisle may identify an otherwise unnamed cut; a mixed aisle alone may not.
export function createProteinClassification(products, normalize) {
  const norm=value=>normalize(String(value||'')).replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/\s+/g,' ').trim();
  const speciesRules=[
    ['chicken',/\b(?:chicken|chickens|chocken|chick|poulet|poule|farouj|farrouj|djej|jaj|tawook|tawouk)\b|دجاج|فروج|فراخ|طاووق/],
    ['turkey',/\b(?:turkey|dinde|habash|7abash)\b|حبش|ديك رومي/],
    ['beef',/\b(?:beef|boeuf|cow|biftek|entrecote)\b|لحم بقر/],
    ['lamb',/\b(?:lamb|sheep|mutton|agneau|mouton)\b|غنم|خاروف/],
    ['salmon',/\b(?:salmon|saumon)\b|سلمون/],
    ['shrimp',/\b(?:shrimp|prawn|prawns|crevette|crevettes)\b|روبيان|جمبري/],
  ];
  const cuts=[
    ['breast',/\b(?:breasts?|fillets?|filets?|poitrine|pechuga|sader|sadr|msahhab|msa7ab)\b|صدر|صدور|مسحب/],
    ['leg',/\b(?:legs?|cuisses?)\b|فخذ|فخاد|فخذان|ورك/],
    ['thigh',/\b(?:thighs?)\b/],['wing',/\b(?:wings?|ailes?)\b|جوانح/],
    ['drumstick',/\b(?:drumsticks?|pilons?)\b|دبوس/],
    ['offal',/\b(?:liver|gizzards?|hearts?|foie|abats)\b|سودة|كبدة|كبد|قلوب/],
    ['minced',/\b(?:minced|ground|hach[eé])\b|مفروم/],
    ['whole-bird',/\b(?:whole\s+(?:chicken|bird|turkey)|(?:chicken|turkey)\s+whole|farouj|farrouj|poulet entier)\b|فروج كامل|دجاجة كاملة/],
  ];
  const preparations=[
    ['escalope',/\bescall?opes?\b|اسكالوب|إسكالوب/],
    ['cordon-bleu',/\bcordon bleu\b/],['nuggets',/\bnuggets?\b|ناغتس/],
    ['burger',/\bburgers?\b|برغر|برجر/],['sausage',/\b(?:sausages?|soudjouk|sujuk|hot ?dogs?|frankfurters?|h d)\b|نقانق|سجق/],
    ['smoked',/\b(?:smoked|fume|fumee)\b|مدخن/],['cold-cut',/\b(?:mortadell?a|martdella|mrtd|mrrtd|luncheon|l m|salami|cold cuts?)\b|مرتديلا/],
    ['breaded',/\b(?:breaded|battered|crispy|crunchy|zinger|tempura|pane|pan[eé]e)\b|كرسبي|مقرمش/],
    ['marinated',/\b(?:marinated|marinade|fajita|shawarma|sauce|tawook|tawouk|seasoned)\b|متبل|مع صلصة|طاووق/],
    ['prepared',/\b(?:cooked|grilled|roasted|pops|rings|biscuits|snackers|match day box|spring rolls)\b|مطبوخ|مشوي/],
    ['tender-strip',/\b(?:tenders?|strips?)\b/],
  ];
  const explicitSpecies=text=>speciesRules.filter(([,rx])=>rx.test(text)).map(([name])=>name);
  const labels=p=>new Set(String(p.subcategory||'').split(',').map(norm));
  const brand=p=>norm(p.brand).replace(/\.$/,'');
  const proteinAisle=p=>{const a=labels(p);return p.category==='meat'&&(a.has('chicken')||a.has('meat')||a.has('cold cuts'))||p.category==='frozen'&&(a.has('meat chicken')||a.has('meat and chicken')||a.has('fish shrimp'))||p.category==='fish'||p.category==='pantry'&&a.has('cans jars');};
  // Learn supplier-specific poultry context from the catalog itself. Generic
  // supplier labels and brands sold for more than one species are not evidence.
  const brandSpecies=new Map();
  const mixedFrozen=p=>p.category==='frozen'&&(labels(p).has('meat chicken')||labels(p).has('meat and chicken'));
  for(const p of products){
    if(!mixedFrozen(p)||!brand(p)||/^(?:produce|fresh|meat|food)$/.test(brand(p)))continue;
    const named=explicitSpecies(norm(p.name.en));
    if(!brandSpecies.has(brand(p)))brandSpecies.set(brand(p),new Set());
    named.forEach(s=>brandSpecies.get(brand(p)).add(s));
  }
  const rawWords=/\b(?:raw|fresh|plain|unbreaded|unmarinated|uncooked|cru|crue|frais|fraiche|nature|niy|nay|freshly)\b|نيء|نيئ|ني\b|طازج|طازجة|غير متبل/;
  const bonelessWords=/\b(?:boneless|deboned|desosse|desossee|msahhab|msa7ab)\b|مسحب|بدون عظم/;
  const exclusion=/\b(?:soup|stock|broth|seasoning|spice|flavou?r|pizza|sandwich|noodles?|chick peas|chickpeas|meat puffs)\b/;
  const weight=text=>{const m=/\b(\d+(?:\.\d+)?)\s*(kg|gr|g)\b/.exec(text);return m?Number(m[1])*(m[2]==='kg'?1000:1):null;};
  function cutOf(text,species){const cut=cuts.find(([,rx])=>rx.test(text))?.[0]||null;return cut==='breast'&&species&&!['chicken','turkey'].includes(species)?'fillet':cut;}
  function formOf(text){return preparations.find(([,rx])=>rx.test(text))?.[0]||null;}
  function classify(p){
    if(!proteinAisle(p))return null;
    const name=norm(p.name.en), a=labels(p), named=explicitSpecies(name);
    if(exclusion.test(name)||named.length>1)return null;
    const namedCut=cutOf(name), form=formOf(name), exclusiveChicken=p.category==='meat'&&a.has('chicken');
    const learned=brandSpecies.get(brand(p));
    const species=named[0]||(exclusiveChicken&&(namedCut||form)?'chicken':null)||
      (mixedFrozen(p)&&learned?.size===1&&(namedCut||form)?[...learned][0]:null);
    if(!species)return null;
    const cut=cutOf(name,species);
    const cold=a.has('cold cuts'), canned=p.category==='pantry';
    const storage=p.category==='frozen'||/\b(?:frozen|frz)\b/.test(name)?'frozen':canned?'shelf-stable':p.category==='meat'||p.category==='fish'?'fresh':null;
    // Frozen strips/tenders without evidence of plain meat are not verified raw.
    // In a fresh source aisle, the named unprepared cuts are raw by merchandising context.
    const preparation=cold||canned?'processed':form&&form!=='tender-strip'?'prepared':form==='tender-strip'&&!rawWords.test(name)?'unknown':(cut||rawWords.test(name)||p.category==='meat'&&a.has('meat'))?'raw':'unknown';
    return {species,cut,form:cold?(form||'cold-cut'):canned?(form||'canned'):form,preparation,storage,packWeight:weight(norm(p.size?.en||'')),
      boneless:bonelessWords.test(name)||cut==='breast'&&preparation==='raw'&&/\b(?:fillets?|filets?)\b/.test(name),
      bundle:/\b(?:free|bundle)\b/.test(name)&&/\b(?:plus|and|free)\b/.test(name)};
  }
  function query(value){
    const text=norm(value), named=explicitSpecies(text);
    if(named.length>1||exclusion.test(text))return null;
    // Whole fillet is a source naming convention for the Chicken aisle, not
    // an unrestricted search for anything called a fillet (fish or beef).
    const implicit=!named.length&&/\bwhole fillets?\b/.test(text);
    const species=named[0]||(implicit?'chicken':null);if(!species)return null;
    const cut=cutOf(text,species), form=formOf(text), boneless=bonelessWords.test(text);
    const raw=!form&&(rawWords.test(text)||species==='chicken'&&(Boolean(cut)||boneless));
    const storage=/\b(?:fresh|frais|fraiche)\b|طازج/.test(text)?'fresh':/\bfrozen\b|مجمد/.test(text)?'frozen':null;
    // Metadata-only queries can be answered comprehensively without literal
    // name tokens; retain any unknown modifiers as real lexical constraints.
    let remainder=text;
    remainder=remainder.replace(/\b\d+(?:\.\d+)?\s*(?:kg|gr|g)\b/g,' ');
    for(const[,rx]of [...speciesRules,...cuts,...preparations])remainder=remainder.replace(rx,' ');
    remainder=remainder.replace(rawWords,' ').replace(bonelessWords,' ').replace(/\b(?:raw|fresh|frozen|plain|whole|cuts?|meat|pieces?|breast|boneless|skinless|chunks?|cubes?|diced|sliced|chopped|all|available|de|du|des|viande|nature|poulets)\b/g,' ').replace(/قطع|لحمة|لحم|ني|طازج|طازجة|مجمد|دجاج|فروج/g,' ').replace(/\s+/g,' ').trim();
    const unsupported=/\b(?:skinless|with skin|skin on|skin off|without skin)\b/.test(text);
    return {species,cut,form,raw,boneless,storage,packWeight:weight(text),metadataOnly:!remainder&&!unsupported,unsupported};
  }
  function compatible(info,meta){
    if(!info)return true;
    if(!meta||meta.species!==info.species)return false;
    if(info.raw&&meta.preparation!=='raw')return false;
    if(info.raw&&!info.cut&&meta.cut==='offal')return false;
    if(info.cut&&meta.cut!==info.cut)return false;
    if(info.boneless&&!meta.boneless)return false;
    if(info.form&&meta.form!==info.form)return false;
    if(info.storage&&meta.storage!==info.storage)return false;
    if(info.packWeight&&info.packWeight!==meta.packWeight)return false;
    return true;
  }
  return {classify,query,compatible};
}
