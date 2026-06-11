"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Unit = "g" | "ml";

type Ingredient = {
  name: string;
  amount: number;
  unit: Unit;
};

type Recipe = {
  id: string;
  name: string;
  baseYieldPieces: number;
  weightPerPiece: number;
  ingredients: Ingredient[];
  steps: string[];
  notes: string[];
};

type ScaleResponse = {
  recipeId: string;
  recipeName: string;
  baseYieldPieces: number;
  targetPieces: number;
  factor: number;
  ingredients: Ingredient[];
  steps: string[];
  notes: string[];
};

type RecipeForm = {
  name: string;
  baseYieldPieces: number;
  weightPerPiece: number;
  ingredients: Ingredient[];
  steps: string[];
  notes: string[];
};

function emptyForm(): RecipeForm {
  return {
    name: "",
    baseYieldPieces: 10,
    weightPerPiece: 0,
    ingredients: [{ name: "", amount: 0, unit: "g" }],
    steps: [""],
    notes: [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesError, setRecipesError] = useState<string>("");
  const [recipeId, setRecipeId] = useState<string>("");
  const [targetPiecesText, setTargetPiecesText] = useState<string>("2");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScaleResponse | null>(null);
  const [error, setError] = useState<string>("");

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const targetPieces = Number(targetPiecesText);
  const canScale = Number.isFinite(targetPieces) && targetPieces > 0;

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadRecipes(): Promise<Recipe[]> {
    try {
      const res = await fetch("/api/recipes");
      const json = await res.json();
      if (!res.ok) {
        setRecipesError(json?.error ?? `API error ${res.status}`);
        return [];
      }
      setRecipesError("");
      setRecipes(json);
      return json;
    } catch (e: unknown) {
      setRecipesError(e instanceof Error ? e.message : "Failed to load recipes");
      return [];
    }
  }

  async function scale(id?: string, pieces?: number) {
    const useId = id ?? recipeId;
    const usePieces = pieces ?? targetPieces;
    if (!useId || !Number.isFinite(usePieces) || usePieces <= 0) return;

    setError("");
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: useId, targetPieces: usePieces }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Something went wrong");
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  // On mount: load recipes, then auto-scale the first one
  useEffect(() => {
    loadRecipes().then((list) => {
      if (list.length) {
        setRecipeId(list[0].id);
        scale(list[0].id, Number(targetPiecesText));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recipe form ───────────────────────────────────────────────────────────

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError("");
    setShowForm(true);
  }

  function openEditForm() {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    setEditingId(recipe.id);
    setForm({
      name: recipe.name,
      baseYieldPieces: recipe.baseYieldPieces,
      weightPerPiece: recipe.weightPerPiece,
      ingredients: recipe.ingredients.map((i) => ({ ...i })),
      steps: [...recipe.steps],
      notes: recipe.notes?.length ? [...recipe.notes] : [],
    });
    setSaveError("");
    setShowForm(true);
  }

  async function saveForm() {
    setSaveError("");

    if (!form.name.trim()) {
      setSaveError("Recipe name is required.");
      return;
    }
    if (form.baseYieldPieces <= 0) {
      setSaveError("Base yield must be greater than 0.");
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      steps: form.steps.filter((s) => s.trim()),
      notes: form.notes.filter((n) => n.trim()),
    };

    try {
      const url = editingId ? `/api/recipes/${editingId}` : "/api/recipes";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");

      await loadRecipes();
      setRecipeId(json.id);
      setShowForm(false);
      scale(json.id, targetPieces);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  // ── Form field helpers ────────────────────────────────────────────────────

  function setIngredient(idx: number, patch: Partial<Ingredient>) {
    setForm((f) => {
      const ingredients = [...f.ingredients];
      ingredients[idx] = { ...ingredients[idx], ...patch };
      return { ...f, ingredients };
    });
  }

  function setStep(idx: number, value: string) {
    setForm((f) => {
      const steps = [...f.steps];
      steps[idx] = value;
      return { ...f, steps };
    });
  }

  function setNote(idx: number, value: string) {
    setForm((f) => {
      const notes = [...f.notes];
      notes[idx] = value;
      return { ...f, notes };
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recipe Micro-Scaler</h1>
          <p className="text-sm opacity-60 mt-1">
            Pick a recipe, set how many pieces you want, get scaled ingredients.
          </p>
        </div>
        <button
          className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={openAddForm}
        >
          + New Recipe
        </button>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Recipe</span>
          <div className="flex gap-2">
            <select
              className="border rounded-lg p-2 flex-1"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
            >
              {recipes.length === 0 && !recipesError && <option value="">Loading…</option>}
              {recipesError && <option value="">Error loading recipes</option>}
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {recipeId && (
              <button
                className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                onClick={openEditForm}
              >
                Edit
              </button>
            )}
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Target pieces</span>
          <input
            className="border rounded-lg p-2"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 3"
            value={targetPiecesText}
            onChange={(e) => setTargetPiecesText(e.target.value)}
          />
        </label>

        <button
          className="rounded-lg border p-2 font-medium disabled:opacity-40"
          disabled={!canScale || loading}
          onClick={() => scale()}
        >
          {loading ? "Scaling…" : "Scale recipe"}
        </button>

        {recipesError && (
          <p className="text-sm text-red-600">Could not load recipes: {recipesError}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Scaled result */}
      {data && (
        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-xl font-semibold">{data.recipeName}</h2>
          <p className="text-sm opacity-60">
            Base: {data.baseYieldPieces} pcs → Target: {data.targetPieces} pcs
            &nbsp;(×{data.factor.toFixed(3)})
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

          {data.notes?.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">Notes</h3>
              <ul className="mt-2 list-disc pl-6">
                {data.notes.map((n, idx) => (
                  <li key={idx} className="mt-1">{n}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Add / Edit Recipe Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-10">
          <div className="w-full max-w-2xl mx-4 rounded-xl border bg-white p-6 shadow-xl text-gray-900">
            <h2 className="text-lg font-bold mb-5 text-gray-900">
              {editingId ? "Edit Recipe" : "New Recipe"}
            </h2>

            <div className="flex flex-col gap-5">
              {/* Name */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-800">Recipe name</span>
                <input
                  className="border rounded-lg p-2 text-gray-900 bg-white"
                  placeholder="e.g. Pandesal"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              {/* Yield + weight */}
              <div className="flex gap-3">
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-sm font-semibold text-gray-800">Base yield (pieces)</span>
                  <input
                    className="border rounded-lg p-2 text-gray-900 bg-white"
                    type="number"
                    min={1}
                    value={form.baseYieldPieces}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, baseYieldPieces: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-sm font-semibold text-gray-800">Weight per piece (g)</span>
                  <input
                    className="border rounded-lg p-2 text-gray-900 bg-white"
                    type="number"
                    min={0}
                    value={form.weightPerPiece}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, weightPerPiece: Number(e.target.value) }))
                    }
                  />
                </label>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">Ingredients</span>
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        ingredients: [...f.ingredients, { name: "", amount: 0, unit: "g" }],
                      }))
                    }
                  >
                    + Add
                  </button>
                </div>
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <input
                      className="border rounded-lg p-2 flex-1 text-gray-900 bg-white"
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => setIngredient(idx, { name: e.target.value })}
                    />
                    <input
                      className="border rounded-lg p-2 w-20 text-gray-900 bg-white"
                      type="number"
                      min={0}
                      placeholder="Qty"
                      value={ing.amount}
                      onChange={(e) => setIngredient(idx, { amount: Number(e.target.value) })}
                    />
                    <select
                      className="border rounded-lg p-2 text-gray-900 bg-white"
                      value={ing.unit}
                      onChange={(e) => setIngredient(idx, { unit: e.target.value as Unit })}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                    </select>
                    {form.ingredients.length > 1 && (
                      <button
                        className="text-red-400 hover:text-red-600 px-1 text-lg leading-none"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">Steps</span>
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, ""] }))}
                  >
                    + Add
                  </button>
                </div>
                {form.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <span className="text-sm opacity-40 mt-2.5 w-5 shrink-0">{idx + 1}.</span>
                    <textarea
                      className="border rounded-lg p-2 flex-1 text-sm text-gray-900 bg-white"
                      rows={2}
                      placeholder={`Step ${idx + 1}`}
                      value={step}
                      onChange={(e) => setStep(idx, e.target.value)}
                    />
                    {form.steps.length > 1 && (
                      <button
                        className="text-red-400 hover:text-red-600 px-1 text-lg leading-none mt-1.5"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            steps: f.steps.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    Notes{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setForm((f) => ({ ...f, notes: [...f.notes, ""] }))}
                  >
                    + Add
                  </button>
                </div>
                {form.notes.map((note, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <input
                      className="border rounded-lg p-2 flex-1 text-sm text-gray-900 bg-white"
                      placeholder="Note"
                      value={note}
                      onChange={(e) => setNote(idx, e.target.value)}
                    />
                    <button
                      className="text-red-400 hover:text-red-600 px-1 text-lg leading-none"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          notes: f.notes.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-900 text-white disabled:opacity-40"
                  disabled={saving}
                  onClick={saveForm}
                >
                  {saving ? "Saving…" : editingId ? "Update Recipe" : "Create Recipe"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
