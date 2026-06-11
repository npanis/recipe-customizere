/**
 * Integration tests for POST /api/scale
 *
 * Calls the actual route handler with a real Request and a seeded temp file.
 * Tests the full pipeline: HTTP → route → db lookup → scale logic → response.
 *
 * Run: npm run test:integration
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { _setDataFile } from '../../lib/db';

// ─── Isolated temp file for this suite ───────────────────────────────────────

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scale-api-integration-'));
const TEMP_FILE = path.join(TEMP_DIR, 'recipes.json');

beforeAll(() => {
  _setDataFile(TEMP_FILE);
});

afterAll(() => {
  fs.rmSync(TEMP_DIR, { recursive: true });
});

import { POST as scaleRecipe } from '../../app/api/scale/route';
import { POST as createRecipe } from '../../app/api/recipes/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scaleRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/scale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Seed recipe used across all scale tests
const PANDESAL = {
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
  steps: ['Mix', 'Knead', 'Proof', 'Bake'],
  notes: ['Bake at 180°C'],
};

// Seed once for the whole suite — scale tests are read-only
beforeAll(async () => {
  fs.writeFileSync(TEMP_FILE, '[]', 'utf-8');
  await createRecipe(
    new Request('http://localhost:3000/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PANDESAL),
    })
  );
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('POST /api/scale — happy path', () => {
  it('returns 200 with correct metadata', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recipeId).toBe('pandesal');
    expect(body.recipeName).toBe('Pandesal');
    expect(body.baseYieldPieces).toBe(10);
    expect(body.targetPieces).toBe(5);
    expect(body.factor).toBeCloseTo(0.5);
  });

  it('scales ingredients by the correct factor (÷2)', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 5 }));
    const { ingredients } = await res.json();
    const flour = ingredients.find((i: { name: string }) => i.name === 'Bread flour');
    expect(flour.amount).toBe(115); // 230 * 0.5
  });

  it('scales to the base yield (factor = 1) returns original amounts', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 10 }));
    const { ingredients, factor } = await res.json();
    expect(factor).toBe(1);
    const flour = ingredients.find((i: { name: string }) => i.name === 'Bread flour');
    expect(flour.amount).toBe(230);
  });

  it('scales up correctly (×2)', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 20 }));
    const { ingredients } = await res.json();
    const flour = ingredients.find((i: { name: string }) => i.name === 'Bread flour');
    expect(flour.amount).toBe(460); // 230 * 2
  });

  it('scales down to a single piece', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 1 }));
    const { ingredients } = await res.json();
    const water = ingredients.find((i: { name: string }) => i.name === 'Water');
    expect(water.amount).toBe(12); // 120 * 0.1 = 12ml
  });

  it('applies rounding rules: yeast rounds to 0.1g', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 3 }));
    const { ingredients } = await res.json();
    const yeast = ingredients.find((i: { name: string }) => i.name === 'Instant yeast');
    // 5 * 0.3 = 1.5 → rounds to 1.5 (0.1g precision)
    expect(yeast.amount).toBe(1.5);
  });

  it('applies rounding rules: salt rounds to 0.5g', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 3 }));
    const { ingredients } = await res.json();
    const salt = ingredients.find((i: { name: string }) => i.name === 'Salt');
    // 5 * 0.3 = 1.5 → rounds to 1.5 (nearest 0.5g)
    expect(salt.amount).toBe(1.5);
  });

  it('passes steps through unchanged', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 5 }));
    const { steps } = await res.json();
    expect(steps).toEqual(PANDESAL.steps);
  });

  it('passes notes through unchanged', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 5 }));
    const { notes } = await res.json();
    expect(notes).toEqual(PANDESAL.notes);
  });
});

// ─── Validation errors ────────────────────────────────────────────────────────

describe('POST /api/scale — validation errors', () => {
  it('returns 400 when recipeId is missing', async () => {
    const res = await scaleRecipe(scaleRequest({ targetPieces: 5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when targetPieces is missing', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when targetPieces is zero', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when targetPieces is negative', async () => {
    const res = await scaleRecipe(scaleRequest({ recipeId: 'pandesal', targetPieces: -3 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const res = await scaleRecipe(
      new Request('http://localhost:3000/api/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when recipeId does not exist', async () => {
    const res = await scaleRecipe(
      scaleRequest({ recipeId: 'nonexistent-recipe', targetPieces: 5 })
    );
    expect(res.status).toBe(404);
  });
});
