import { NextResponse } from "next/server";
import { recipes } from "../../../data/recipes";
import { scaleRecipe } from "../../../lib/scale";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const recipeId = String(body?.recipeId ?? "");
    const targetPieces = Number(body?.targetPieces);

    if (!recipeId) {
      return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
    }
    if (!Number.isFinite(targetPieces) || targetPieces <= 0) {
      return NextResponse.json({ error: "targetPieces must be a positive number" }, { status: 400 });
    }

    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "recipe not found" }, { status: 404 });
    }

    const scaled = scaleRecipe(recipe, targetPieces);
    return NextResponse.json(scaled);
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
}