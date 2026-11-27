// Discovery facets describe product types, not individual SKUs. A facet is only
// offered when at least one of its matching inventory records is available.
// Selection uses the same facet predicate and complete parent inventory again.
export function createProductDiscovery(taxonomy, normalize, categoryLabels) {
  const norm=value=>normalize(String(value||'')).replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/\s+/g,' ').trim();
  const rule=(labels,pattern,aliases='',tag=null,filter=null)=>({key:norm(labels[0]),labels,aliases:aliases.split('|').filter(Boolean),matches:(p,m)=>((tag&&m.attributes.includes(tag))||pattern?.test(norm(p.name.en)))&&(!filter||filter(p,m))});
  const r=rule;
  const rawMeat=(p,m)=>!m.aisles.includes('Cold Cuts');
  const rules={
    cheese:[
      r(['Akkawi','عكاوي','Akkawi','Akkawi'],/\bakk?awi\b/,'akawi|akkawi cheese','akkawi'),
      r(['Mozzarella','موزاريلا','Mozzarella','Mozzarella'],/\bmozz?arell?a\b/,'mozarella|mozarela|mozzarela|mozzarella cheese|موزاريلا','mozzarella'),
      r(['Halloumi','حلّوم','Halloum','Halloumi'],/\bhall?oum(?:i)?\b/,'halloum|haloum|halloumi cheese','halloumi'),
      r(['Feta','فيتا','Feta','Feta'],/\bfett?a\b/,'fetta|feta cheese','feta'),
      r(['Cheddar','شيدر','Cheddar','Cheddar'],/\bcheddar\b/,'cheddar cheese','cheddar'),
      r(['Kashkaval','قشقوان','Kashkawan','Kashkaval'],/\bkashk(?:aval|awan|400gr|400|)\b/,'kashkawan|kashkaval cheese','kashkaval'),
      r(['Emmental','إمنتال','Emmental','Emmental'],/\bemm?enthal?\b|\bemmental\b|\bemental\b/,'emmental cheese|emental','emmental'),
      r(['Gouda','غودا','Gouda','Gouda'],/\bgouda\b/,'gouda cheese','gouda'),
      r(['Edam','إيدام','Edam','Edam'],/\bedam\b/,'edam cheese','edam'),
      r(['Brie','بري','Brie','Brie'],/\bbrie\b/,'brie cheese','brie'),
      r(['Camembert','كامامبير','Camembert','Camembert'],/\bcamembert\b/,'camembert cheese','camembert'),
      r(['Parmesan','بارميزان','Parmesan','Parmesan'],/\b(?:parmesan|parmigiano|reggiano)\b/,'permisan|parmigiano|parmesan cheese','parmesan'),
      r(['Ricotta','ريكوتا','Ricotta','Ricotta'],/\bricotta\b/,'ricotta cheese','ricotta'),
      r(['Mascarpone','ماسكاربوني','Mascarpone','Mascarpone'],/\bmascarpone\b/,'mascarpone cheese','mascarpone'),
      r(['Bulgarian cheese','جبنة بلغارية','Jebne bulgariye','Fromage bulgare'],/\bbulgar(?:ian|ie)\b/,'bulgarian|bulgarie','bulgarian'),
      r(['Nabulsi','نابلسية','Naboulsiye','Nabulsi'],/\bnabulsi|nabulsieh\b/,'nabulsi cheese|nabulsieh','nabulsi'),
      r(['Shanklish','شنكليش','Shanklish','Chanklich'],/\b(?:shanklish|shankleesh|chanklish)\b/,'chanklish|shanklish cheese','shanklish'),
      r(['Cream cheese','جبنة كريمية','Jebne cream','Fromage à tartiner'],/cream cheese|double cream|philadelphia|cheese spread/,'double cream|creamcheese|spreadable cheese','creamcheese'),
      r(['String cheese','جبنة شلل','Jebne shlelel','Fromage filé'],/\b(?:shilal|string cheese)\b/,'shilal'),
      r(['Danish white cheese','جبنة بيضاء دنماركية','Jebne bayda danmarkiye','Fromage blanc danois'],/danish white/,'danish white'),
      r(['Havarti','هافارتي','Havarti','Havarti'],/\bhavarti\b/),r(['Maasdam','ماسدام','Maasdam','Maasdam'],/\bmaasdam\b/),
      r(['Cheese triangles and portions','جبنة مثلثات وحصص','Jebne mosallaset w 7osas','Fromage en portions et triangles'],/triangles?|\b\d+\s*(?:p|port|portions?)\b/,'triangles|portions|cheese triangles'),
      r(['Processed cheese','جبنة مصنّعة','Jebne msanna3a','Fromage fondu'],/\bproc?cessed\b|\bproccessed\b|cheese squares?/,'processed'),
      r(['Pizza cheese blends','خلطات جبنة للبيتزا','Khletet jebne lal pizza','Mélanges de fromage pour pizza'],/pizza\s*top|mexican (?:mix|cheese)|tex mex|chedaralla|shreded italian/,'pizza topping|pizza cheese|cheese blends'),
    ],
    'meat poultry':[
      r(['Beef','لحم بقر','La7me ba2ar','Bœuf'],/\b(?:beef|cow|boeuf|biftek|faux fillet|entrecote)\b/,'beef meat|cow meat|beef cuts|ba2ar|la7me ba2ar|boeuf|بقر|لحمة بقر',null,rawMeat),
      r(['Lamb and sheep meat','لحم غنم','La7me ghanam','Agneau et mouton'],/\b(?:lamb|sheep|mutton|agneau|mouton)\b/,'lamb|sheep|sheep meat|mutton|agneau|ghanam|غنم|لحمة غنم',null,rawMeat),
      {key:'chicken',labels:['Chicken','دجاج','Djej','Poulet'],aliases:['poultry','poulet','djej','jaj','فروج','دجاج','chicken meat'],matches:(p,m)=>rawMeat(p,m)&&(m.aisles.includes('Chicken')||/\b(?:chicken|poulet|poule|tawook)\b/.test(norm(p.name.en)))},
      {key:'turkey',labels:['Turkey cold cuts','حبش مقطّع','7abash m2atta3','Dinde en charcuterie'],aliases:['turkey','dinde','turkey breast','7abash','حبش'],matches:(p,m)=>m.aisles.includes('Cold Cuts')&&taxonomy.matchesType(m,'turkey')},
      {key:'cold cuts',labels:['Cold cuts and deli meats','لحوم باردة ومرتديلا','Lou7oum berde w mortadella','Charcuterie et viandes froides'],aliases:['cold cuts','deli meat','deli meats','mortadella','charcuterie','مرتديلا','لحوم باردة'],matches:(p,m)=>m.aisles.includes('Cold Cuts')},
      r(['Burgers and kofta','برغر وكفتة','Burger w kafta','Burgers et kefta'],/\b(?:burger|kofta|kafta)\b/,'burgers|burger|kofta|kafta'),
    ],
    pasta:[
      ...[['Spaghetti','سباغيتي','Spaghetti'],['Penne','بيني','Penne'],['Fusilli','فوسيلي','Fusilli'],['Fettuccine','فيتوتشيني','Fettuccine'],['Tagliatelle','تالياتيلي','Tagliatelles'],['Lasagna','لازانيا','Lasagnes'],['Farfalle','فارفالي','Farfalle'],['Macaroni','معكرونة ماكاروني','Macaronis'],['Linguine','لينغويني','Linguine']].map(([en,ar,fr])=>r([en,ar,en,fr],null,'',en.toLowerCase())),
      r(['Rigatoni','ريغاتوني','Rigatoni','Rigatoni'],/\b(?:rigatoni|tortiglioni)\w*/,'tortiglioni'),r(['Vermicelli','شعيرية','Sha3riye','Vermicelles'],/\bvermic[ei]ll?[iy]\b/,'vermicilli'),r(['Cannelloni','كانيلوني','Cannelloni','Cannellonis'],/\bcannelloni\b/),r(['Elbow pasta','معكرونة كوع','Macarona kous','Pâtes coudées'],/\belbow\b/,'elbow macaroni'),r(['Gnocchi','نيوكي','Gnocchi','Gnocchis'],/\bgnocchi\b/),r(['Shell pasta','معكرونة أصداف','Macarona asdaf','Coquillages'],/\b(?:shells?|conchigli)\b/,'shells|conchigli'),
    ],
    rice:[
      r(['Basmati rice','أرز بسمتي','Rezz basmati','Riz basmati'],/\bbasmati\b/,'basmati','basmati'),r(['Egyptian rice','أرز مصري','Rezz masre','Riz égyptien'],/\b(?:egyptian|camolino)\b/,'egyptian|camolino'),r(['American rice','أرز أميركي','Rezz amerkene','Riz américain'],/\bamerican\b/,'american'),r(['Italian and Arborio rice','أرز إيطالي وأربوريو','Rezz itale w arborio','Riz italien et arborio'],/\b(?:italian|arborio)\b/,'italian|arborio|risotto rice'),r(['Jasmine rice','أرز ياسمين','Rezz jasmine','Riz jasmin'],/\bjasmine\b/,'jasmine'),r(['Brown rice','أرز أسمر','Rezz asmar','Riz complet'],/\bbrown\b/,'brown','brown'),r(['Black rice','أرز أسود','Rezz aswad','Riz noir'],/\bblack rice\b/,'black'),r(['Sushi rice','أرز للسوشي','Rezz sushi','Riz à sushi'],/\bsushi rice\b|\bcalrose\b/,'sushi|calrose'),r(['White rice','أرز أبيض','Rezz abyad','Riz blanc'],/\bwhite rice\b|\briz.*blanc\b/,'white'),
    ],
    shampoo:[
      r(['Anti-dandruff shampoo','شامبو ضد القشرة','Shampoo dod el 2eshra','Shampoing antipelliculaire'],/dandruff|head\s*(?:and|&)\s*shoulders|\bh\s+s\b|hand\s*shoulders/,'anti dandruff|dandruff|antipelliculaire|ضد القشرة'),
      r(['Anti-hair-fall shampoo','شامبو ضد تساقط الشعر','Shampoo dod tasa2ot el sha3er','Shampoing antichute'],/hair fall|fall defense|fall rescue|anti hair fall/,'hair fall|anti hair fall|antichute'),
      r(['Repair and strengthening shampoo','شامبو لإصلاح وتقوية الشعر','Shampoo lal isla7 w ta2wiye','Shampoing réparateur et fortifiant'],/repair|strength|resist|split (?:end|hair)|keratin/,'repair|strengthening|keratin'),
      r(['Dry hair and nourishing shampoo','شامبو للشعر الجاف والتغذية','Shampoo lal sha3er el neshef','Shampoing nourrissant pour cheveux secs'],/\bdry\b|nourish|nutritive|moistur|hydrati|argan|coconut/,'dry hair|nourishing|moisturizing'),
      r(['Oily hair and deep-clean shampoo','شامبو للشعر الدهني والتنظيف العميق','Shampoo lal sha3er el dehne','Shampoing pour cheveux gras et purifiant'],/\boily\b|oil control|deep clean|detox|charcoal/,'oily hair|deep clean|charcoal'),
      r(['Color-protect shampoo','شامبو للشعر المصبوغ','Shampoo lal sha3er el masbough','Shampoing protecteur de couleur'],/\bcolo[u]?r (?:p|protect|care)|colored hair/,'color protect|colour protect|color care'),
      r(['2-in-1 shampoo and conditioner','شامبو وبلسم ٢ في ١','Shampoo w balsam 2 b 1','Shampoing et après-shampoing 2 en 1'],/\b2\s*in\s*1\b|shp cond|shampoo conditioner/,'2 in 1|2in1'),
      {key:'baby shampoo',labels:['Baby shampoo','شامبو للأطفال','Shampoo lal atfal','Shampoing pour bébé'],aliases:['baby','kids shampoo','children shampoo'],matches:(p,m)=>m.department==='baby'||/\b(?:baby|kids)\b/.test(norm(p.name.en))},
    ],
    eggs:[r(['White eggs','بيض أبيض','Bayd abyad','Œufs blancs'],/\bwhite\b/,'white','white'),r(['Brown eggs','بيض أسمر','Bayd asmar','Œufs bruns'],/\bbrown\b/,'brown','brown'),r(['Organic eggs','بيض عضوي','Bayd organic','Œufs biologiques'],/\borganic\b/,'organic|bio')],
    chocolate:[r(['Dark chocolate','شوكولا داكنة','Chocolate dark','Chocolat noir'],/\bdark\b|chocolat noir/,'dark'),r(['Milk chocolate','شوكولا بالحليب','Chocolate bel 7alib','Chocolat au lait'],/milk choc|choc milk|chocolat au lait/,'milk'),r(['White chocolate','شوكولا بيضاء','Chocolate bayda','Chocolat blanc'],/white choc|choc white|chocolat blanc/,'white'),r(['Chocolate with nuts','شوكولا بالمكسرات','Chocolate ma3 moukasarat','Chocolat aux fruits à coque'],/hazelnut|almond|pistachio|nuts/,'nuts|nut chocolate'),r(['Chocolate truffles','ترافل الشوكولا','Truffles chocolate','Truffes au chocolat'],/\btruffles?\b/,'truffles'),r(['Filled chocolate','شوكولا محشوة','Chocolate ma7shiye','Chocolat fourré'],/caramel|filled|cream|praline/,'filled')],
    'dog food':[r(['Wet dog food','طعام رطب للكلاب','Akil ratib lal kleb','Pâtée pour chiens'],/\b(?:gravy|pate|cans?|wet)\b/,'wet|wet food|cans'),r(['Dry dog food','طعام جاف للكلاب','Akil neshef lal kleb','Croquettes pour chiens'],/\b(?:dry|kibble|croquettes)\b/,'dry|dry food|kibble',null,p=>!/\bcat\b/.test(norm(p.name.en))),r(['Puppy food','طعام للجراء','Akil lal jraw','Alimentation pour chiots'],/\bpuppy\b/,'puppy')],
    'cat food':[r(['Wet cat food','طعام رطب للقطط','Akil ratib lal bsaynet','Pâtée pour chats'],/\b(?:gravy|pate|cans?|wet|jelly)\b/,'wet|wet food|cans'),r(['Dry cat food','طعام جاف للقطط','Akil neshef lal bsaynet','Croquettes pour chats'],/\b(?:dry|kibble|croquettes)\b/,'dry|dry food|kibble',null,p=>!/\bdog\b/.test(norm(p.name.en))),r(['Kitten food','طعام للقطط الصغيرة','Akil lal bsaynet zghar','Alimentation pour chatons'],/\bkitten\b/,'kitten')],
    stationery:[r(['Pens','أقلام حبر','A2lem 7eber','Stylos'],/\b(?:pen|pens|marker|markers)\b/,'pen|markers'),r(['Pencils','أقلام رصاص','A2lem rsas','Crayons'],/\bpencils?\b/,'pencil'),r(['Notebooks','دفاتر','Dafeter','Cahiers'],/\b(?:notebook|notebk|cahier)\b/,'notebook'),r(['Rulers and geometry sets','مساطر وأدوات هندسة','Masater w adawet handase','Règles et géométrie'],/rul+er|drafting|geometry|rule set/,'ruler|geometry'),r(['Glue and correction supplies','صمغ وأدوات تصحيح','Samegh w adawet tas7i7','Colle et correcteurs'],/glue|correction/,'glue'),r(['Art supplies','أدوات رسم وتلوين','Adawet rasem w talwin','Matériel de dessin'],/paint|water colou?r|colou?r pencils|palette/,'painting|art'),r(['Erasers and sharpeners','محايات ومبرايات','Ma7ayet w mabrayet','Gommes et taille-crayons'],/eraser|sharpener/,'eraser|sharpener')],
  };
  const generic=[
    r(['Shredded','مبشور','Mabshour','Râpé'],/\b(?:shred(?:ded|ed)?|grated|rapp?e)\b/,'grated|shredded cheese','shredded'),r(['Sliced','شرائح','Sharay7','En tranches'],/\bslices?\b|\bsliced\b/,'slices|sliced cheese','sliced'),r(['Blocks','قوالب','2awaleb','En bloc'],/\bblocks?\b/,'block','block'),r(['Fresh','طازج','Fresh','Frais'],/\bfresh\b/,'fresh'),r(['Light and low-fat','قليل الدسم','Light w 2alil dasam','Allégé'],/\blight\b|\blow fat\b|\blite\b/,'light|low fat'),r(['Full-fat','كامل الدسم','Kamel el dasam','Entier'],/full fat|full cream|whole milk/,'full fat|full cream'),r(['Organic','عضوي','Organic','Biologique'],/\b(?:organic|bio)\b/,'organic|bio'),r(['Gluten-free','خالٍ من الغلوتين','Bala gluten','Sans gluten'],/gluten free|sans gluten/,'gluten free'),r(['Lactose-free','خالٍ من اللاكتوز','Bala lactose','Sans lactose'],/lactose free|sans lactose/,'lactose free'),r(['Frozen','مجمّد','Mjamad','Surgelé'],/\bfrozen\b/,'frozen'),r(['Ground','مطحون','Mat7oun','Moulu'],/\bground\b|\bpowder\b/,'ground|powder','ground'),r(['Whole','كامل','Kamel','Entier'],/\bwhole\b/,'whole','whole'),r(['Fine','ناعم','Ne3em','Fin'],/\bfine\b/,'fine','fine'),r(['Coarse','خشن','Khechen','Grossier'],/\bcoarse\b/,'coarse','coarse'),r(['Red','أحمر','A7mar','Rouge'],/\bred\b/,'red','red'),r(['Green','أخضر','Akhdar','Vert'],/\bgreen\b/,'green','green'),r(['Brown','أسمر','Asmar','Brun'],/\bbrown\b/,'brown','brown'),r(['White','أبيض','Abyad','Blanc'],/\bwhite\b/,'white','white'),
  ];
  const languages={en:0,ar:1,arz:2,fr:3};
  // Broad aisle questions are mapped to their actual supermarket department.
  const parentAliases={
    'meat poultry':/^(?:meat|meats|mates|meat and poultry|meat poultry|viandes?|viandes et volailles|لحوم|اللحوم|لحم|لحمه|لحوم ودواجن|la7me|lou7oum)$/,
    cheese:/^(?:اجبان|الاجبان|جبن|الجبن|جبنه|الجبنه|jebne|jibne|ajben)$/,
    rice:/^(?:رز|ارز|الرز|الارز|rezz|rez)$/,
    pasta:/^(?:معكرونه|معكروني|المعكرونه|مكرونه|macarona|macarone)$/,
    shampoo:/^(?:شامبو|الشامبو|shampoos?)$/,
    beverages:/^(?:drinks|beverages|boissons|مشروبات|المشروبات|mashroubet)$/,
  };
  const parentQuery=query=>Object.entries(parentAliases).find(([,pattern])=>pattern.test(norm(query)))?.[0]||query;
  const aisleTranslations={
    'Sparkling & Flavored Water':['مياه غازية ومنكّهة','May ghaziye w mnakkaha','Eaux gazeuses et aromatisées'],
    'Soft Drinks':['مشروبات غازية','Mashroubet ghaziye','Sodas'],Juices:['عصائر','3asir','Jus'],Water:['مياه','May','Eau'],
    'Powder Drinks':['مشروبات بودرة','Mashroubet powder','Boissons en poudre'],'Non Alcoholic Drinks':['مشروبات غير كحولية','Mashroubet bala alcohol','Boissons sans alcool'],
    'Iced Coffee & Tea':['قهوة وشاي بارد','Ahwe w shay bered','Cafés et thés glacés'],'Energy & Sport Drinks':['مشروبات الطاقة والرياضة','Mashroubet ta2a w riyada','Boissons énergétiques et sportives'],
    'Concentrated Drinks':['مشروبات مركزة','Mashroubet mrakkaze','Boissons concentrées'],'Tea & Infusion':['شاي ومنقوعات','Shay w a3shab','Thés et infusions'],
    Vegetables:['خضار','Khodra','Légumes'],Fruits:['فاكهة','Fawakeh','Fruits'],Herbs:['أعشاب','A3shab','Herbes'],'Dried fruits':['فاكهة مجففة','Fawakeh mjafafe','Fruits séchés'],
    Cheese:['أجبان','Ajben','Fromages'],yogurts:['لبن','Laban','Yaourts'],Labneh:['لبنة','Labne','Labné'],Eggs:['بيض','Bayd','Œufs'],
    'UHT & Fresh Milk':['حليب طازج ومعقّم','7alib fresh w sterilise','Lait frais et UHT'],'Powder Milk':['حليب بودرة','7alib powder','Lait en poudre'],
    'Butters & Creams':['زبدة وكريمة','Zebde w cream','Beurres et crèmes'],'Olives & Pickles':['زيتون ومخللات','Zaytoun w mkhallalet','Olives et cornichons'],
    Bread:['خبز','Khebez','Pain'],'Kaak & Toast':['كعك وتوست','Kaak w toast','Kaak et pain grillé'],'Freshly Baked':['مخبوزات طازجة','Makhbouzet fresh','Produits de boulangerie frais'],
    'Cat Food':['طعام القطط','Akil lal bsaynet','Alimentation pour chats'],'Dog Food':['طعام الكلاب','Akil lal kleb','Alimentation pour chiens'],'Pet accessories':['مستلزمات الحيوانات','Lawazem 7ayawanet','Accessoires pour animaux'],
    'Cold Cuts':['لحوم باردة','Lou7oum berde','Charcuterie'],Chicken:['دجاج','Djej','Poulet'],Meat:['لحوم','Lou7oum','Viande'],
    'Pasta & Noodles':['معكرونة ونودلز','Macarona w noodles','Pâtes et nouilles'],Rice:['أرز','Rezz','Riz'],'Oil & Ghee':['زيوت وسمن','Zyouet w samne','Huiles et ghee'],
    'Herbs & Spices':['أعشاب وبهارات','A3shab w bharat','Herbes et épices'],'Grains & Seeds':['حبوب وبذور','7boub w bzour','Céréales et graines'],
    'Sauces & Condiments':['صلصات وتوابل','Salsat w tawabel','Sauces et condiments'],'Cans & Jars':['معلبات','M3allabet','Conserves'],
    'Baking & Flour':['طحين ومستلزمات الخَبز','T7in w lawazem khebez','Farines et pâtisserie'],Cereals:['حبوب الإفطار','7boub lfTour','Céréales de petit déjeuner'],Soups:['شوربات','Shorbat','Soupes'],
    'Shampoo':['شامبو','Shampoo','Shampoings'],Conditioners:['بلسم','Balsam','Après-shampoings'],'Skin Care':['العناية بالبشرة','3inaye bel bashra','Soins de la peau'],'Body Care':['العناية بالجسم','3inaye bel jesem','Soins du corps'],
    'Bath & Body Wash':['غسول الجسم','Ghassoul el jesem','Gels douche'],'Tooth care':['العناية بالأسنان','3inaye bel snan','Hygiène dentaire'],
    'Liquid Laundry Detergents':['منظفات غسيل سائلة','Mnadf ghassil se2il','Lessives liquides'],'Powder Laundry Detergents':['مساحيق غسيل','Masa7i2 ghassil','Lessives en poudre'],
    Dishwashing:['منظفات الصحون','Mnadf so7oun','Produits vaisselle'],'Surface & Floor Cleaning':['منظفات الأرضيات والأسطح','Mnadf ard w osso7','Nettoyants sols et surfaces'],
  };
  const cleanLabel=value=>String(value).replace(/\s+/g,' ').trim();
  const title=value=>value.replace(/(^|\s)\p{L}/gu,c=>c.toUpperCase());
  // Build a product-type hierarchy from verified species, cut and preparation.
  // This works for any classified protein, not a particular dish or SKU.
  function proteinGroups(species){
    const group=(key,labels,aliases,matches)=>({key,labels,aliases:aliases.split('|').filter(alias=>species==='chicken'||!/chicken|دجاج|djej|poulet/i.test(alias)),matches:(p,m)=>m.protein?.species===species&&matches(m.protein)});
    const plain=m=>m.preparation==='raw'&&!m.bundle;
    const isChicken=species==='chicken';
    return [
      group('raw',isChicken?['Raw chicken','دجاج نيء','Djej nay','Poulet cru']:['Raw cuts','قطع نيئة','2ota3 nayye','Morceaux crus'],'raw|raw chicken|raw chicken cuts|raw cuts|fresh chicken|plain chicken|دجاج نيء|djej nay|poulet cru',m=>plain(m)&&m.cut!=='offal'),
      group('whole-bird',isChicken?['Whole chicken','فروج كامل','Farrouj kemel','Poulet entier']:['Whole birds','طيور كاملة','Tyur kemle','Volailles entières'],'whole chicken|whole bird|whole birds|entire chicken|فروج كامل|farrouj kemel|poulet entier',m=>plain(m)&&m.cut==='whole-bird'),
      group('breast',['Raw breast / fillet','صدر / فيليه نيء','Sader / fillet nay','Filet / blanc cru'],'breast|fillet|fillets|whole fillet|chicken breast|chicken fillet|raw chicken breast|boneless chicken breast|صدر|مسحب|sader|filet',m=>plain(m)&&m.cut==='breast'),
      group('fillet',['Raw fillets','فيليه نيء','Fillet nay','Filets crus'],'fillet|fillets|raw fillet|filet|فيليه',m=>plain(m)&&m.cut==='fillet'),
      group('leg',['Raw legs','أفخاذ نيئة','Fkhad nayye','Cuisses crues'],'leg|legs|whole legs|chicken legs|raw chicken legs|فخاد|fkhad|cuisses',m=>plain(m)&&m.cut==='leg'),
      group('thigh',['Raw thighs','أوراك نيئة','Warak naye','Hauts de cuisse crus'],'thigh|thighs|chicken thighs',m=>plain(m)&&m.cut==='thigh'),
      group('wing',['Raw wings','جوانح نيئة','Jwane7 nayye','Ailes crues'],'wing|wings|whole wings|chicken wings|جوانح|jwane7|ailes',m=>plain(m)&&m.cut==='wing'),
      group('drumstick',['Raw drumsticks','دبابيس نيئة','Dabebis naye','Pilons crus'],'drumstick|drumsticks|pilons',m=>plain(m)&&m.cut==='drumstick'),
      group('minced',['Minced meat','لحم مفروم','La7me mafroume','Viande hachée'],'minced|ground|minced meat|ground meat',m=>plain(m)&&m.cut==='minced'),
      group('offal',['Liver and offal','كبدة وأحشاء','Sawda w a7sha','Foie et abats'],'liver|chicken liver|offal|سودة|كبدة|foie',m=>plain(m)&&m.cut==='offal'),
      group('marinated',['Marinated and seasoned','متبل ومتبهر','Mtabbal w mbahhar','Mariné et assaisonné'],'marinated|seasoned|tawook|fajita|متبل|mtabbal',m=>m.form==='marinated'),
      group('escalope',['Escalope','إسكالوب','Escalope','Escalopes'],'escalope|escalopes|chicken escalope|اسكالوب',m=>m.form==='escalope'),
      group('breaded',['Breaded and crispy','مغلف بالبقسماط ومقرمش','Breaded w crispy','Pané et croustillant'],'breaded|crispy|crispy chicken|zinger|كرسبي',m=>m.form==='breaded'),
      group('nuggets',['Nuggets','ناغتس','Nuggets','Nuggets'],'nuggets|chicken nuggets|ناغتس',m=>m.form==='nuggets'),
      group('burger',['Burgers','برغر','Burger','Burgers'],'burger|burgers|chicken burger|برغر',m=>m.form==='burger'),
      group('cordon-bleu',['Cordon bleu','كوردون بلو','Cordon bleu','Cordon bleu'],'cordon bleu',m=>m.form==='cordon-bleu'),
      group('tender-strip',['Tenders and strips','تندرز وشرائح','Tenders w strips','Aiguillettes et lamelles'],'tenders|tender|strips|chicken tenders|chicken strips',m=>m.form==='tender-strip'),
      group('cold-cut',['Cold cuts and luncheon meat','لحوم باردة ومرتديلا','Lou7oum berde w mortadella','Charcuterie et mortadelle'],'cold cuts|luncheon|mortadella|charcuterie|مرتديلا',m=>m.form==='cold-cut'),
      group('smoked',['Smoked products','منتجات مدخنة','Products mdakhkhan','Produits fumés'],'smoked|smoked meat|smoked salmon|مدخن|fumé',m=>m.form==='smoked'),
      group('sausage',['Sausages and hot dogs','نقانق وهوت دوغ','Sausage w hot dog','Saucisses et hot-dogs'],'sausages|sausage|hot dogs|hot dog|soudjouk|نقانق',m=>m.form==='sausage'),
      group('canned',['Canned meat','لحوم معلبة','La7me m3allabe','Viande en conserve'],'canned|canned chicken|canned meat',m=>m.form==='canned'),
      group('prepared',['Other prepared products','منتجات محضرة أخرى','Products m7addara tenye','Autres produits préparés'],'prepared|prepared chicken|other prepared',m=>m.form==='prepared'),
    ];
  }
  function discover(query,products){
    const available=products.filter(p=>p.available===true);
    if(!available.length)return [];
    const parent=norm(parentQuery(query));
    const info=taxonomy.queryInfo(parent);
    const family=rules[parent]?parent:info.types.find(t=>rules[t])||parent;
    const withProducts=rule=>({...rule,products:available.filter(p=>rule.matches(p,taxonomy.records.get(p.id)))});
    let groups=(rules[family]||[]).map(withProducts).filter(g=>g.products.length&&g.products.length<available.length);
    if(!groups.length&&info.protein)groups=proteinGroups(info.protein.species).map(withProducts).filter(g=>g.products.length&&g.products.length<available.length);
    // A narrow product family should offer its meaningful varieties, not merely
    // broader departments that happen to contain them. Source aisles remain a
    // useful first-level hierarchy for broad department requests.
    if(!groups.length&&info.types.length)groups=generic.map(withProducts).filter(g=>g.products.length&&g.products.length<available.length);
    // The same algorithm works for every inventory aisle: first show named
    // subcategories and verified distinct product types, then measurable forms.
    if(!groups.length){
      const aisles=new Map();
      const department=Object.entries(categoryLabels).find(([key,labels])=>[key,...labels].some(label=>norm(label)===parent))?.[0];
      const primary=department?new Set(available.filter(p=>p.category===department).flatMap(p=>taxonomy.records.get(p.id).aisles)):null;
      for(const p of available)for(const label of taxonomy.records.get(p.id).aisles){const key=norm(label);if(key===parent||info.types.length&&(' '+key+' ').includes(' '+parent+' ')||/offer|promotion|organic grocer|^drinks$/.test(key)||primary?.size&&!primary.has(label))continue;if(!aisles.has(key))aisles.set(key,{label,ids:new Set()});aisles.get(key).ids.add(p.id);}
      const distinct=[...aisles].filter(([,v])=>v.ids.size>0&&v.ids.size<available.length);
      if(distinct.length>1)groups=distinct.map(([key,v])=>({key:'aisle '+key,labels:[v.label,...(aisleTranslations[v.label]||[v.label,v.label,v.label])],aliases:[v.label],products:available.filter(p=>v.ids.has(p.id))}));
    }
    if(!groups.length){
      const types=new Map();
      for(const p of available){const m=taxonomy.records.get(p.id), label=cleanLabel(m.productType);if(!label||label===parent||m.confidence==='source-name'&&!['produce','fish'].includes(m.department)||label.split(' ').length>4||/\d/.test(label))continue;if(!types.has(label))types.set(label,[]);types.get(label).push(p);}
      if(types.size>1)groups=[...types].filter(([,ps])=>ps.length<available.length).map(([label,ps])=>({key:'family '+norm(label),labels:[title(label),title(label),title(label),title(label)],aliases:[label],products:ps}));
    }
    if(!groups.length)groups=generic.map(withProducts).filter(g=>g.products.length&&g.products.length<available.length);
    // Keep distinct group labels, not individual packages. Unclassified stock
    // is still selectable as Other types rather than being silently dropped.
    const unique=new Map(groups.map(g=>[g.key,g]));groups=[...unique.values()];
    if(groups.length>24)groups=groups.sort((a,b)=>b.products.length-a.products.length||a.key.localeCompare(b.key)).slice(0,23);
    if(groups.length){const covered=new Set(groups.flatMap(g=>g.products.map(p=>p.id)));const other=available.filter(p=>!covered.has(p.id));if(other.length)groups.push({key:'other',labels:['Other types','أنواع أخرى','Anwe3 tenye','Autres types'],aliases:['other','others','more','other options','غير','أخرى','autres'],products:other});}
    return groups;
  }
  function label(group,language){return group.labels[languages[language]??0]||group.labels[0];}
  function findGroup(groups,term,language){
    const text=norm(term), canonical=taxonomy.canonicalQuery(text);
    const exact=groups.filter(g=>[g.key,...g.labels,...g.aliases].some(word=>norm(word)===text||norm(word)===canonical));
    if(exact.length===1)return exact[0];
    const stripped=text.replace(/\b(?:cheese|cheeses|meat|products?|options?|types?|items?)\b/g,' ').replace(/ +/g,' ').trim();
    const close=groups.filter(g=>[...g.labels,...g.aliases].some(word=>norm(word)===stripped));
    return close.length===1?close[0]:null;
  }
  return {parentQuery,discover,label,findGroup};
}
