export const replyLanguages = ['en', 'ar', 'arz', 'fr'];

const arabicScript = /(?=\p{L})\p{Script=Arabic}/u;
const latinScript = /\p{Script=Latin}/u;
const arabiziWords = /\b(?:marhaba|ahlan|badd[iey]|bade|badi|badna|baddna|ne7na|nehna|na7na|ma3e|ma3i|ma3na|ma3ak|3ande|3andi|3and\w*|shu|shou|kif|keef|adde|ade|addesh|addeish|2adde|2ade|2addesh|kam|hayda|hayde|haydi|haydol|halla2|hala2|bkam|bikaffi|bekaffe|bikaffe|ta3mol|ta3mel|a3mol|a3mel|a3mlo|a3mela|3mela|3mlo|bte2dar|fina|bteswa|bteswe|badde|akhas|arkhas|ar5as|ghale|ghali|nekol|nakol|nakoul|nkol|netbokh|ntbokh|matbakh|wasfe|wasfet|salam|yalla|khalas|tayeb|tayyeb)\b|\b[a-z]+[2356789][a-z]+(?:[2356789][a-z]+)*\b|\b[2356789][a-z]{3,}\b/i;

export function isFrench(text) {
  const folded = text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[’']/g, ' ');
  return /\b(?:bonjour|bonsoir|salut|recettes?|combien|pouvez|pourriez|voudrais|veux|cherche|avez|vendez|disponible|disponibles|cheres?|moins cher|prix|francais|francaise|acheter|coutent?|coute|conservez|conserver|preparer|preparez|proposez|recommandez|manger)\b|\b(?:s il vous plait|je souhaite|est ce que|pour (?:\d+|deux|trois|quatre|cinq|six)|et pour|un autre|une autre)\b|^(?:oui|non|d accord|bien sur|merci)[.!?\s]*$/.test(folded);
}

export const replyLocale = language => language === 'ar' ? 'ar-LB' : language === 'fr' ? 'fr-FR' : 'en-US';

export function isArabizi(text) {
  if (arabicScript.test(text) || !arabiziWords.test(text)) return false;
  const lexical = text.replace(/\b(?=[a-z0-9]*\d)[a-z0-9]+\b/gi, token => /^(?:bade|baddi|badde|badi|badna)[2356789]/i.test(token) ? 'bade' : '');
  const otherRequest = /\b(?:do you|how much|how do|what is|which|can you|could you|i need|i want|i would like|are there|help me|give me|show me|make me|cook me)\b/i.test(text) || isFrench(text);
  return !otherRequest || arabiziWords.test(lexical);
}

function explicitRequestLanguage(text) {
  const value=text.trim().toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'');
  if(/^(?:please\s+)?(?:help me|give me|show me|make me|cook me|can you|could you|do you|how (?:do|can|much)|i (?:want|need|would like)|recipe for)\b/.test(value))return'en';
  if(/^(?:s il vous plait\s+)?(?:je (?:voudrais|veux|souhaite|cherche)|pouvez|pourriez|donnez|donne|montrez|aidez)\b/.test(value))return'fr';
  return null;
}

export function detectReplyLanguage(text, recentLanguage = 'en') {
  const recent = replyLanguages.includes(recentLanguage) ? recentLanguage : 'en';
  const explicit=explicitRequestLanguage(text);
  if(explicit)return explicit;
  if (arabicScript.test(text)) return 'ar';
  if (isArabizi(text)) return 'arz';
  if (/^merci[.!\s]*$/i.test(text)) return recent === 'arz' ? recent : 'fr';
  if (isFrench(text)) return 'fr';
  if (!latinScript.test(text) || /^(?:ok|okay|k|yes\/no)[.!?\s]*$/i.test(text)) return recent;
  return 'en';
}

export function chooseReplyLanguage(text, recentLanguage, classifiedLanguage) {
  const explicit=explicitRequestLanguage(text);
  if(explicit)return explicit;
  const detected = detectReplyLanguage(text, recentLanguage);
  if (/^merci[.!\s]*$/i.test(text)) return detected;
  if (isArabizi(text) || arabicScript.test(text)) return detected;
  if (!arabicScript.test(text) && isFrench(text)) return 'fr';
  if (!arabicScript.test(text) && /\b(?:how|what|which|can|could|please|recommend|recipe|ingredients|price|write|give|need|help|show|cook|make)\b/i.test(text) && !isArabizi(text)) return 'en';
  return replyLanguages.includes(classifiedLanguage) ? classifiedLanguage : detected;
}

export const replyLanguageInstructions = {
  en: 'English. Write all prose, recipe titles, preparation steps, ingredient names and quantities in English. Do not switch to Arabic or Arabizi.',
  fr: 'French. Write all prose, recipe titles, preparation steps, ingredient names, quantities and shopping-kit explanations in natural French. Do not switch to English, Arabic or Arabizi. Retain original brand names and familiar dish names only when needed to identify them.',
  ar: 'Arabic using Arabic script. Write all prose, recipe titles, preparation steps, ingredient names and quantities in Arabic. Retain original brand names only when needed to identify a product.',
  arz: 'Arabizi: conversational Lebanese Arabic written in Latin letters, with familiar numerals such as 2, 3 and 7 when helpful. For example: "Eh, fik ta3mol pasta ma3 djej la 3 ashkhas." Write the entire answer, recipe titles, preparation steps, ingredient names and quantities in this style. Never use Arabic script. Do not answer in English sentences. Retain original brand names and familiar dish names when needed.',
};

export function replyUsesCorrectScript(reply, language) {
  const prose = [reply.answer, reply.recipe?.title, ...(reply.recipe?.steps || []),
    ...(reply.items || []).flatMap(item => [item.name, item.amount])].filter(Boolean).join(' ');
  if (language !== 'ar') {
    if (arabicScript.test(prose)) return false;
    if (['arz', 'fr'].includes(language) && /\b(?:you can|you will|here are|here is|the ingredients|cook the|add the|mix the|serve with|i can|i found|this is|these are|let me|to make|you need)\b/i.test(prose)) return false;
    if (language === 'fr' && isArabizi(prose)) return false;
    return true;
  }
  const main = [reply.answer, reply.recipe?.title, ...(reply.recipe?.steps || [])].filter(Boolean).join(' ');
  return !latinScript.test(main) || arabicScript.test(main);
}

// Ingredient rows are written in a standard readable language. The surrounding
// conversation, recipe title and cooking instructions keep the shopper's language.
export const recipeIngredientLanguage = language => language === 'arz' ? 'en' : language;

export function recipeSlotLanguage(key, language) {
  return /^(?:name|amount):/.test(key) ? recipeIngredientLanguage(language) : language;
}

export function recipeSlotUsesCorrectLanguage(key, text, language) {
  if (typeof text !== 'string' || !text.trim()) return true;
  const expected = recipeSlotLanguage(key,language);
  if (expected === 'ar') return [...text].every(char=>!/\p{L}/u.test(char)||arabicScript.test(char));
  if (!replyUsesCorrectScript({answer:text},expected)) return false;
  const ingredient=/^(?:name|amount):/.test(key);
  if(!ingredient){
    // Judge complete sentences independently. A correct opening sentence must not
    // hide an English cooking step inside an otherwise Arabizi or French recipe.
    const english=(text.match(/\b(?:the|and|with|then|until|into|from|in|over|for|of|place|rinse|wash|drain|add|stir|simmer|bring|remove|cover|heat|cook|mix|serve|slice|chop|peel|bake|pour|season|combine|reserve|boil|reduce|stirring|occasionally|minutes|tender|gently|lebanese)\b/gi)||[]).length;
    if(expected==='arz'){
      const levantine=(text.match(/\b(?:el|il|w|ma3|bel|bil|lal|la|men|min|ta7t|fo2|awal|ba3den|ba3d|7atta|3a|3al|bala|shway|shwayyet|mni7|halla2|hayde|hayda|ghassel|eslo2|sakhin|khallet|zid|7ot|7otti|2atta3|dawwib|etbokh|ghall[iy]|2addem|2addim)\b/gi)||[]).length;
      if(english>=2&&english>levantine)return false;
      if(key==='title'&&/\b(?:lebanese|with|without|and|soup|chicken|potato|vegetable|lentil|recipe)\b/i.test(text)&&!levantine&&!isArabizi(text))return false;
    }
    if(expected==='fr'){
      const french=(text.match(/\b(?:le|la|les|de|du|des|dans|avec|et|puis|au|aux|sur|pour|faites|ajoutez|m[ée]langez|coupez|rincez|servez|laissez|versez|chauffez)\b/gi)||[]).length;
      if(english>=2&&english>french)return false;
    }
    if(expected==='en'&&key!=='title'&&isArabizi(text)&&!english)return false;
  }
  if (expected === 'en' && ingredient) {
    const folded=text.toLowerCase().trim();
    // Familiar food names such as hummus and labneh are legitimate English labels.
    if (isArabizi(text) || /\b(?:ba2dounes|banadoura|na3na3|toum|khyar|basal|mele7|mal3a2a|ma3ale2|damme|7abbe|3elbe|fass|3a zaw2ak|7asab el zaw2)\b/i.test(folded)) return false;
  }
  if(expected==='fr'&&/^(?:name|amount):/.test(key)&&/\b(?:whole chicken|chicken breast|fresh milk|heavy cream|unsalted butter|red lentils|white onion|olive oil|ground pepper|black pepper|salt|butter|flour|eggs?|chicken|lentils?|rice|garlic|potatoes|tomatoes|carrots|pieces?|packs?|cups?|cans?|cloves?|tablespoons?|teaspoons?|to taste)\b/i.test(text))return false;
  return true;
}

export function recipeReplyUsesCorrectLanguages(reply, language) {
  if (!reply.recipe) return replyUsesCorrectScript(reply,language);
  if (!recipeSlotUsesCorrectLanguage('answer',reply.answer,language) || !recipeSlotUsesCorrectLanguage('title',reply.recipe.title,language)) return false;
  if (!(reply.recipe.steps||[]).every((step,index)=>recipeSlotUsesCorrectLanguage('step:'+index,step,language))) return false;
  return (reply.items||[]).every((item,index)=>recipeSlotUsesCorrectLanguage('name:'+index,item.name,language)&&recipeSlotUsesCorrectLanguage('amount:'+index,item.amount,language));
}

export function arabicRecipeUnits(text) {
  if(typeof text!=='string')return text;
  const units={kg:'كغ',gr:'غ',g:'غ',ml:'مل',cl:'سل',l:'لتر',lb:'رطل',oz:'أونصة',tbsp:'ملعقة كبيرة',tsp:'ملعقة صغيرة',pcs:'قطع',piece:'قطعة',pieces:'قطع',pack:'عبوة',packs:'عبوات',cup:'كوب',cups:'أكواب',clove:'فص',cloves:'فصوص',can:'علبة',cans:'علب'};
  return text.replace(/(\p{Nd}+(?:[.,٫]\p{Nd}+)?)\s*(kg|gr|g|ml|cl|l|lb|oz|tbsp|tsp|pcs|pieces?|packs?|cups?|cloves?|cans?)\b/giu,(_,number,unit)=>number+' '+units[unit.toLowerCase()]);
}

export const arabiziChatCopy = {
  products: 'Natayej el catalog', results: 'El products li la2ayton', steps: 'Tari2et el ta7dir',
  minutes: 'd2i2a', serves: '7sas', add: 'Zid 3al list', added: 'Nzad 3a list el moshtarayet.',
  already: 'Mawjoud 3a list el moshtarayet.', onList: 'Mawjoud 3al list',
  all: 'Zid kel el mokawwenet 3al list', allProducts: 'Zid kel el products 3al list',
  inStock: 'Mawjoud', outOfStock: 'Mish mawjoud', unknown: 'El tawaffor mish m2akkad',
  available: 'Mawjoud', unavailable: 'Mish mawjoud', promotion: '3ard',
  noIngredient: 'El tawaffor mish m2akkad', energy: 'Ta2dir el calories la kel 7asse',
  genericEnergy: 'Ta2dir', labelMissing: 'Ma fi ma3loumet ghize2iyye bel catalog la hal product.',
  ingredients: 'El mokawwenet', allergens: 'Mawad momken ta3mol 7asasiye',
  typing: '3am fattesh...', retry: 'Ma 2deret jib el jawab. Jarrib marra tenye.',
  fallback: 'Khedmet el AI mish metwafra halla2. Hayde el natije men el catalog.',
  website: 'Maw2a3 Al Makhazen',
};

export const arabiziMessages = {
  products: 'Hayde el products li la2ayton.', unavailable: 'Hal product mish mawjoud.',
  soldOut: 'Hal product mish mawjoud.',
  store: 'Fout 3a maw2a3 Al Makhazen la tet2akkad men el delivery, el estilem, w ma3loumet el fer3.',
  greeting: 'Marhaba! Fiyye se3dak tle2e products, tes2al 3an el as3ar, aw t7addir wasfe ma3 list el moshtarayet.',
  scope: 'Fiyye se3dak bi products COOP, el as3ar, el wasfet, list el moshtarayet, w as2ile 3an el supermarket.',
  ideas: 'Fik ta3mol tabbouleh, fattoush, 7ommos, mjaddara aw batata 7arra. Shou bte7eb?',
  example: 'Ma la2ayt natije la hal talab. Jarrib esem el product aw el wasfe.',
  empty: 'Ma la2ayt products bi hal budget bel catalog.',
};

export const arabiziIngredients = {
  parsley: 'ba2dounes', tomatoes: 'banadoura', mint: 'na3na3', lemons: '7amod',
  onions: 'basal', cucumbers: 'khyar', lettuce: 'khass', garlic: 'toum',
  potatoes: 'batata', radishes: 'fejel', 'spring-onions': 'basal akhdar',
  bulgur: 'burghol', 'olive-oil': 'zeit zaytoun', chickpeas: '7ommos', tahini: 't7ine',
  lentils: '3adas', rice: 'rezz', sumac: 'somma2', molasses: 'debs remmen',
  salt: 'mele7', pita: 'khebez 3arabe', cumin: 'kammoun', paprika: 'paprika',
};

export const arabiziUnits = { bunch: 'damme', whole: '7abbe', head: 'ras', g: 'g',
  tbsp: 'mal3a2a kbire', tsp: 'mal3a2a zghire', can: '3elbe', clove: 'fass' };

export const arabiziRecipes = {
  tabbouleh: { title: 'Tabbouleh', steps: ['Ghsil el khodra w nashshefa mni7.', 'Na22e3 el burghol, w farrom el ba2dounes, el na3na3, el banadoura w el basal na3em.', 'Khallot el mokawwenet ma3 el 7amod, el zeit w el mele7, w 2addem el tabbouleh taza.'] },
  fattoush: { title: 'Fattoush', steps: ['Ghsil el khodra w 2atta3a.', '7ammes el khebez la ysir m2armash.', 'Khallot el khodra ma3 el toum, el 7amod, el zeit, el somma2 w el mele7.', 'Zid el khebez abel el ta2dim la ydal m2armash.'] },
  hummus: { title: '7ommos bi t7ine', steps: ['Saffe el 7ommos w ghslo.', 'E7an el 7ommos ma3 el t7ine, el 7amod, el toum w el mele7.', 'Zid shwayyet may la tousal lal konsistens li bte7ebba, w 2addmo ma3 zeit zaytoun.'] },
  mujaddara: { title: 'Mjaddara', steps: ['Ghsil el 3adas w eslo2o la yitrayya.', '7ammer el basal bel zeit.', 'Zid el rezz, el mele7 w may 7asab el 7aje ma3 el 3adas.', 'Khalli el tanjra 3a nar hadye la yistwe el rezz, w 2addma ma3 el basal el m7ammar.'] },
  'batata-harra': { title: 'Batata 7arra', steps: ['2atta3 el batata mka3bat w 7ammesa bel forn ma3 shwayyet zeit la testawe.', '2alleb el toum w el paprika bel zeit.', 'Zid el batata, el 7amod w el mele7, khalloton w 2addma sekhne.'] },
};

export const frenchChatCopy = {
  results: 'Produits du catalogue', steps: 'Préparation', minutes: 'min', serves: 'personnes',
  add: 'Ajouter à la liste', added: 'Ajouté à votre liste de courses.', already: 'Déjà dans votre liste de courses.',
  onList: 'Dans votre liste', all: 'Ajouter tous les ingrédients', allProducts: 'Ajouter tous les produits',
  available: 'Disponible', unavailable: 'Indisponible', inStock: 'Disponible', outOfStock: 'Épuisé', unknown: 'Disponibilité non confirmée',
  promotion: 'Promotion', noIngredient: 'Disponibilité non confirmée', energy: 'Calories estimées par personne',
  genericEnergy: 'Estimation', labelMissing: 'Informations nutritionnelles absentes du catalogue pour ce produit.',
  ingredients: 'Ingrédients', allergens: 'Allergènes', typing: 'Recherche en cours…',
  retry: 'Impossible de charger la réponse. Veuillez réessayer.',
  fallback: 'Le service IA est indisponible. Cette réponse utilise le catalogue.', website: 'Site Al Makhazen',
};

export const frenchMessages = {
  products: 'Voici les produits trouvés dans le catalogue.', unavailable: 'Ce produit est indisponible.', soldOut: 'Ce produit est épuisé.',
  store: 'Consultez le site Al Makhazen pour les informations sur la livraison, le retrait, les magasins et les commandes.',
  greeting: 'Bonjour ! Je peux vous aider à trouver des produits, vérifier les prix ou préparer une recette et sa liste de courses.',
  scope: 'Je peux vous aider avec les produits COOP, les prix, les recettes, les listes de courses et les questions sur le magasin.',
  ideas: 'Vous pouvez préparer du taboulé, du fattouche, du houmous, de la moujadara ou des pommes de terre épicées. Que préférez-vous ?',
  example: 'Aucun produit correspondant trouvé. Essayez un autre nom de produit ou de recette.',
  empty: 'Aucun produit correspondant à ce budget trouvé dans le catalogue.',
};

export const frenchIngredients = {
  parsley: 'persil', tomatoes: 'tomates', mint: 'menthe', lemons: 'citrons', onions: 'oignons',
  cucumbers: 'concombres', lettuce: 'laitue', garlic: 'ail', potatoes: 'pommes de terre', radishes: 'radis',
  'spring-onions': 'oignons nouveaux', bulgur: 'boulgour', 'olive-oil': 'huile d’olive', chickpeas: 'pois chiches',
  tahini: 'tahini', lentils: 'lentilles', rice: 'riz', sumac: 'sumac', molasses: 'mélasse de grenade',
  salt: 'sel', pita: 'pain pita', cumin: 'cumin', paprika: 'paprika',
};
export const frenchUnits = { bunch: ['botte', 'bottes'], whole: ['pièce', 'pièces'], head: ['pièce', 'pièces'],
  g: ['g', 'g'], tbsp: ['c. à soupe', 'c. à soupe'], tsp: ['c. à café', 'c. à café'], can: ['boîte', 'boîtes'], clove: ['gousse', 'gousses'] };
export const frenchRecipes = {
  tabbouleh: { title: 'Taboulé', steps: ['Lavez et séchez les légumes et les herbes.', 'Faites tremper le boulgour. Hachez finement le persil, la menthe, les tomates et les oignons.', 'Mélangez avec le jus de citron, l’huile d’olive et le sel. Servez frais.'] },
  fattoush: { title: 'Fattouche', steps: ['Lavez et coupez les légumes.', 'Faites griller le pain jusqu’à ce qu’il soit croustillant.', 'Mélangez les légumes avec l’ail, le citron, l’huile, le sumac et le sel.', 'Ajoutez le pain juste avant de servir.'] },
  hummus: { title: 'Houmous', steps: ['Égouttez et rincez les pois chiches.', 'Mixez-les avec le tahini, le citron, l’ail et le sel.', 'Ajoutez un peu d’eau pour ajuster la texture, puis servez avec l’huile d’olive.'] },
  mujaddara: { title: 'Moujadara', steps: ['Rincez les lentilles et faites-les cuire jusqu’à ce qu’elles soient tendres.', 'Faites dorer les oignons dans l’huile.', 'Ajoutez le riz aux lentilles avec du sel et suffisamment d’eau.', 'Laissez cuire à feu doux jusqu’à cuisson du riz. Servez avec les oignons dorés.'] },
  'batata-harra': { title: 'Pommes de terre épicées', steps: ['Coupez les pommes de terre en cubes et faites-les rôtir au four avec un peu d’huile.', 'Faites revenir l’ail et le paprika dans l’huile.', 'Ajoutez les pommes de terre, le citron et le sel. Mélangez et servez chaud.'] },
};
