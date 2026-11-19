export function mentionsInternalData(reply) {
  const text = [reply.answer, reply.recipe?.title, ...(reply.recipe?.steps || [])].filter(Boolean).join(' ');
  return /\b(?:catalog(?:ue)?s?|snapshots?|databases?|screenshots?|inventory|public listings|i found|i didn.t find it earlier)\b|كتالوج|الكاتالوغ|لقطة الكتالوج|قاعدة البيانات/iu.test(text);
}

export const customerCopy = {
  en: { results: 'Products', inStock: 'Available', outOfStock: 'Out of stock', available: 'Available', unavailable: 'Out of stock',
    noIngredient: 'We couldn’t find this item', unknown: 'Availability needs confirmation',
    approved: 'Prices in USD', screenshot: 'Prices in USD', sample: 'Prices in USD',
    fallback: 'Here are the product options.', labelMissing: 'Nutrition information is unavailable for this product.' },
  ar: { results: 'المنتجات', inStock: 'متوفر', outOfStock: 'غير متوفر', available: 'متوفر', unavailable: 'غير متوفر',
    noIngredient: 'لم أجد هذا المنتج', unknown: 'التوفر بحاجة إلى تأكيد',
    approved: 'الأسعار بالدولار الأمريكي', screenshot: 'الأسعار بالدولار الأمريكي', sample: 'الأسعار بالدولار الأمريكي',
    fallback: 'هذه خيارات المنتجات.', labelMissing: 'المعلومات الغذائية غير متوفرة لهذا المنتج.' },
  arz: { results: 'El products', inStock: 'Mawjoud', outOfStock: 'Mish mawjoud', available: 'Mawjoud', unavailable: 'Mish mawjoud',
    noIngredient: 'Ma la2ayt hal product', unknown: 'Lezim net2akkad men el tawaffor',
    approved: 'El as3ar bel dollar', screenshot: 'El as3ar bel dollar', sample: 'El as3ar bel dollar',
    fallback: 'Hayde khiyarat el products.', labelMissing: 'Ma fi ma3loumet ghize2iyye la hal product.' },
  fr: { results: 'Produits', inStock: 'Disponible', outOfStock: 'Épuisé', available: 'Disponible', unavailable: 'Épuisé',
    noIngredient: 'Nous n’avons pas trouvé cet article', unknown: 'Disponibilité à confirmer',
    approved: 'Prix en dollars américains', screenshot: 'Prix en dollars américains', sample: 'Prix en dollars américains',
    fallback: 'Voici les produits proposés.', labelMissing: 'Les informations nutritionnelles ne sont pas disponibles pour ce produit.' },
};

export const customerMessages = {
  en: { products: 'Here are the options we have.', unavailable: 'That item is out of stock.', soldOut: 'That item is out of stock.',
    example: 'We couldn’t find that item. Try another name or tell us what you need it for.', empty: 'We couldn’t find a suitable option within that budget.',
    missingRecipe: 'We couldn’t find an option for every ingredient. See the items below.', soldOutRecipe: 'Some ingredients are out of stock. See availability below.' },
  ar: { products: 'هذه الخيارات المتوفرة لدينا.', unavailable: 'هذا المنتج غير متوفر.', soldOut: 'هذا المنتج غير متوفر.',
    example: 'لم أجد هذا المنتج. جرّب اسماً آخر أو أخبرنا بماذا تريد استخدامه.', empty: 'لم أجد خياراً مناسباً ضمن هذه الميزانية.',
    missingRecipe: 'لم أجد خياراً لكل المكونات. راجع المنتجات أدناه.', soldOutRecipe: 'بعض المكونات غير متوفرة. الحالة موضّحة أدناه.' },
  arz: { products: 'Hayde el khiyarat li 3anna.', unavailable: 'Hal product mish mawjoud.', soldOut: 'Hal product mish mawjoud.',
    example: 'Ma la2ayt hal product. Jarrib esem tene aw ellna la shou baddak yeh.', empty: 'Ma la2ayt khiyar mneseb la hal budget.',
    missingRecipe: 'Ma la2ayt khiyar la kel el mokawwenet. Shouf el products ta7t.', soldOutRecipe: 'Fi mokawwenet mish metwafra. Shouf el 7ale ta7t.' },
  fr: { products: 'Voici les options que nous proposons.', unavailable: 'Cet article est épuisé.', soldOut: 'Cet article est épuisé.',
    example: 'Nous n’avons pas trouvé cet article. Essayez un autre nom ou indiquez-nous son utilisation.', empty: 'Nous n’avons pas trouvé d’option adaptée à ce budget.',
    missingRecipe: 'Nous n’avons pas trouvé une option pour chaque ingrédient. Consultez les articles ci-dessous.', soldOutRecipe: 'Certains ingrédients sont épuisés. Consultez leur disponibilité ci-dessous.' },
};
