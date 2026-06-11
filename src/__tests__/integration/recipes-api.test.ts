/**
 * Integration tests for /api/recipes and /api/recipes/[id]
 *
 * These call the actual Next.js route handlers with real Request objects and
 * real file I/O (temp file). No mocking of business logic — suitable for CI/CD.
 *
 * Run: npm run test:integration
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { _setDataFile } from '../../lib/db';

// ─── Isolated temp file for this suite ───────────────────────────────────────

const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'recipes-api-integration-'));
const TEMP_FILE = path.join(TEMP_DIR, 'recipes.json');

// Must be called before route handlers use the db module
beforeAll(() => {
  _setDataFile(TEMP_FILE);
});

afterAll(() => {
  fs.rmSync(TEMP_DIR, { recursive: true });
});

// Lazy imports so _setDataFile runs first (ts-jest compiles to CJS — requires are ordered)
import { GET as listRecipes, POST as createRecipe } from '../../app/api/recipes/route';
import {
  GET as getRecipe,
  PUT as updateRecipe,
  DELETE as deleteRecipe,
} from '../../app/api/recipes/[id]/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost:3000/api/recipes', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

function makeIdRequest(id: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost:3000/api/recipes/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SAMPLE_PAYLOAD = {
  name: 'Pandesal',
  baseYieldPieces: 10,
  weightPerPiece: 43,
  ingredients: [
    { name: 'Bread flour', amount: 230, unit: 'g' },
    { name: 'Sugar', amount: 30, unit: 'g' },
    { name: 'Instant yeast', amount: 5, unit: 'g' },
    { name: 'Water', amount: 120, unit: 'ml' },
  ],
  steps: ['Mix all dry ingredients', 'Knead dough', 'Proof and bake'],
  notes: ['Bake at 180°C for 12–15 min'],
};

// Reset to empty file before each test so tests are fully independent
beforeEach(() => {
  fs.writeFileSync(TEMP_FILE, '[]', 'utf-8');
});

// ─── GET /api/recipes ─────────────────────────────────────────────────────────

describe('GET /api/recipes', () => {
  it('returns 200 with an empty array when no recipes exist', async () => {
    const res = await listRecipes();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns all saved recipes', async () => {
    // Seed two recipes via POST first
    await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
    await createRecipe(makeRequest('POST', { ...SAMPLE_PAYLOAD, name: 'Ensaymada' }));

    const res = await listRecipes();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('returns recipes sorted alphabetically by name', async () => {
    await createRecipe(makeRequest('POST', { ...SAMPLE_PAYLOAD, name: 'Pandesal' }));
    await createRecipe(makeRequest('POST', { ...SAMPLE_PAYLOAD, name: 'Ensaymada' }));

    const res = await listRecipes();
    const names = (await res.json()).map((r: { name: string }) => r.name);
    expect(names).toEqual(['Ensaymada', 'Pandesal']);
  });
});

// ─── POST /api/recipes ────────────────────────────────────────────────────────

describe('POST /api/recipes', () => {
  it('returns 201 and the created recipe', async () => {
    const res = await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('pandesal');
    expect(body.name).toBe('Pandesal');
    expect(body.baseYieldPieces).toBe(10);
    expect(body.ingredients).toHaveLength(4);
  });

  it('auto-generates an id from the recipe name', async () => {
    const res = await createRecipe(
      makeRequest('POST', { ...SAMPLE_PAYLOAD, name: 'Ube Halaya' })
    );
    const body = await res.json();
    expect(body.id).toBe('ube-halaya');
  });

  it('returns 400 when name is missing', async () => {
    const { name: _name, ...noName } = SAMPLE_PAYLOAD;
    const res = await createRecipe(makeRequest('POST', noName));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when baseYieldPieces is missing', async () => {
    const { baseYieldPieces: _y, ...noPieces } = SAMPLE_PAYLOAD;
    const res = await createRecipe(makeRequest('POST', noPieces));
    expect(res.status).toBe(400);
  });

  it('returns 400 when baseYieldPieces is zero', async () => {
    const res = await createRecipe(
      makeRequest('POST', { ...SAMPLE_PAYLOAD, baseYieldPieces: 0 })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 on duplicate recipe id', async () => {
    await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
    const res = await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/recipes/[id] ────────────────────────────────────────────────────

describe('GET /api/recipes/[id]', () => {
  beforeEach(async () => {
    await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
  });

  it('returns 200 and the recipe for a valid id', async () => {
    const res = await getRecipe(makeIdRequest('pandesal', 'GET'), params('pandesal'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Pandesal');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await getRecipe(makeIdRequest('ghost', 'GET'), params('ghost'));
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/recipes/[id] ────────────────────────────────────────────────────

describe('PUT /api/recipes/[id]', () => {
  beforeEach(async () => {
    await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
  });

  it('returns 200 and the updated recipe', async () => {
    const res = await updateRecipe(
      makeIdRequest('pandesal', 'PUT', { name: 'Pandesal Ube', baseYieldPieces: 12 }),
      params('pandesal')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Pandesal Ube');
    expect(body.baseYieldPieces).toBe(12);
  });

  it('persists only the changed fields', async () => {
    await updateRecipe(
      makeIdRequest('pandesal', 'PUT', { baseYieldPieces: 20 }),
      params('pandesal')
    );
    const res = await getRecipe(makeIdRequest('pandesal', 'GET'), params('pandesal'));
    const body = await res.json();
    expect(body.name).toBe('Pandesal'); // unchanged
    expect(body.baseYieldPieces).toBe(20); // updated
  });

  it('returns 404 for an unknown id', async () => {
    const res = await updateRecipe(
      makeIdRequest('ghost', 'PUT', { name: 'Ghost' }),
      params('ghost')
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/recipes/[id] ─────────────────────────────────────────────────

describe('DELETE /api/recipes/[id]', () => {
  beforeEach(async () => {
    await createRecipe(makeRequest('POST', SAMPLE_PAYLOAD));
  });

  it('returns 204 on successful deletion', async () => {
    const res = await deleteRecipe(makeIdRequest('pandesal', 'DELETE'), params('pandesal'));
    expect(res.status).toBe(204);
  });

  it('removes the recipe from the list after deletion', async () => {
    await deleteRecipe(makeIdRequest('pandesal', 'DELETE'), params('pandesal'));
    const res = await listRecipes();
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it('returns 404 when deleting an unknown id', async () => {
    const res = await deleteRecipe(makeIdRequest('ghost', 'DELETE'), params('ghost'));
    expect(res.status).toBe(404);
  });
});
