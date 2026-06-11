/**
 * Persistent storage using a local JSON file (recipes.json at project root).
 * Uses Node's built-in `fs` — no native modules, works with Turbopack and webpack.
 */

import fs from 'fs';
import path from 'path';
import { recipes as seedRecipes } from '../data/recipes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbRecipe = {
  id: string;
  name: string;
  baseYieldPieces: number;
  weightPerPiece: number;
  ingredients: { name: string; amount: number; unit: 'g' | 'ml' }[];
  steps: string[];
  notes: string[];
};

// ─── File I/O ─────────────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), 'recipes.json');

function readAll(): DbRecipe[] {
  if (!fs.existsSync(DATA_FILE)) {
    // First run — seed from the static recipes.ts data
    const seed: DbRecipe[] = seedRecipes.map((r) => ({
      ...r,
      notes: r.notes ?? [],
    }));
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DbRecipe[];
}

function writeAll(recipes: DbRecipe[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getAllRecipes(): DbRecipe[] {
  return readAll().sort((a, b) => a.name.localeCompare(b.name));
}

export function getRecipeById(id: string): DbRecipe | null {
  return readAll().find((r) => r.id === id) ?? null;
}

export function createRecipe(
  input: Omit<DbRecipe, 'id'> & { id?: string }
): DbRecipe {
  const recipes = readAll();

  const id =
    input.id?.trim() ||
    input.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  if (recipes.find((r) => r.id === id)) {
    throw new Error(`A recipe with id "${id}" already exists`);
  }

  const recipe: DbRecipe = {
    id,
    name: input.name,
    baseYieldPieces: input.baseYieldPieces,
    weightPerPiece: input.weightPerPiece ?? 0,
    ingredients: input.ingredients ?? [],
    steps: input.steps ?? [],
    notes: input.notes ?? [],
  };

  recipes.push(recipe);
  writeAll(recipes);
  return recipe;
}

export function updateRecipe(
  id: string,
  updates: Partial<Omit<DbRecipe, 'id'>>
): DbRecipe | null {
  const recipes = readAll();
  const idx = recipes.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  recipes[idx] = { ...recipes[idx], ...updates };
  writeAll(recipes);
  return recipes[idx];
}

export function deleteRecipe(id: string): boolean {
  const recipes = readAll();
  const filtered = recipes.filter((r) => r.id !== id);
  if (filtered.length === recipes.length) return false;
  writeAll(filtered);
  return true;
}
