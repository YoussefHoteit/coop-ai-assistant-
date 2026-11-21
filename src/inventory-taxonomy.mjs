// Search metadata only. Original names, IDs, prices, stock and label facts remain authoritative.
export function createProductTaxonomy(products, categoryLabels = {}, normalize) {
  const foodDepartments = new Set(['pantry','produce','frozen','dairy','meat','fish','bakery','organic','ready','snacks','beverages','coffee-tea']);
  const defs = [];
  const define = (type, aliases, departments, exclude = '') => defs.push({type,aliases:aliases.split('|').map(normalize).filter(Boolean),departments:departments.split(','),exclude:exclude && new RegExp(exclude)});
  const staples='pantry,organic';
  define('lentils','lentils|lentil|lentilles|adass|adas|3adas|عدس',staples,'soup|chips|flour');
  define('chickpeas','chickpeas|chickpea|pois chiches|hommos hab|حمص حب|7ommos',staples,'soup|chips|flour|tahini');
  define('beans','beans|haricot|fassoulia|fasolia|فاصوليا',staples,'soup|coffee|cacao|cocoa|green bean');
  define('fava beans','fava|broad beans|foul|foul medammas|فول',staples,'soup|chips');
  define('rice','rice|riz|rezz|rez|أرز|ارز|رز',staples,'chips|cake|flour|pudding|marinade|spice|mix');
  define('bulgur','bulgur|burghol|borghol|boulgour|برغل',staples);
  define('freekeh','freekeh|freekah|frikeh|فريكة',staples);
  define('quinoa','quinoa|كينوا',staples);
  define('oats','oats|oat|avoine|شوفان',staples,'milk|bar|biscuit|cookie|drink');
  define('semolina','semolina|semoule|semid|سميد',staples);
  define('flour','flour|farine|طحين|دقيق',staples,'biscuit|cookie|taco|wrap|pasta');
  define('sugar','sugar|sucre|سكر',staples,'free|biscuit|cookie|candy|chocolate|syrup');
  define('tahini','tahini|tahina|طحينة',staples,'halawa|halva');
  define('olive oil','olive oil|huile olive|huile d olive|زيت زيتون|zeit zaytoun',staples,'tuna|sardine|sauce|pesto');
  define('vegetable oil','vegetable oil|sunflower oil|corn oil|huile tournesol|زيت نباتي|زيت ذرة|زيت دوار الشمس',staples,'tuna|sardine|sauce');
  define('pasta','pasta|pates|spaghetti|penne|fusilli|macaroni|fettuccine|fettucine|fettucini|tagliatelle|linguine|farfalle|lasagne|lasagna|مكرونة|معكرونة',staples,'sauce|pesto|instant|cup|soup');
  define('tomato paste','tomato paste|concentre de tomate|معجون طماطم|رب بندورة',staples);
  define('baking powder','baking powder|levure chimique|بيكنج باودر|باكينغ باودر',staples);
  define('yeast','yeast|levure|خميرة',staples,'baking powder');
  define('vinegar','vinegar|vinaigre|خل',staples,'chips|crisps|pickle');
  const spices=[
    ['coriander','coriander|coriandre|cilantro|كزبرة|كزبره|kezbara|kesbara|kosbara'],['cumin','cumin|كمون|kammoun'],
    ['cinnamon','cinnamon|cannelle|korfa|قرفة'],['paprika','paprika|بابريكا'],['sumac','sumac|sumak|سماق|somma2'],
    ['black pepper','black pepper|poivre noir|فلفل اسود|بهار اسود'],['white pepper','white pepper|poivre blanc|فلفل ابيض'],
    ['salt','salt|sel|ملح|mele7'],['turmeric','turmeric|curcuma|كركم'],['ginger','ginger|gingembre|زنجبيل'],
    ['allspice','allspice|بهار حلو'],['seven spices','seven spices|7 spices|سبع بهارات'],['nutmeg','nutmeg|muscade|جوزة الطيب'],
    ['cardamom','cardamom|cardamome|هال|هيل'],['cloves','clove|cloves|girofle|قرنفل'],['oregano','oregano|اوريغانو'],
    ['thyme','thyme|thym|زعتر'],['basil','basil|basilic|ريحان'],['rosemary','rosemary|romarin|اكليل الجبل'],
    ['bay leaves','bay leaf|bay leaves|laurier|ورق غار'],['chili','chili|chilli|piment|شطة'],['sesame','sesame|سمسم'],
  ];
  for(const [type,aliases] of spices)define(type,aliases,'pantry,organic','chips|crisps|cracker|biscuit|cookie|candy|chocolate|sauce|soup|noodle|pasta|rice cake|peanut|pickle');
  const produce=[['parsley','parsley|persil|بقدونس'],['mint','mint|menthe|نعناع'],['coriander','coriander|cilantro|coriandre|كزبرة'],
    ['onions','onion|onions|oignon|oignons|بصل|basal'],['garlic','garlic|ail|ثوم|توم|toum'],['tomatoes','tomato|tomatoes|tomate|طماطم|بندورة'],
    ['potatoes','potato|potatoes|pomme de terre|pommes de terre|بطاطا'],['spinach','spinach|epinard|سبانخ'],
    ['lettuce','lettuce|laitue|خس'],['cucumber','cucumber|concombre|خيار'],['carrot','carrot|carrots|carotte|جزر'],
    ['lemon','lemon|lemons|citron|ليمون|حامض'],['mushrooms','mushroom|mushrooms|champignon|فطر'],['eggplant','eggplant|aubergine|باذنجان'],
    ['zucchini','zucchini|courgette|كوسا'],['peas','peas|petits pois|بازيلا'],['corn','corn|mais|ذرة'],['broccoli','broccoli|brocoli|بروكلي'],['cauliflower','cauliflower|chou fleur|قرنبيط']];
  for(const[type,aliases]of produce)define(type,aliases,'produce,frozen','juice|sauce|soup|chips|fries|chicken|burger|nugget|pizza');
  define('milk','milk|lait|حليب|7alib','dairy','powder|poudre|chocolate|strawberry|coconut|almond|condens|evapor|sweetened|soya|soy |oat |rice ');
  define('condensed milk','condensed milk|lait concentre|حليب مكثف','dairy');
  define('plant milk','almond milk|soy milk|soya milk|oat milk|coconut milk|lait amande|حليب لوز','organic,beverages,dairy');
  define('milk powder','milk powder|powder milk|lait poudre|حليب بودرة','dairy,baby');
  define('butter','butter|beurre|زبدة','dairy','peanut|cocoa|cookie|biscuit|buttermilk');
  define('cream','cream|creme|كريمة','dairy','cheese|dessert|yogurt|milk|caramel|vanill');
  define('cheese','cheese|fromage|mozzarella|parmesan|parmigiano|reggiano|feta|fetta|halloumi|kashkaval|cheddar|جبنة|جبن','dairy');
  define('yogurt','yogurt|yoghurt|yaourt|لبن','dairy');define('labneh','labneh|labne|لبنة','dairy');define('eggs','eggs|egg|oeuf|بيض','dairy');
  define('chicken','chicken|poulet|دجاج|فروج','meat,frozen','sausage|mortadella|burger|nugget|ring|liver|soup|pizza');
  define('beef','beef|boeuf|لحم بقر','meat,frozen','sausage|mortadella|burger|soup');
  define('lamb','lamb|sheep|agneau|غنم','meat');define('shrimp','shrimp|crevette|روبيان|قريدس','fish,frozen');
  for(const[type,aliases,departments]of[
    ['bread','bread|pain|خبز','bakery'],['shampoo','shampoo|shampoing|شامبو','personal-care,baby'],['toothpaste','toothpaste|dentifrice|معجون اسنان','personal-care'],
    ['deodorant','deodorant|antiperspirant|مزيل عرق','personal-care'],['laundry detergent','laundry|lessive|detergent|مسحوق غسيل','home-care'],
    ['dishwashing liquid','dishwash|dishwashing|liquide vaisselle|سائل جلي','home-care'],['diapers','diaper|diapers|حفاضات','baby'],
    ['socks','socks|sock|chaussettes|جوارب','seasonal'],['car charger','car charger|car adapter|chargeur voiture|شاحن سيارة','electronics'],
    ['pencil','pencil|pencils|crayon|قلم رصاص','school'],['pen','pen|pens|stylo|قلم حبر','school'],['notebook','notebook|notebk|cahier|دفتر','school'],
    ['backpack','backpack|school bag|cartable|حقيبة مدرسة','school'],['eraser','eraser|gomme|ممحاة','school'],['ruler','ruler|ruller|regle|مسطرة','school'],
  ])define(type,aliases,departments);
  const aisleTypes=[
    ['Chocolates','chocolate','snacks,organic,seasonal'],['Wafers & Biscuits','biscuits and wafers','snacks,organic'],['Chips & Crackers','chips and crackers','snacks,organic'],['Gums & Candies','candy','snacks'],['Nuts & Kernels','nuts','snacks,produce'],['Cakes & Croissant','cakes and pastries','snacks,bakery'],['Pop Corn','popcorn','snacks'],
    ['Cheese','cheese','dairy'],['yogurts','yogurt','dairy'],['Labneh','labneh','dairy'],['Eggs','eggs','dairy'],['Powder Milk','milk powder','dairy'],
    ['Water','water','beverages'],['Sparkling & Flavored Water','sparkling water','beverages'],['Juices','juice','beverages'],['Soft Drinks','soft drink','beverages'],['Energy & Sport Drinks','energy and sports drink','beverages'],['Iced Coffee & Tea','iced tea and coffee','beverages'],['Powder Drinks','powdered drink','beverages'],['Concentrated Drinks','drink concentrate','beverages'],['Non Alcoholic Drinks','nonalcoholic drink','beverages'],
    ['Instant Coffee','instant coffee','coffee-tea'],['Lebanese Coffee','ground coffee','coffee-tea'],['Tea & Infusion','tea','coffee-tea'],
    ['Shampoo','shampoo','personal-care'],['Conditioners','conditioner','personal-care'],['Deodorants&perfumes','deodorant and fragrance','personal-care'],['Tooth care','dental care','personal-care'],['Bar Soap','bar soap','personal-care'],['Liquid Handwash','handwash','personal-care'],['Bath & Body Wash','body wash','personal-care,baby'],['Skin Care','skin care','personal-care'],['Body Care','body care','personal-care'],['Hair Coloration','hair color','personal-care'],['Hair Styling','hair styling','personal-care'],["Women's Care",'feminine care','personal-care'],["Men's Care",'mens grooming','personal-care'],['Cotton','cotton','personal-care'],['Wipes & Sanitizers','wipes and sanitizer','personal-care,baby'],['Diapers','diapers','baby'],['baby bath & wash','baby wash','baby'],
    ['Surface & Floor Cleaning','floor and surface cleaner','home-care'],['Liquid Laundry Detergents','liquid laundry detergent','home-care'],['Powder Laundry Detergents','powder laundry detergent','home-care'],['Fabric Softner','fabric softener','home-care'],['Dishwashing','dishwashing detergent','home-care'],['Bathroom Cleaning','bathroom cleaner','home-care'],['Disinfectant','disinfectant','home-care'],['Insecticides','insecticide','home-care'],['Tissues & Napkins','tissues and napkins','home-care'],['Kitchen & Toilet Rolls','paper rolls','home-care'],['Batteries','batteries','home-care'],['Disposables','disposables','home-care'],
    ['Cat Food','cat food','pets'],['Dog Food','dog food','pets'],['Pet accessories','pet accessories','pets'],['Cigarettes','cigarettes','tobacco'],['Heated Tobacoo','heated tobacco','tobacco'],['Molasses','tobacco molasses','tobacco'],
    ['Bread','bread','bakery'],['Kaak & Toast','kaak and toast','bakery'],['Sandwiches','sandwich','ready'],['Salads','prepared salad','ready'],['Mezza','prepared mezza','ready'],
  ];
  for(const[,type,departments]of aisleTypes)if(!defs.some(d=>d.type===type))define(type,type,departments);
  const whole = (text,term)=>(' '+text+' ').includes(' '+term+' ');
  const qualifiers=[['gluten-free',/gluten free|sans gluten|\bgf\b/],['lactose-free',/lactose free|sans lactose/],['vegan',/\bvegan\b/],['unsalted',/unsalt|beurre doux/],['organic',/\borganic\b|\bbio\b/]];
  const attributes=[['red',/\bred\b|\bahmar\b|احمر/],['brown',/\bbrown\b|\basmar\b|اسمر/],['green',/\bgreen\b|اخضر/],['white',/\bwhite\b|\babyad\b|ابيض/],
    ['split',/\bsplit\b|majrou|مجروش/],['whole',/\bwhole\b|\barid\b|عريض/],['ground',/\bground\b|moulu|powder|مطحون/],['leaves',/\bleaves?\b|اوراق/],
    ['basmati',/\bbasmati\b/],['long-grain',/long grain/],['short-grain',/short grain/],['coarse',/coarse|khechen|خشن/],['fine',/\bfine\b|naem|ناعم/],
    ...['fettuccine','spaghetti','penne','fusilli','macaroni','tagliatelle','lasagna','linguine','farfalle','parmesan','mozzarella','cheddar','feta','halloumi','kashkaval'].map(t=>[t,new RegExp(t==='fettuccine'?'fett?ucc?in[ei]':t==='lasagna'?'lasagn[ae]':t==='feta'?'fett?a':t==='parmesan'?'parmesan|parmigiano|reggiano':t)])];
  attributes.push(['yellow',/\byellow\b|\bjaune\b|\bsafra\b|\basfar\b|اصفر|صفراء/]);
  attributes.push(['breast',/\bbreasts?\b|\bpoitrine\b|صدر|\bsader\b|\bsadr\b/]);
  for(const flavor of ['orange','apple','lemon','strawberry','vanilla','mint','coconut','almond','peach','pineapple','cherry'])attributes.push([flavor,new RegExp('\\b'+flavor+'\\b')]);
  attributes.push(['full-fat',/full fat|full cream|whole milk/],['low-fat',/low fat|semi skim/],['skimmed',/skimmed|zero fat|\b0\s*%/]);
  const departments=new Set(Object.keys(categoryLabels));
  const brands=[...new Set(products.map(p=>normalize(p.brand||'')).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const classifyName=(text,keys)=>defs.filter(d=>d.departments.some(k=>keys.includes(k))&&(!d.exclude||!d.exclude.test(text))&&d.aliases.some(t=>whole(text,t)))
    .sort((a,b)=>Math.max(...b.aliases.filter(t=>whole(text,t)).map(t=>t.length))-Math.max(...a.aliases.filter(t=>whole(text,t)).map(t=>t.length)))[0];
  const records=new Map();
  for(const product of products){
    const name=normalize(product.name.en), keys=[product.category,...(product.additionalCategories||[])];
    let definition=classifyName(name,keys)||(
      keys.includes('pantry')&&/pasta.*noodle/i.test(product.subcategory||'')&&!/sauce|pesto|instant|soup|cup|noodle|funghi/.test(name)?defs.find(d=>d.type==='pasta'):null);
    let confidence=definition?'type-rule':'source-name';
    if(!definition){const leaf=aisleTypes.find(([label,,depts])=>depts.split(',').some(k=>keys.includes(k))&&(product.subcategory||'').split(',').some(s=>normalize(s)===normalize(label)));if(leaf){definition=defs.find(d=>d.type===leaf[1]);confidence='aisle-rule';}}
    const brand=normalize(product.brand||'')||brands.find(b=>name.startsWith(b+' '))||'';
    const aisleLabels=[...new Set((product.subcategory||'').split(',').map(x=>x.trim()).filter(x=>x&&!Object.values(categoryLabels).some(labels=>labels.includes(x))&&!/offer|promotion|christmas|buy.*win|\$|back to school/i.test(x)))].sort();
    const generic=name.replace(brand&&name.startsWith(brand+' ')?brand:'\0','').replace(/\b\d+(?:\.\d+)?\s*(?:kg|gr|g|ml|cl|l|lb|oz|pcs|packs?)\b/g,' ').replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();
    const productType=definition?.type||generic||name;
    const spice=keys.includes('pantry')&&/herbs.*spices/i.test(product.subcategory||'');
    const dryGrain=keys.some(k=>['pantry','organic'].includes(k))&&/rice|grains.*seeds/i.test(product.subcategory||'')&&!/canned|can |jar /i.test(name);
    const storage=/frozen|\bfrz\b/.test(name)||keys.includes('frozen')?'frozen':/\bdry\b|\bdried\b/.test(name)||spice||dryGrain?'dry':keys.includes('produce')?'fresh':null;
    const attrs=attributes.filter(([,rx])=>rx.test(name)).map(([tag])=>tag);
    const dietary=qualifiers.filter(([,rx])=>rx.test(name)).map(([tag])=>tag);
    const familyKey=(foodDepartments.has(product.category)?'food:':'retail:')+productType;
    records.set(product.id,{department:product.category,aisles:aisleLabels,productType,familyKey,variantKey:[familyKey,brand,...attrs,...dietary].join('|'),brand:product.brand||brand||null,
      brandKey:brand||null,storage,attributes:attrs,qualifiers:dietary,size:product.size.en,confidence,searchTerms:definition?.aliases||[],edible:foodDepartments.has(product.category)});
  }
  // Learn unambiguous raw-ingredient terms and spelling variants from the retailer's own names.
  // These groups contain no recipes or hand-picked dish routes.
  const learned=new Map();
  for(const product of products){
    const meta=records.get(product.id);
    const raw=product.category==='produce'||product.category==='frozen'&&/vegetables.*fruits/i.test(product.subcategory||'')||product.category==='pantry'&&/grains.*seeds|herbs.*spices/i.test(product.subcategory||'');
    if(!raw||meta.confidence!=='source-name')continue;
    const core=meta.productType.replace(/\b(?:fresh|green|red|white|brown|dry|dried|frozen|frz|veg|chopped|sliced|diced|whole|ground|leaves|leaf|pcs|bag|pack)\b/g,' ').replace(/\s+/g,' ').trim();
    if(!core||core.length<3||core.split(' ').length>3)continue;
    // Seasoning labels must not introduce competing aliases for an existing food type.
    if(defs.some(def=>def.aliases.some(alias=>whole(core,alias))))continue;
    const key=/^[a-z]{5,}$/.test(core)?core.replace(/[aeiouy]/g,'').replace(/h$/,''):core;
    if(!learned.has(key))learned.set(key,{type:core,aliases:new Set(),ids:[]});
    const group=learned.get(key);group.aliases.add(core);if(core.endsWith('s')&&!core.endsWith('ss'))group.aliases.add(core.slice(0,-1));group.ids.push(product.id);
  }
  for(const group of learned.values()){
    const departments=[...new Set(group.ids.map(id=>records.get(id).department))];
    defs.push({type:group.type,aliases:[...group.aliases],departments,exclude:''});
    for(const id of group.ids){const m=records.get(id);m.productType=group.type;m.familyKey='food:'+group.type;m.variantKey=[m.familyKey,m.brandKey,...m.attributes,...m.qualifiers].join('|');m.searchTerms=[...group.aliases];m.confidence='source-term';}
  }
  const queryCache=new Map();
  function queryInfo(query){
    const text=normalize(query);
    if(queryCache.has(text))return queryCache.get(text);
    const types=defs.filter(d=>d.aliases.some(t=>whole(text,t))).map(d=>d.type);
    const longest=defs.flatMap(d=>d.aliases.filter(t=>whole(text,t)).map(t=>({type:d.type,length:t.length}))).sort((a,b)=>b.length-a.length)[0];
    const attrs=attributes.filter(([,rx])=>rx.test(text)).map(([tag])=>tag);
    const requestedBrands=brands.filter(b=>b.length>=3&&!['fresh','organic','produce','frozen','rice','milk','chicken','cream','cheese','water','meat','bakery','coffee','tea','food','happy'].includes(b)&&whole(text,b));
    let residue=text;
    const matchedAliases=defs.filter(d=>d.type===longest?.type).flatMap(d=>d.aliases).filter(a=>whole(text,a)).sort((a,b)=>b.length-a.length);
    for(const alias of [...requestedBrands,...matchedAliases]) residue=(' '+residue+' ').replace(' '+alias+' ',' ').trim();
    residue=residue.replace(/\b(?:and|or|ou|the|a|an|of|for|about|plain|regular|all purpose|wheat|white|brown|red|green|black|fresh|frozen|dry|dried|ground|whole|split|chopped|finely|roughly|diced|sliced|peeled|grated|minced|freshly|seeds?|leaves|powder|to taste|gluten free|lactose free|unsalted|organic|vegan|basmati|long grain|short grain|coarse|fine|cooking|heavy|whipping|g|kg|ml|l)\b|\d+/g,'').replace(/\s+/g,'').trim();
    residue=residue.replace(/ناشفه|ناشف|مجفف|جاف|مطحون|طازج|مفروم|مقطع|كامل|احمر|اخضر|ابيض|اسمر|\b(?:secs?|seche|seches|moulu|moulue|entier|entiere|frais|fraiche|rouge|vert|blanc)\b|او/g,'').trim();
    residue=residue.replace(/^(?:yellow|jaune|safra|asfar|اصفر|صفراء|breasts?|poitrine|صدر|sader|sadr)$/,'');
    const aliasSafe=!residue;
    const info={text,types:[...new Set(aliasSafe?(longest?[longest.type]:types):[])],attributes:attrs,qualifiers:qualifiers.filter(([,rx])=>rx.test(text)).map(([tag])=>tag),brands:requestedBrands,storage:/\bdry\b|\bdried\b|ناشف|ناشفه|مجفف/.test(text)?'dry':/frozen|مجمد/.test(text)?'frozen':/\bfresh\b|طازج/.test(text)?'fresh':null,
      aliases:aliasSafe?defs.filter(d=>d.type===longest?.type).flatMap(d=>d.aliases):[]};
    if(queryCache.size>=512)queryCache.delete(queryCache.keys().next().value);
    queryCache.set(text,info);return info;
  }
  const opposite={red:['brown','green','white'],brown:['red','white'],green:['red','white'],white:['red','brown','green'],split:['whole'],whole:['split'],ground:['leaves'],leaves:['ground'],coarse:['fine'],fine:['coarse'],'full-fat':['low-fat','skimmed'],'low-fat':['full-fat','skimmed'],skimmed:['full-fat','low-fat']};
  opposite.yellow=['red','brown','green','white'];
  for(const color of opposite.yellow)opposite[color].push('yellow');
  function compatible(query,product){
    const info=typeof query==='string'?queryInfo(query):query, meta=records.get(product.id);
    if(!meta)return false;
    if(info.types.length&&!info.types.includes(meta.productType))return false;
    if(info.brands?.length&&!info.brands.includes(meta.brandKey)&&!info.brands.some(b=>whole(normalize(product.name.en),b)))return false;
    if(info.storage&&meta.storage&&info.storage!==meta.storage)return false;
    if(info.qualifiers.some(q=>!meta.qualifiers.includes(q)))return false;
    for(const a of info.attributes){
      // Alternatives in an ingredient phrase (e.g. brown or green) are not simultaneous requirements.
      const alternatives=/\bor\b|\bou\b|او/.test(info.text)&&['yellow','red','brown','green','white'].includes(a);
      if(alternatives){if(meta.attributes.some(x=>['yellow','red','brown','green','white'].includes(x))&&!info.attributes.some(x=>meta.attributes.includes(x)))return false;}
      else if((opposite[a]||[]).some(x=>meta.attributes.includes(x)))return false;
    }
    const shapes=['fettuccine','spaghetti','penne','fusilli','macaroni','tagliatelle','lasagna','linguine','farfalle'];
    const cheeses=['parmesan','mozzarella','cheddar','feta','halloumi','kashkaval'];
    if(info.attributes.includes('breast')&&!meta.attributes.includes('breast'))return false;
    for(const group of [shapes,cheeses])if(info.attributes.some(x=>group.includes(x))&&!info.attributes.filter(x=>group.includes(x)).some(x=>meta.attributes.includes(x)))return false;
    return true;
  }
  function alternatives(id,{differentBrand=true,limit=8}={}){
    const original=records.get(id);if(!original)return[];
    return products.filter(p=>p.id!==id&&records.get(p.id)?.familyKey===original.familyKey).filter(p=>{
      const m=records.get(p.id);
      if(differentBrand&&(!original.brandKey||!m.brandKey||m.brandKey===original.brandKey))return false;
      if(!differentBrand&&original.brandKey&&m.brandKey!==original.brandKey)return false;
      if(!differentBrand&&normalize(m.size)===normalize(original.size))return false;
      return original.qualifiers.every(q=>m.qualifiers.includes(q))&&original.attributes.every(a=>m.attributes.includes(a))&&(!original.storage||m.storage===original.storage);
    }).sort((a,b)=>Number(b.available===true)-Number(a.available===true)||(a.price??Infinity)-(b.price??Infinity)).slice(0,Math.min(30,limit));
  }
  const families=new Map();for(const [id,m]of records){if(!families.has(m.familyKey))families.set(m.familyKey,[]);families.get(m.familyKey).push(id);}
  function facets(){
    const count=field=>[...records.values()].reduce((a,m)=>{for(const value of Array.isArray(m[field])?m[field]:[m[field]])if(value)a[value]=(a[value]||0)+1;return a;},{});
    return {productCount:records.size,departments:count('department'),aisles:count('aisles'),productTypes:count('productType'),familyCount:families.size,
      typedProducts:[...records.values()].filter(m=>m.confidence!=='source-name').length,unbranded:[...records.values()].filter(m=>!m.brandKey).length};
  }
  return{records,queryInfo,compatible,alternatives,facets};
}
