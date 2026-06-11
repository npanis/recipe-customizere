import { NextResponse } from 'next/server';
import { getRecipeById, updateRecipe, deleteRecipe } from '../../../../lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = getRecipeById(id);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = updateRecipe(id, {
      name: body?.name,
      baseYieldPieces: body?.baseYieldPieces != null ? Number(body.baseYieldPieces) : undefined,
      weightPerPiece: body?.weightPerPiece != null ? Number(body.weightPerPiece) : undefined,
      ingredients: body?.ingredients,
      steps: body?.steps,
      notes: body?.notes,
    });

    if (!updated) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update recipe';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteRecipe(id);
  if (!ok) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
