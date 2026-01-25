"use client";

import { useEffect, useMemo, useState } from "react";

type Unit = "g" | "ml";

type ScaledIngredient = {
  name: string;
  amount: number;
  unit: Unit;
};

type ScaleResponse = {
  recipeId: string;
  recipeName: string;
  baseYieldPieces: number;
  targetPieces: number;
  factor: number;
  ingredients: ScaledIngredient[];
  steps: string[];
  notes: string[];
};

const RECIPES = [
  { id: "pandesal", name: "Pandesal" },
];

export default function Home() {
  const [recipeId, setRecipeId] = useState(RECIPES[0].id);
  const [targetPiecesText, setTargetPieces] = useState<string>("2");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScaleResponse | null>(null);
  const [error, setError] = useState<string>("");
  
  const targetPieces = Number(targetPiecesText);
  const canScale = Number.isFinite(targetPieces) && targetPieces > 0;

  async function scale() {
    setError("");
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, targetPieces }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Something went wrong");

      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run once on first load
  useEffect(() => {
    scale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Recipe Micro-Scaler</h1>
      <p className="text-sm opacity-80 mt-1">
        Pick a recipe, choose how many pieces you want, and get scaled ingredients.
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Recipe</span>
          <select
            className="border rounded-lg p-2"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
          >
            {RECIPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Target pieces</span>
          <input
            className="border rounded-lg p-2"
            type="number"
            placeholder="Enter number of pieces"
            min={1}
            value={targetPieces}
            onChange={(e) => setTargetPieces((e.target.value))}
          />
        </label>

        <button
          className="rounded-lg border p-2 font-medium disabled:opacity-50"
          disabled={!canScale || loading}
          onClick={scale}
        >
          {loading ? "Scaling..." : "Scale recipe"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {data ? (
        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-xl font-semibold">{data.recipeName}</h2>
          <p className="text-sm opacity-80">
            Base yield: {data.baseYieldPieces} pcs → Target: {data.targetPieces} pcs
            {" "} (x{data.factor.toFixed(3)})
          </p>

          <h3 className="mt-4 font-semibold">Ingredients</h3>
          <ul className="mt-2 list-disc pl-6">
            {data.ingredients.map((ing, idx) => (
              <li key={idx}>
                {ing.name}: <b>{ing.amount}</b> {ing.unit}
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold">Steps</h3>
          <ol className="mt-2 list-decimal pl-6">
            {data.steps.map((s, idx) => (
              <li key={idx} className="mt-1">{s}</li>
            ))}
          </ol>

          {data.notes?.length ? (
            <>
              <h3 className="mt-4 font-semibold">Notes</h3>
              <ul className="mt-2 list-disc pl-6">
                {data.notes.map((n, idx) => (
                  <li key={idx} className="mt-1">{n}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
