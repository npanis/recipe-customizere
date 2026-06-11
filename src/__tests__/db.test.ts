import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  _setDataFile,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '../lib/db';

// ─── Temp file setup ──────────────────────────────────────────────────────────

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-test-'));
const TEMP_FILE = path.join(TEMP_DIR, 'recipes.json');

beforeAll(() => _setDataFile(TEMP_FILE));
afterAll(() => fs.rmSync(TEMP_DIR, { recursive: true }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seedFile(data: object[]) {
  fs.writeFileSync(TEMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function clearFile() {
  if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);
}

const SAMPLE_RECIPE = {
  id: 'pandesal',
  name: 'Pandesal',
  baseYieldPieces: 10,
  weightPerPiece: 43,
  ingredients: [{ name: 'Bread flour', amount: 230, unit: 'g' as const }],
  steps: ['Mix', 'Bake'],
  notes: [] as string[],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => clearFile());

describe('getAllRecipes', () => {
  it('returns empty array when file has no recipes', () => {
    seedFile([]);
    expect(getAllRecipes()).toEqual([]);
  });

  it('returns all recipes sorted by name', () => {
    seedFile([
      { ...SAMPLE_RECIPE, id: 'b', name: 'Banana Bread' },
      { ...SAMPLE_RECIPE, id: 'a', name: 'Apple Cake' },
    ]);
    const names = getAllRecipes().map((r) => r.name);
    expect(names).toEqual(['Apple Cake', 'Banana Bread']);
  });

  it('seeds from recipes.ts when file does not exist', () => {
    // No seedFile call — db.ts should auto-seed on missing file
    const recipes = getAllRecipes();
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]).toHaveProperty('id');
  });
});

describe('getRecipeById', () => {
  beforeEach(() => seedFile([SAMPLE_RECIPE]));

  it('returns the recipe when found', () => {
    const recipe = getRecipeById('pandesal');
    expect(recipe).not.toBeNull();
    expect(recipe?.name).toBe('Pandesal');
  });

  it('returns null for an unknown id', () => {
    expect(getRecipeById('nonexistent')).toBeNull();
  });
});

describe('createRecipe', () => {
  beforeEach(() => seedFile([]));

  it('creates a recipe and returns it', () => {
    const created = createRecipe({
      name: 'Ensaymada',
      baseYieldPieces: 8,
      weightPerPiece: 60,
      ingredients: [],
      steps: ['Mix', 'Bake'],
      notes: [],
    });
    expect(created.id).toBe('ensaymada');
    expect(created.name).toBe('Ensaymada');
  });

  it('persists the recipe so it appears in getAllRecipes', () => {
    createRecipe({ ...SAMPLE_RECIPE, id: undefined });
    expect(getAllRecipes()).toHaveLength(1);
  });

  it('auto-generates id from name', () => {
    const recipe = createRecipe({ ...SAMPLE_RECIPE, id: undefined, name: 'Ube Halaya' });
    expect(recipe.id).toBe('ube-halaya');
  });

  it('throws when a duplicate id would be created', () => {
    createRecipe({ ...SAMPLE_RECIPE, id: undefined });
    expect(() => createRecipe({ ...SAMPLE_RECIPE, id: undefined })).toThrow();
  });
});

describe('updateRecipe', () => {
  beforeEach(() => seedFile([SAMPLE_RECIPE]));

  it('updates fields and returns the updated recipe', () => {
    const updated = updateRecipe('pandesal', { name: 'Pandesal Updated', baseYieldPieces: 12 });
    expect(updated?.name).toBe('Pandesal Updated');
    expect(updated?.baseYieldPieces).toBe(12);
  });

  it('persists the update', () => {
    updateRecipe('pandesal', { baseYieldPieces: 20 });
    expect(getRecipeById('pandesal')?.baseYieldPieces).toBe(20);
  });

  it('returns null for an unknown id', () => {
    expect(updateRecipe('ghost', { name: 'Ghost' })).toBeNull();
  });
});

describe('deleteRecipe', () => {
  beforeEach(() => seedFile([SAMPLE_RECIPE]));

  it('deletes the recipe and returns true', () => {
    expect(deleteRecipe('pandesal')).toBe(true);
    expect(getRecipeById('pandesal')).toBeNull();
  });

  it('returns false for an unknown id', () => {
    expect(deleteRecipe('nonexistent')).toBe(false);
  });

  it('reduces the recipe count by 1', () => {
    deleteRecipe('pandesal');
    expect(getAllRecipes()).toHaveLength(0);
  });
});
