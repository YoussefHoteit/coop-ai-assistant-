// Grounded descriptions and searchable identities, generated for each source
// record. Display titles, original label text and all commercial facts remain
// unchanged. A product name is evidence of what it says, not an ingredient list.
export function createCatalogDescriptions(products, categoryLabels, taxonomy, normalize) {
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const norm=value=>normalize(clean(value)).replace(/(?<!\d)\.|\.(?!\d)/g,' ').replace(/\s+/g,' ').trim();
  const rules=[];
  const rule=(departments,aisles,pattern,type,aliases='')=>rules.push({departments:departments.split('|'),aisles:aisles?aisles.split('|').map(norm):[],pattern,type,aliases:aliases.split('|').filter(Boolean)});
  const personal='personal-care|baby';
  rule(personal,'Tooth care',/\b(?:tooth\s*brush(?:es)?|brosse a dents?)\b/,'toothbrush','tooth brush|brosse a dents|فرشاة اسنان|fershayet snan');
  rule(personal,'Tooth care',/\b(?:tooth\s*paste|dentifrice|t\s*p)\b/,'toothpaste','tooth paste|dentifrice|معجون اسنان|ma3joun snan');
  rule(personal,'Tooth care',/\b(?:mouth\s*wash|mouth rinse|bain de bouche)\b/,'mouthwash','mouth wash|mouth rinse|غسول فم');
  rule(personal,'Tooth care',/\b(?:dental floss|floss)\b/,'dental floss','tooth floss|fil dentaire|خيط اسنان');
  rule(personal,'Shampoo',/\b(?:shampoo|shampoing|shp|sh|sham|shamp)\b/,'shampoo','shampoing|شامبو');
  rule(personal,'Conditioners|Shampoo',/\b(?:conditionner|conditioner|cond|apres shampoing)\b/,'hair conditioner','conditioner|apres shampoing|بلسم شعر');
  rule(personal,'Bath & Body Wash|baby bath & wash',/\b(?:shower\s*gel|showergel|body\s*wash|s\s*g|sg|gel douche)\b/,'shower gel','body wash|gel douche|جل استحمام');
  rule(personal,'Liquid Handwash',/\b(?:hand\s*wash|handwash|h\s*w|hw|liquid soap)\b/,'liquid hand wash','hand wash|handwash|savon liquide|صابون يدين');
  rule(personal,'Deodorants&perfumes',/\b(?:deo|deod[eo]rant|reodorant|antiperspirant|roll on)\b/,'deodorant','مزيل عرق');
  rule(personal,'Deodorants&perfumes',/\b(?:edp|edt|perfume|parfum|cologne|eau de toilette|eau de parfum)\b/,'fragrance','perfume|parfum|عطر');
  rule(personal,'Hair Coloration',/\b(?:hair dye|hair colo[u]?r|koleston|palette|coloration)\b/,'hair dye','hair color|hair colour|coloration cheveux|صبغة شعر');
  rule(personal,'Hair Styling|Conditioners',/\b(?:hair mask|mask|masque)\b/,'hair mask','masque cheveux|ماسك شعر');
  rule(personal,'Hair Styling',/\b(?:hair gel|styling gel|hair spray|hairspray|mousse|hair wax)\b/,'hair styling product','hair styling');
  rule(personal,"Skin Care|Body Care|Women's Care",/\b(?:micellar water|eau micellaire)\b/,'micellar water','eau micellaire|ماء ميسيلار');
  rule(personal,'Body Care|Skin Care',/\b(?:sunscreen|sun protect|sunblock|spf\s*\d+)\b/,'sun protection product','sun protection|sunscreen|واقي شمس');
  rule(personal,'Body Care|Skin Care',/\b(?:tanning oil|sun tanning)\b/,'tanning product','tanning oil|زيت تسمير');
  rule(personal,'Body Care|Skin Care',/\b(?:body lotion|body milk|lait corps)\b/,'body lotion','body milk|lait corps|لوشن جسم');
  rule(personal,'Wipes & Sanitizers|Skin Care|Women\'s Care',/\b(?:wipes|wet tissues|lingettes)\b/,'wipes','wet wipes|lingettes|مناديل مبللة');
  rule(personal,'Men\'s Care|Women\'s Care|Body Care',/\bshaving cream\b/,'shaving cream','كريم حلاقة');
  rule(personal,'Men\'s Care|Women\'s Care|Body Care',/\bshaving foam\b/,'shaving foam','رغوة حلاقة');
  rule(personal,'Men\'s Care|Women\'s Care|Body Care',/\b(?:shaving gel|rasage)\b/,'shaving product','rasage');
  rule(personal,'Men\'s Care|Women\'s Care',/\b(?:razor|razors|shaver|razor blade|rasoir)\b/,'razor','razor blade|rasoir|شفرة حلاقة');
  rule(personal,'Bar Soap',/\b(?:soap|savon)\b/,'bar soap','soap bar|savon|صابون');
  rule(personal,'Diapers|Elder Care',/\b(?:diapers?|pull ups?|pill ups?|nappies|couches)\b/,'diapers','diaper|nappies|couches|حفاضات');
  rule('baby','',/\b(?:baby wipes|wet wipes|wipes)\b/,'baby wipes','baby wet wipes|مناديل اطفال');
  rule('baby','',/\b(?:baby bottle|feeding bottle|biberon)\b/,'baby bottle','biberon|رضاعة');
  rule('home-care','Batteries',/\b(?:lithium|battery|batteries|aa|aaa|aaa[a]?|cr20\d+)\b/,'battery','batteries|pile|بطارية');
  rule('home-care','Kitchen Supplies',/\b(?:alumini?um|aluminum|aluminuim|alu)\s+foil\b/,'aluminium foil','aluminum foil|foil|papier aluminium|ورق المنيوم');
  rule('home-care','Kitchen Supplies',/\b(?:trash|garbage|rubbish)\s+bags?\b/,'trash bags','garbage bags|bin bags|sacs poubelle|اكياس نفايات');
  rule('home-care','Kitchen Supplies',/\b(?:cling film|plastic wrap|stretch film)\b/,'cling film','plastic wrap|film alimentaire|نايلون تغليف');
  rule('home-care','Kitchen Supplies',/\b(?:sandwich|sand|freezer|zip|food storage)\s*bags?\b|\bbag\s+zip\b/,'food storage bags','اكياس حفظ الطعام');
  rule('home-care','Kitchen & Toilet Rolls',/\b(?:toilet paper|toilet rolls?|wc rolls?)\b/,'toilet paper','toilet roll|papier toilette|ورق حمام');
  rule('home-care','Kitchen & Toilet Rolls',/\b(?:kitchen rolls?|paper towels?)\b/,'paper towels','kitchen roll|essuie tout|ورق مطبخ');
  rule('home-care','Tissues & Napkins',/\b(?:napkins?|serviettes)\b/,'napkins','paper napkins|serviettes|مناديل سفرة');
  rule('home-care','Tissues & Napkins',/\b(?:tissues?|facial tissue)\b/,'tissues','facial tissues|mouchoirs|محارم');
  rule('home-care','Cleaning Tools & Gloves',/\b(?:gloves?|gants)\b/,'cleaning gloves','household gloves|gants menage|قفازات تنظيف');
  rule('home-care','Cleaning Tools & Gloves',/\b(?:sponges?|sponge|eponge)\b/,'cleaning sponge','sponge|اسفنجة');
  rule('home-care','Cleaning Tools & Gloves',/\b(?:mop|floor mop)\b/,'floor mop','mop|ممسحة');
  rule('home-care','Fabric Softner',/\b(?:softener|softner|fabric|comfort|downy|soupline)\b/,'fabric softener','fabric softner|assouplissant|منعم غسيل');
  rule('home-care','Liquid Laundry Detergents|Powder Laundry Detergents',/\b(?:stain remover|stain removal|deta[ch]ant)\b/,'laundry stain remover','stain remover|مزيل بقع');
  rule('home-care','Disinfectant|Bathroom Cleaning',/\b(?:bleach|javel)\b/,'bleach','eau de javel|مبيض');
  rule('home-care','Disinfectant|Surface & Floor Cleaning',/\b(?:air fresh[en]+er|air freshner|air freshener)\b/,'air freshener','room freshener|معطر جو');
  rule('home-care','Dishwashing',/\b(?:dishwashing liquid|dish wash liquid|dw|dishwash liquid)\b/,'dishwashing liquid','dish soap|liquid dish detergent|سائل جلي');
  rule('electronics','',/\b(?:car charger|vehicle charger|car adapter)\b/,'car charger','car phone charger|chargeur voiture|شاحن سيارة');
  rule('electronics','',/\bwireless charging station\b/,'wireless charging station','wireless charger|station recharge sans fil|شاحن لاسلكي');
  rule('electronics','',/\b(?:power\s*bank|portable charger)\b/,'power bank','portable charger|battery pack|باور بنك');
  rule('electronics','',/\b(?:dash cam|dashcam)\b/,'dash camera','dash cam|car dash camera|كاميرا سيارة');
  rule('electronics','',/\b(?:headphones?|headset)\b/,'headphones','casque audio|سماعات');
  rule('electronics','',/\b(?:earbuds?|earphones?|airpods)\b/,'earphones','earbuds|ecouteurs|سماعات اذن');
  rule('electronics','',/\b(?:cables?|usb cable|charging cable)\b/,'cable','كابل');
  rule('electronics','',/\b(?:adapter|adaptor|conversion head)\b/,'adapter','adaptor|adaptateur|محول');
  rule('electronics','',/\b(?:chargers?|charging plug)\b/,'charger','chargeur|شاحن');
  rule('school','',/\b(?:backpack|school bag|schoolbag|back pack)\b/,'backpack','school bag|cartable|شنطة مدرسة');
  rule('school','',/\b(?:pencil case|pencil pouch|trousse)\b/,'pencil case','pencil pouch|trousse|مقلمة');
  rule('school','',/\b(?:pencils?)\b/,'pencil','pencils|قلم رصاص');
  rule('school','',/\b(?:notebooks?|notebk|copybook|cahier)\b/,'notebook','copybook|cahier|دفتر');
  rule('school','',/\bsharpener\b.*\beraser\b|\beraser\b.*\bsharpener\b/,'sharpener and eraser set','sharpener|eraser|مبراة وممحاة');
  rule('school','',/\b(?:eraser|rubber)\b/,'eraser','gomme|ممحاة');
  rule('school','',/\b(?:ruler|ruller|regle)\b/,'ruler','regle|مسطرة');
  rule('school','',/\b(?:sharpener|taille crayon)\b/,'pencil sharpener','sharpener|مبراة');
  rule('school','',/\bcorrection pen\b/,'correction pen','correction fluid pen|stylo correcteur|قلم تصحيح');
  rule('school','',/\b(?:ballpoint|pen|pens|stylo)\b/,'pen','stylo|قلم حبر');
  rule('school','',/\b(?:labels?|adhesive labels)\b/,'adhesive labels','stickers labels|ملصقات');
  rule('kitchen','',/\b(?:cutting board|chopping board)\b/,'cutting board','chopping board|planche a decouper|لوح تقطيع');
  rule('kitchen','',/\b(?:frying pan|frypan|skillet)\b/,'frying pan','skillet|poele|مقلاة');
  rule('kitchen','',/\b(?:chopping knife|fruit knife|kitchen knife|knife)\b/,'kitchen knife','knife|couteau cuisine|سكين مطبخ');
  rule('kitchen','',/\b(?:strainer|colander|sieve)\b/,'strainer','colander|passoire|مصفاة');
  rule('kitchen','',/\b(?:bowl|bowls)\b/,'bowl','serving bowl|bol|وعاء');
  rule('kitchen','',/\b(?:plate|plates)\b/,'plate','dish plate|assiette|صحن');
  rule('kitchen','',/\b(?:mug|mugs)\b/,'mug','mug|كوب');
  rule('kitchen','',/\b(?:cup|cups)\b/,'cup','cup|tasse|كوب');
  rule('kitchen','',/\b(?:kettle|bouilloire)\b/,'kettle','bouilloire|غلاية');
  rule('kitchen','',/\b(?:grater|rape)\b/,'grater','grater|مبشرة');
  rule('kitchen','',/\b(?:peeler|eplucheur)\b/,'peeler','vegetable peeler|مقشرة');
  rule('kitchen','',/\b(?:whisk|fouet)\b/,'whisk','fouet|خفاقة');
  rule('kitchen','',/\b(?:spatula|spatule)\b/,'spatula','spatule|ملعقة تقليب');
  rule('toys','',/\b(?:puzzle|puzzles)\b/,'puzzle','jigsaw puzzle|بازل');
  rule('toys','',/\b(?:doll|fashion doll)\b/,'doll','toy doll|دمية');
  rule('toys','',/\b(?:board game|tabletop game)\b/,'board game','tabletop game|لعبة لوحية');
  rule('toys','',/\b(?:squishy|squish|needoh|needooh)\b/,'squishy toy','squeeze toy|لعبة اسفنجية');
  rule('seasonal','',/\b(?:socks?|chaussettes)\b/,'socks','sock|chaussettes|جوارب|jrab');
  rule('pantry|organic','Sauces & Condiments',/\b(?:ketchup|catsup)\b/,'ketchup','tomato ketchup|كاتشب');
  rule('pantry|organic','Sauces & Condiments',/\bmayonnaise\b/,'mayonnaise','mayo|مايونيز');
  rule('pantry|organic','Sauces & Condiments',/\b(?:mustard|moutarde)\b/,'mustard','moutarde|خردل');
  rule('pantry|organic','Sauces & Condiments',/\b(?:soy sauce|soya sauce)\b/,'soy sauce','soya sauce|sauce soja|صلصة صويا');
  rule('pantry|organic','Sauces & Condiments',/\bpesto\b/,'pesto sauce','pesto|صلصة بيستو');
  rule('pantry|organic','Spreads|Jam & Honey',/\bpeanut butter\b/,'peanut butter','beurre cacahuete|زبدة فول سوداني');
  rule('pantry|organic','Jam & Honey|Spreads',/\b(?:honey|miel)\b/,'honey','miel|عسل');
  rule('pantry|organic','Jam & Honey|Spreads',/\b(?:jam|confiture|marmalade)\b/,'jam or preserve','jam|confiture|مربى');
  rule('pantry|organic','Baking & Flour',/\b(?:cake mix|brownie mix|muffin mix)\b/,'baking mix','baking mix');
  rule('pantry|organic','Baking & Flour',/\bpancake mix\b/,'pancake mix','خليط بان كيك');
  rule('pantry|organic','Cereals',/\b(?:corn flakes|cornflakes)\b/,'corn flakes','cornflakes|كورن فليكس');
  rule('pantry|organic','Cereals',/\bgranola\b/,'granola','granola cereal');
  rule('pantry|organic','Cereals',/\bmuesli\b/,'muesli','muesli cereal');
  rule('pantry|organic','Pasta & Noodles',/\b(?:vermicelli|vermicilli|vermicelle)\b/,'vermicelli','vermicelli pasta|vermicelle|شعيرية');
  rule('organic','',/\b(?:vermicelli|vermicilli|vermicelle)\b/,'vermicelli','vermicelli pasta|vermicelle|شعيرية');
  rule('pantry|organic','Oil & Ghee',/\b(?:sunflower|tournesol)\b/,'sunflower oil','huile tournesol|زيت دوار الشمس');
  rule('pantry|organic','Oil & Ghee',/\b(?:corn oil|huile mais)\b/,'corn oil','huile mais|زيت ذرة');
  rule('pantry|organic','Oil & Ghee',/\b(?:ghee|samneh|samna)\b/,'ghee','samneh|سمنة');
  rule('pantry|organic','Cans & Jars',/\b(?:luncheon|l\s*m|mortadell?a|mrtd|mrrtd|martdella)\b/,'luncheon meat','luncheon meat|مرتديلا');
  rule('meat','Cold Cuts',/\b(?:mortadell?a|mrtd|mrrtd|martdella)\b/,'mortadella','mortadella|مرتديلا');
  rule('dairy','UHT & Fresh Milk',/\bmlik\b/,'milk','milk|lait|حليب');
  rule('bakery','Bread',/\b(?:tortilla|taco wrap)\b/,'tortilla wrap','tortilla|wrap bread|خبز تورتيلا');
  rule('snacks|organic|seasonal','Chocolates|Snacks',/\b(?:protein bar|protein choco bar)\b/,'protein bar','protein bar|لوح بروتين');
  rule('snacks|organic','Chips & Crackers|Organic Groceries',/\b(?:rice cakes?|ricecake)\b/,'rice cake','rice cakes|galette de riz|كعك ارز');
  rule('produce|other','',/\b(?:dates?|tamer|khodary|khodari|majdoul|medjoul|ajawi|sakaai)\b/,'dates','date fruit|dattes|تمر');

  // Restrict the broad aisle fallback to the source department. Category names
  // are not search synonyms and do not imply ingredients or dietary facts.
  const broadAisles=new Set(['food','drinks','snacks','organic groceries','frozen','frozen food','kitchen tools','confectionery baking food','meat chicken','vegetables fruits','cans jars','spreads','sauces condiments','grains seeds','cereals','women s care','men s care','body care','skin care','elder care','disposables','pet accessories']);
  const nutritionWords=/\b(?:organic|gluten free|lactose free|sugar free|vegan|halal|kosher|low fat|high protein)\b/i;
  const proteinCut={breast:'breast fillet',fillet:'fillet',leg:'leg',wing:'wing',thigh:'thigh',drumstick:'drumstick','whole-bird':'whole bird',offal:'offal',minced:'minced meat'};
  const proteinForm={escalope:'escalope','cordon-bleu':'cordon bleu',nuggets:'nuggets',burger:'burger',sausage:'sausage','cold-cut':'cold cut',smoked:'smoked product',breaded:'breaded or crispy product',marinated:'marinated or seasoned product',prepared:'prepared product','tender-strip':'tender or strip',canned:'canned meat'};
  const out=new Map();
  for(const p of products){
    const title=clean(p.name?.en||p.name?.ar||p.id), name=norm(title),meta=taxonomy.records.get(p.id);
    const department=clean(categoryLabels[p.category]?.[0]||p.department||p.category||'Uncategorized');
    const sourceAisles=[...new Set(String(p.subcategory||'').split(',').map(clean).filter(x=>x&&norm(x)!==norm(department)&&!/offer|promotion|buy\s*&?\s*win|\$|^\s*\d+\s*%/i.test(x)&&(p.category==='seasonal'||!/christmas|new year/i.test(x))&&(p.category==='school'||!/back to school/i.test(x))))];
    const aisleKeys=new Set(sourceAisles.map(norm));
    let identity=null, method='listed-name-and-category',aliases=[],strictType=null;
    const protein=meta?.protein;
    if(protein){
      const part=protein.cut&&proteinCut[protein.cut],form=protein.form&&proteinForm[protein.form];
      identity=protein.preparation==='raw'?['raw',protein.species,part].filter(Boolean).join(' '):[protein.species,form||part].filter(Boolean).join(' ');
      method='species-cut-preparation';
      // Protein aliases remain owned by the stricter shared taxonomy.
    }else{
      const specific=rules.find(r=>r.departments.includes(p.category)&&(!r.aisles.length||r.aisles.some(a=>aisleKeys.has(a)))&&r.pattern.test(name));
      if(specific){identity=specific.type;strictType=specific.type;aliases=[specific.type,...specific.aliases];method='name-and-aisle';}
      else if(meta?.confidence==='type-rule'&&!nutritionWords.test(meta.productType)){
        const shapes={pasta:['fettuccine','spaghetti','penne','fusilli','macaroni','tagliatelle','lasagna','linguine','farfalle'],rice:['basmati','long-grain','short-grain'],cheese:['mozzarella','parmesan','feta','halloumi','akkawi','cheddar','kashkaval','gouda','edam','emmental','brie','camembert','ricotta','mascarpone','roquefort','shanklish','nabulsi','bulgarian']};
        const variant=meta.attributes?.find(a=>shapes[meta.productType]?.includes(a));
        const form=(meta.productType==='cheese'&&meta.attributes?.find(a=>['shredded','sliced','block'].includes(a)))||null;
        identity=[form,variant,meta.productType].filter(Boolean).join(' ');method='taxonomy-identity';
      }else if(meta?.confidence==='source-term'&&meta.productType&&name.includes(norm(meta.productType))){
        identity=meta.productType;method='source-term';
      }else if(meta?.confidence==='aisle-rule'&&meta.productType){
        // An aisle may contain accessories, kits or differently named variants.
        // Describe where it is listed rather than pretending the aisle is SKU identity.
        method='source-aisle';
      }
    }
    const source=clean(p.description?.en||p.description?.ar||'');
    const brand=clean(p.brand).replace(/\.$/,'');
    const size=clean(p.size?.en||p.size?.ar||'');
    const parts=[title.replace(/[.\s]+$/,'')];
    if(identity&&!(' '+name+' ').includes(' '+norm(identity)+' '))parts.push(`Product type: ${identity}`);
    const relevant=sourceAisles.filter(a=>!broadAisles.has(norm(a))).slice(0,2);
    const location=[department,...(relevant.length?relevant:sourceAisles.slice(0,1))].filter(Boolean).join(' / ');
    if(p.category!=='other'||sourceAisles.length)parts.push(`Department: ${location}`);
    if(brand&&!/^(?:produce|fresh|meat|food)$/i.test(brand)&&!(' '+name+' ').includes(' '+norm(brand)+' '))parts.push(`Listed brand: ${brand}`);
    if(size&&!(' '+name+' ').includes(' '+norm(size)+' '))parts.push(`Listed unit: ${size}`);
    if(source&&norm(source)!==name&&!(' '+name+' ').includes(' '+norm(source)+' '))parts.push(`Supplier description: ${source}`);
    // The exact original name is retained, including spelling, flavour, count,
    // dimension, promotion, weight range, model or variant as supplied.
    const description=parts.map(s=>s.replace(/[.\s]+$/,'')).filter(Boolean).join('. ')+'.';
    out.set(p.id,{description,identity,method,strictType,aliases:[...new Set(aliases.map(norm).filter(Boolean))],department,sourceAisles,sourceDescription:p.description||null});
  }
  return out;
}
