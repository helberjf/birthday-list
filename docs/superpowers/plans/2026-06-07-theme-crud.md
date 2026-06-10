# Theme CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sellable theme catalog with 15 new child party themes, admin CRUD, theme selection, and photo prompt guidance.

**Architecture:** Store theme definitions in PostgreSQL through Drizzle, seed built-in presets when the theme table is empty, and expose public/admin REST endpoints through the existing Express API. The React app reads themes from the API with local fallback presets so the public invite still renders if the API is slow or empty.

**Tech Stack:** TypeScript, Drizzle ORM, Express 5, OpenAPI/Orval, React Query, React/Vite.

---

### Task 1: Theme Presets And Test

**Files:**
- Create: `scripts/src/theme-presets.test.ts`
- Create: `lib/db/src/theme-presets.ts`

- [ ] **Step 1: Write failing test**

Create a Node assertion test that imports `DEFAULT_THEMES` and checks there are at least 29 themes, unique slugs, at least 15 new themes, complete color fields, confetti arrays, photo recommendations, and AI prompts.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @workspace/scripts exec tsx ./src/theme-presets.test.ts`
Expected: fail because `lib/db/src/theme-presets.ts` does not exist yet.

- [ ] **Step 3: Implement presets**

Create `DEFAULT_THEMES` with the existing 14 themes plus 15 modern child party themes: Bluey, Patrulha Canina, Barbie, Moana, Encanto, Hot Wheels, LOL Surprise, Galinha Pintadinha, Circo, Fazendinha, Jardim Encantado, Ursinho, Toy Story, Minnie, and Bailarina.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter @workspace/scripts exec tsx ./src/theme-presets.test.ts`
Expected: pass.

### Task 2: Database And API

**Files:**
- Create: `lib/db/src/schema/themes.ts`
- Modify: `lib/db/src/schema/index.ts`
- Create: `artifacts/api-server/src/routes/themes.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add table and exports**

Add `themesTable` with slug, name, emoji, description, colors, labels, confetti, photo guidance, active/built-in flags, order, timestamps.

- [ ] **Step 2: Add routes**

Add public `GET /themes` and admin `GET/POST/PATCH/DELETE /admin/themes`.

- [ ] **Step 3: Update OpenAPI and regenerate clients**

Run: `pnpm --filter @workspace/api-spec run codegen`
Expected: generated React Query hooks and Zod schemas for theme CRUD.

### Task 3: Frontend

**Files:**
- Create: `artifacts/birthday-invite/src/lib/themes.ts`
- Modify: `artifacts/birthday-invite/src/pages/Home.tsx`
- Modify: `artifacts/birthday-invite/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Add frontend theme helpers**

Map API themes or fallback presets into CSS variables and theme behavior.

- [ ] **Step 2: Update public invite**

Use the selected theme from API, preserving fallback rendering.

- [ ] **Step 3: Update admin**

Replace fixed theme buttons with themes from API and add admin create/edit/delete UI, including photo recommendation and prompt fields.

### Task 4: Verification

**Files:**
- Read changed TS/TSX files and run verification commands.

- [ ] **Step 1: React checklist**

Scan edited TSX for hook rules, accessibility, stable keys, and text fit.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @workspace/scripts exec tsx ./src/theme-presets.test.ts`.

- [ ] **Step 3: Run typecheck/build**

Run: `pnpm run typecheck` and report any environment blockers separately from code errors.
