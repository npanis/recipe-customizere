import { scaleRecipe, roundAmount } from '../lib/scale';
import type { Recipe } from '../data/recipes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_RECIPE: Recipe = {
  id: 'pandesal',
  name: 'Pandesal',
  baseYieldPieces: 10,
  weightPerPiece: 43,
  ingredients: [
    { name: 'Bread flour', amount: 230, unit: 'g' },
    { name: 'Sugar', amount: 30, unit: 'g' },
    { name: 'Salt', amount: 5, unit: 'g' },
    { name: 'Instant yeast', amount: 5, unit: 'g' },
    { name: 'Water', amount: 120, unit: 'ml' },
    { name: 'Butter (soft)', amount: 25, unit: 'g' },
  ],
  steps: ['Mix', 'Knead', 'Bake'],
  notes: ['A note'],
};

// ─── roundAmount ──────────────────────────────────────────────────────────────

describe('roundAmount', () => {
  it('rounds yeast to 1 decimal place', () => {
    expect(roundAmount('Instant yeast', 'g', 2.55)).toBe(2.6);
    expect(roundAmount('instant yeast', 'g', 1.04)).toBe(1.0);
  });

  it('rounds salt to nearest 0.5g', () => {
    expect(roundAmount('Salt', 'g', 3.3)).toBe(3.5);
    expect(roundAmount('salt', 'g', 2.1)).toBe(2.0);
  });

  it('rounds sugar to nearest 0.5g', () => {
    expect(roundAmount('Sugar', 'g', 9.3)).toBe(9.5);
    expect(roundAmount('Brown Sugar', 'g', 14.8)).toBe(15.0);
  });

  it('rounds liquids to nearest 1ml', () => {
    expect(roundAmount('Water', 'ml', 36.6)).toBe(37);
    expect(roundAmount('Milk', 'ml', 99.4)).toBe(99);
  });

  it('rounds everything else to nearest 1g', () => {
    expect(roundAmount('Bread flour', 'g', 69.2)).toBe(69);
    expect(roundAmount('Butter', 'g', 7.7)).toBe(8);
  });
});

// ─── scaleRecipe ──────────────────────────────────────────────────────────────

describe('scaleRecipe', () => {
  it('returns correct metadata', () => {
    const result = scaleRecipe(BASE_RECIPE, 5);
    expect(result.recipeId).toBe('pandesal');
    expect(result.recipeName).toBe('Pandesal');
    expect(result.baseYieldPieces).toBe(10);
    expect(result.targetPieces).toBe(5);
    expect(result.factor).toBeCloseTo(0.5);
  });

  it('scales ingredients by the correct factor', () => {
    const result = scaleRecipe(BASE_RECIPE, 5); // factor = 0.5
    const flour = result.ingredients.find((i) => i.name === 'Bread flour');
    expect(flour?.amount).toBe(115); // 230 * 0.5
  });

  it('scales to the same quantity as base (factor = 1)', () => {
    const result = scaleRecipe(BASE_RECIPE, 10);
    const flour = result.ingredients.find((i) => i.name === 'Bread flour');
    expect(flour?.amount).toBe(230);
    expect(result.factor).toBe(1);
  });

  it('scales up correctly (more pieces than base)', () => {
    const result = scaleRecipe(BASE_RECIPE, 20); // factor = 2
    const flour = result.ingredients.find((i) => i.name === 'Bread flour');
    expect(flour?.amount).toBe(460); // 230 * 2
  });

  it('scales a single piece correctly', () => {
    const result = scaleRecipe(BASE_RECIPE, 1); // factor = 0.1
    const water = result.ingredients.find((i) => i.name === 'Water');
    expect(water?.amount).toBe(12); // 120 * 0.1 = 12ml
  });

  it('preserves steps unchanged', () => {
    const result = scaleRecipe(BASE_RECIPE, 5);
    expect(result.steps).toEqual(BASE_RECIPE.steps);
  });

  it('preserves notes, defaulting to [] when undefined', () => {
    const result = scaleRecipe(BASE_RECIPE, 5);
    expect(result.notes).toEqual(['A note']);

    const noNotes = { ...BASE_RECIPE, notes: undefined };
    expect(scaleRecipe(noNotes, 5).notes).toEqual([]);
  });

  it('handles fractional target pieces', () => {
    const result = scaleRecipe(BASE_RECIPE, 3);
    expect(result.factor).toBeCloseTo(0.3);
    // Flour: 230 * 0.3 = 69 (rounded to nearest 1g)
    const flour = result.ingredients.find((i) => i.name === 'Bread flour');
    expect(flour?.amount).toBe(69);
  });
});
