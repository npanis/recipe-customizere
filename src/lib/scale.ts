import { Ingredient, Recipe } from "../data/recipes";

function roundAmount(name: string, unit: Ingredient["unit"], value: number) {
  const n = name.toLowerCase();

  // Yeast is usually tiny → keep 0.1g precision
  if (n.includes("yeast")) return Math.round(value * 10) / 10;

  // Salt/sugar often better to half-grams
  if (n.includes("salt") || n.includes("sugar")) return Math.round(value * 2) / 2;

  // Liquids: keep 1 ml
  if (unit === "ml") return Math.round(value);

  // Default: 1g
  return Math.round(value);
}

export function scaleRecipe(recipe: Recipe, targetPieces: number) {
  const factor = targetPieces / recipe.baseYieldPieces;

  const scaledIngredients = recipe.ingredients.map((ing) => {
    const raw = ing.amount * factor;
    return {
      ...ing,
      amount: roundAmount(ing.name, ing.unit, raw),
    };
  });

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    baseYieldPieces: recipe.baseYieldPieces,
    targetPieces,
    factor,
    ingredients: scaledIngredients,
    steps: recipe.steps,
    notes: recipe.notes ?? [],
  };
}