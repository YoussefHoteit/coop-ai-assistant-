export const replyLanguages = ['en', 'ar', 'arz'];

const arabicScript = /(?=\p{L})\p{Script=Arabic}/u;
const latinScript = /\p{Script=Latin}/u;
const arabiziWords = /\b(?:marhaba|ahlan|badd[iey]|bade|badi|badna|baddna|ne7na|nehna|na7na|ma3e|ma3i|ma3na|ma3ak|3ande|3andi|3and\w*|shu|shou|kif|keef|adde|ade|addesh|addeish|2adde|2ade|2addesh|kam|hayda|hayde|haydi|haydol|halla2|hala2|bkam|bikaffi|bekaffe|bikaffe|ta3mol|ta3mel|a3mol|a3mel|a3mlo|a3mela|3mela|3mlo|bte2dar|fina|bteswa|bteswe|badde|akhas|arkhas|ar5as|ghale|ghali|nekol|nekol|nakol|nakoul|nkol|netbokh|ntbokh|matbakh|wasfe|wasfet|salam|yalla|merci|khalas|tayeb|tayyeb)\b|\b[a-z]+[23789][a-z]+\b|\b[23789][a-z]{3,}\b/i;

export function isArabizi(text) {
  return !arabicScript.test(text) && arabiziWords.test(text);
}

export function detectReplyLanguage(text, recentLanguage = 'en') {
  const recent = replyLanguages.includes(recentLanguage) ? recentLanguage : 'en';
  if (arabicScript.test(text)) return 'ar';
  if (isArabizi(text)) return 'arz';
  if (!latinScript.test(text) || /^(?:ok|okay|k|yes\/no)[.!?\s]*$/i.test(text)) return recent;
  return 'en';
}

export function chooseReplyLanguage(text, recentLanguage, classifiedLanguage) {
  const detected = detectReplyLanguage(text, recentLanguage);
  if (isArabizi(text) || (arabicScript.test(text) && !latinScript.test(text))) return detected;
  if (!arabicScript.test(text) && /\b(?:how|what|which|can|could|please|recommend|recipe|ingredients|price|write|give|need)\b/i.test(text) && !isArabizi(text)) return 'en';
  return replyLanguages.includes(classifiedLanguage) ? classifiedLanguage : detected;
}

export const replyLanguageInstructions = {
  en: 'English. Write all prose, recipe titles, preparation steps, ingredient names and quantities in English. Do not switch to Arabic or Arabizi.',
  ar: 'Arabic using Arabic script. Write all prose, recipe titles, preparation steps, ingredient names and quantities in Arabic. Retain original brand names only when needed to identify a product.',
  arz: 'Arabizi: conversational Lebanese Arabic written in Latin letters, with familiar numerals such as 2, 3 and 7 when helpful. For example: "Eh, fik ta3mol pasta ma3 djej la 3 ashkhas." Write the entire answer, recipe titles, preparation steps, ingredient names and quantities in this style. Never use Arabic script. Do not answer in English sentences. Retain original brand names and familiar dish names when needed.',
};

export function replyUsesCorrectScript(reply, language) {
  const prose = [reply.answer, reply.recipe?.title, ...(reply.recipe?.steps || []),
    ...(reply.items || []).flatMap(item => [item.name, item.amount])].filter(Boolean).join(' ');
  if (language !== 'ar') {
    if (arabicScript.test(prose)) return false;
    if (language === 'arz' && /\b(?:you can|you will|here are|here is|the ingredients|cook the|add the|mix the|serve with|i can|i found|this is|these are|let me|to make|you need)\b/i.test(prose)) return false;
    return true;
  }
  const main = [reply.answer, reply.recipe?.title, ...(reply.recipe?.steps || [])].filter(Boolean).join(' ');
  return !latinScript.test(main) || arabicScript.test(main);
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
