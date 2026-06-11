# Recipe Micro-Scaler

## About

Recipe Micro-Scaler is a Next.js web app for bakers and home cooks who want to make a smaller (or larger) batch of a recipe. You pick a recipe, enter how many pieces you want, and the app scales every ingredient automatically — applying smart rounding per ingredient type (e.g. yeast rounds to 0.1g, salt and sugar round to 0.5g, liquids to 1ml).

Recipes are stored in a local `recipes.json` file so they persist across restarts with no database setup required.

**Key features:**
- Scale any recipe up or down by piece count
- Add new recipes via the UI form (name, yield, ingredients, steps, notes)
- Edit existing recipes in place
- Per-ingredient rounding rules for practical measurements
- REST API for recipes and scaling (`/api/recipes`, `/api/recipes/[id]`, `/api/scale`)

**Tech stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · Jest

---

## Contributing Locally

### Prerequisites

- Node.js 22+
- npm 10+
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:npanis/recipe-customizere.git
   cd recipe-customizere
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Project structure

```
src/
  app/
    api/
      recipes/          # GET (list), POST (create)
        [id]/           # GET, PUT, DELETE by id
      scale/            # POST — scale a recipe by piece count
    page.tsx            # Main UI
  data/
    recipes.ts          # Seed data (loaded on first run)
  lib/
    db.ts               # JSON file persistence layer
    scale.ts            # Scaling and rounding logic
  __tests__/
    scale.test.ts       # Unit tests — scaling logic
    db.test.ts          # Unit tests — persistence layer
    integration/
      recipes-api.test.ts   # Integration tests — recipes API
      scale-api.test.ts     # Integration tests — scale API
```

### Pre-commit hooks (Husky)

This project uses [Husky](https://typicode.github.io/husky) to automatically run unit and integration tests before every `git commit`. If any test fails, the commit is blocked.

**First-time setup (required for every contributor):**

1. Install dependencies (this also runs `husky` via the `prepare` script):
   ```bash
   npm install
   ```

2. Verify the hook is in place:
   ```bash
   cat .husky/pre-commit
   ```
   You should see the test commands printed out.

3. Make the hook executable if needed (macOS/Linux only):
   ```bash
   chmod +x .husky/pre-commit
   ```

**What happens when you commit:**

```bash
git commit -m "my change"

# Running unit tests...
#   → passes ✅  or  ❌ Unit tests failed. Commit blocked.

# Running integration tests...
#   → passes ✅  or  ❌ Integration tests failed. Commit blocked.

# All tests passed. Proceeding with commit.
```

**Skipping the hook (use sparingly):**

If you need to commit work-in-progress without running tests:
```bash
git commit -m "wip" --no-verify
```

> This should only be used for draft commits. All tests must pass before merging to `main`.

---

### Adding a recipe

You can add recipes directly through the UI (click **+ New Recipe**), or by editing `recipes.json` at the project root while the server is stopped.

---

## Running Unit Tests

Unit tests cover the core scaling logic (`scale.ts`) and the persistence layer (`db.ts`). They run in isolation using a temporary file — your `recipes.json` is never touched.

```bash
npm test
```

Expected output:
```
PASS src/__tests__/scale.test.ts
PASS src/__tests__/db.test.ts

Test Suites: 2 passed
Tests:       23 passed
```

---

## Running Integration Tests

Integration tests call the actual Next.js route handlers end-to-end with real `Request` objects and real file I/O. They cover every API route, validation error case, and scaling scenario.

```bash
npm run test:integration
```

Expected output:
```
PASS src/__tests__/integration/recipes-api.test.ts
PASS src/__tests__/integration/scale-api.test.ts

Test Suites: 2 passed
Tests:       30 passed
```

To run unit and integration tests together (e.g. before merging):

```bash
npm run test:all
```

> **CI/CD note:** All tests are self-contained and use isolated temp files. No running server, no external services, and no shared state between suites. Safe to run in any QA environment.

---

## Running Locally

### Development mode

```bash
npm run dev
```

Starts the Next.js dev server at [http://localhost:3000](http://localhost:3000) with hot reload.

On the first request, `recipes.json` is created at the project root and seeded with the starter Pandesal recipe.

### Production mode

```bash
npm run build
npm start
```

Builds an optimised production bundle and starts the server.

### Linting

```bash
npm run lint
```
