import { NextResponse } from 'next/server';
import { getAllRecipes, createRecipe } from '../../../lib/db';

export async function GET() {
  try {
    const recipes = getAllRecipes();
    return NextResponse.json(recipes);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load recipes';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? '').trim();
    const baseYieldPieces = Number(body?.baseYieldPieces);
    const weightPerPiece = Number(body?.weightPerPiece ?? 0);

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!Number.isFinite(baseYieldPieces) || baseYieldPieces <= 0) {
      return NextResponse.json({ error: 'baseYieldPieces must be a positive number' }, { status: 400 });
    }

    const recipe = createRecipe({
      name,
      baseYieldPieces,
      weightPerPiece,
      ingredients: body?.ingredients ?? [],
      steps: body?.steps ?? [],
      notes: body?.notes ?? [],
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create recipe';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
