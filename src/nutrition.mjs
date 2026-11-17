const foodDataCentral = 'https://fdc.nal.usda.gov/';
const referenceEnergy = {
  parsley: 36, tomatoes: 18, cucumbers: 15, mint: 44, lemons: 22, onions: 40, 'spring-onions': 32,
  garlic: 149, lettuce: 17, radishes: 16, potatoes: 77, bulgur: 342, 'olive-oil': 884, chickpeas: 139,
  tahini: 595, lentils: 352, rice: 365, sumac: 270, molasses: 280, salt: 0, pita: 275, cumin: 375, paprika: 282,
};

const typicalGrams = {
  parsley: { bunch: 60 }, tomatoes: { whole: 123 }, cucumbers: { whole: 95 }, mint: { bunch: 25 },
  lemons: { whole: 35 }, onions: { whole: 110 }, 'spring-onions': { whole: 15 }, garlic: { clove: 3 },
  lettuce: { head: 400 }, radishes: { whole: 7 }, 'olive-oil': { tbsp: 13.5 },
  chickpeas: { can: 240 }, tahini: { tbsp: 15 }, sumac: { tsp: 2 },
  molasses: { tbsp: 20 }, salt: { tsp: 6 }, pita: { whole: 60 }, cumin: { tsp: 2.1 }, paprika: { tsp: 2.3 },
};

function estimateRecipeEnergy(recipe, servings) {
  let total = 0;
  for (const [id, amount, unit] of recipe.ingredients) {
    const grams = unit === 'g' ? amount : amount * typicalGrams[id]?.[unit];
    if (!Number.isFinite(grams) || !Object.hasOwn(referenceEnergy, id)) return null;
    total += grams * referenceEnergy[id] / 100;
  }
  const perServing = Math.round(total / recipe.servings);
  return { kcalPerServing: perServing, totalKcal: Math.round(total * servings / recipe.servings),
    sourceUrl: foodDataCentral, sourceKind: 'generic-estimate' };
}

function productEnergy(product, grams) {
  const label = product.nutrition;
  if (Number.isFinite(label?.kcal) && Number.isFinite(label?.basisGrams) && label.basisGrams > 0) {
    const basis = grams || label.basisGrams;
    return { kcal: Math.round(label.kcal * basis / label.basisGrams), grams: basis, sourceKind: 'label', sourceUrl: label.sourceUrl };
  }
  if (product.sourceKind === 'sample' && Object.hasOwn(referenceEnergy, product.id)) {
    const basis = grams || 100;
    return { kcal: Math.round(referenceEnergy[product.id] * basis / 100), grams: basis,
      sourceKind: 'generic-estimate', sourceUrl: foodDataCentral };
  }
  return null;
}

function calculateRecipeEnergy(items, servings) {
  if (!items.length || !Number.isInteger(servings) || servings < 1) return null;
  let total = 0;
  let estimated = false;
  for (const item of items) {
    const product = productsById.get(item.id);
    if (!product || !Number.isFinite(item.grams) || item.grams <= 0 || item.grams > 25000) return null;
    const energy = productEnergy(product, item.grams);
    if (!energy) return null;
    total += energy.kcal;
    estimated ||= energy.sourceKind === 'generic-estimate';
  }
  return { kcalPerServing: Math.round(total / servings), totalKcal: total,
    sourceKind: estimated ? 'generic-estimate' : 'catalog-estimate', sourceUrl: estimated ? foodDataCentral : null };
}
