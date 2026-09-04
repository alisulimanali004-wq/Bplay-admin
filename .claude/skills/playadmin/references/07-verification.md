# 07 — Verification & Definition of Done

The gate every change must pass before you call it done. Static checks (`tsc`, `eslint`, `prettier`) are necessary but NOT sufficient — a real Vite **build** plus a **manual smoke** of loading / empty / error / success is required for any non-trivial change. This file is the closing checklist for the whole `/playadmin` standard (see `01`–`06` for the how; this is the "is it actually done").

---

## 1. Commands to run after ANY change

Run these in order from the `bplay-admin/` root. **Fix, don't suppress** — a failing gate means the code is wrong, not the gate.

| # | Command | What it proves | Must be |
|---|---------|----------------|---------|
| 1 | `npx tsc --noEmit` | Types are sound — no `any` leaks, no unsafe access, props match the UI-Kit contracts | **Zero errors** |
| 2 | `npm run lint` | ESLint: hooks rules, a11y, import order, no unused, no `console` | **Clean** (0 errors; 0 warnings on touched files) |
| 3 | `npx prettier --check .` | Formatting is uniform (or `npx prettier --write .` to fix) | **Clean** |
| 4 | `npm run build` | **Source of truth.** Vite type-checks + bundles + splits lazy routes. If it doesn't compile, nothing else matters | **Compiles, 0 errors** |
| 5 | `npm run dev` → smoke | The thing actually renders and behaves across all four data states | **Manually verified** |

**Rule:** `npm run build` is the source of truth. `tsc`/`eslint`/`prettier` are fast static gates you run constantly; `build` is the gate you must pass before reporting done.

**Rule:** For any non-trivial change (new page, new query/mutation, form, route, store slice) a green build is **not enough** — you must run `npm run dev` and manually exercise the states below.

### One-shot verify (copy/paste)

```bash
npx tsc --noEmit && npm run lint && npx prettier --check . && npm run build
```

If that chain is green, static verification passed. Now smoke it.

### Smoke test with `npm run dev`

```bash
npm run dev   # http://localhost:5173
```

For every changed screen, drive all **four data states** (fake them via `VITE_USE_MOCKS` / query devtools / network throttling — see `04-data-layer.md`):

- **Loading** — spinner/skeleton shows, no layout jump, no flash of empty.
- **Empty** — `EmptyState` renders with title + action, not a blank table.
- **Error** — `ErrorState`/`Alert` renders with a retry that actually refetches.
- **Success** — data renders, mutations invalidate and the list refreshes, toasts fire.

Then verify cross-cutting: toggle language to **ar** (RTL flips correctly), shrink the viewport **below 768px** (sidebar becomes a drawer), and tab through with the **keyboard** (focus-visible rings, modal focus-trap, Esc closes).

**Never:** report a feature done having only checked the happy "success" path.

---

## 2. Config: scripts, tsconfig, eslint

### `package.json` scripts (add `build` typecheck + the missing scripts)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

**Rule:** wire `tsc --noEmit` into the `build` script so a type error can never slip through the "it built" claim.

### `tsconfig.json` — strictness (non-negotiable)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],

    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@ui/*": ["src/shared/ui/*"],
      "@lib/*": ["src/shared/lib/*"],
      "@features/*": ["src/features/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

Mirror the aliases in `vite.config.ts` `resolve.alias` (see `01-architecture.md`) so runtime and types agree.

### `eslint.config.js` — add typescript-eslint, jsx-a11y, import order

Install: `npm i -D typescript-eslint eslint-plugin-jsx-a11y eslint-plugin-import prettier eslint-config-prettier`

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      prettier, // MUST be last — turns off stylistic rules Prettier owns
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'No inline styles — use CSS Modules + tokens (see 02-design-system.md).',
        },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
])
```

**Never:** silence a rule with `// eslint-disable` to hit green. If a rule is genuinely wrong for the repo, change it centrally in this config with a comment justifying it.

### `.prettierrc`

```json
{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

---

## 3. Quality gates (checklists)

### TypeScript

- [ ] `npx tsc --noEmit` clean.
- [ ] **No `any`** (`@typescript-eslint/no-explicit-any` is `error`). Use `unknown` + narrowing.
- [ ] **No `@ts-ignore` / `@ts-expect-error`** to paper over real errors.
- [ ] Every API response is typed via `unwrap<T>` + a `toEntity` mapper — no untyped `res.data.data.whatever` reaches a component (see `04-data-layer.md`).
- [ ] `import type` used for type-only imports (`consistent-type-imports`).

### Design (tokens-only)

- [ ] **Zero hardcoded** hex/rgba/hsl in `*.module.css` or `*.tsx` — every color/space/radius/shadow references a `var(--token)` from `styles/tokens.css` (see `02-design-system.md`).
- [ ] **CSS Modules only** — `className={styles.x}`; no global class soup, no inline `style={{...}}` objects (lint blocks it).
- [ ] Spacing uses `--space-*`, radii `--radius-*`, type `--text-*`/weights — no magic px.
- [ ] New visual patterns evolve a shared UI-Kit primitive (add a prop) rather than forking a copy (see `03-ui-kit.md`).

Quick scan:

```bash
# any raw color that isn't a token declaration is a smell
grep -rniE "#[0-9a-f]{3,8}|rgba?\(|hsla?\(" src --include=*.module.css --include=*.tsx | grep -v "var(--"
```

### Responsive (xs → xl)

- [ ] Works from **480px → 1280px+**; test at 480 / 768 / 1024.
- [ ] **Sidebar collapses to a drawer below 768px** (`--z-sidebar`), toggled from the header; content is not shoved off-screen.
- [ ] **No fixed `250px` sidebar bug** — layout uses grid/flex with logical min sizes, not a hardcoded width that overflows small screens.
- [ ] `DataTable` scrolls horizontally on small screens instead of breaking the layout.
- [ ] Mobile-first media queries only (`min-width`), breakpoints match the token constants (480/640/768/1024/1280).

### RTL

- [ ] **Logical properties everywhere** — `margin-inline`, `padding-inline`, `inset-inline-start/end`, `text-align: start/end`, `border-inline`. **Never** `left`/`right`/`margin-left`.
- [ ] Verified with language switched to **ar**: `document.documentElement.dir === 'rtl'`, layout mirrors, icons/chevrons that imply direction flip.
- [ ] No `transform: translateX` or absolute `left:` that breaks mirrored layout.

### Accessibility

- [ ] Every input has a `<label>`/`Field` association (`htmlFor` / `id`); icon-only buttons use `IconButton` with an `aria-label`.
- [ ] Modal: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`, **focus-trap**, **Esc closes**, overlay-click closes, focus returns to trigger on close.
- [ ] All interactive elements reachable by keyboard with a visible `:focus-visible` ring (`--color-focus`).
- [ ] Errors use `role="alert"`; status Badges are not color-only (text label present).
- [ ] Contrast meets AA against the dark surfaces (text `--color-text` on `--color-surface`).

### Data (server state)

- [ ] All fetching via **TanStack Query** — **no manual `useState` loading/error flags** for server data.
- [ ] Query keys come from the feature **key factory**; mutations `invalidateQueries` the relevant keys on success (see `04-data-layer.md`).
- [ ] All error extraction goes through **`toAppError`** — no scattered `err?.response?.data?.message`.
- [ ] Loading/empty/error/success each render a real UI state (Spinner / EmptyState / ErrorState+retry / data).

### State / auth

- [ ] Zustand accessed via **exported selectors** (`useAuthRole()`, `useIsAuthenticated()`) — never destructure the whole store (re-render storms).
- [ ] Router guards + `apiClient` read the **auth store**, NOT raw `localStorage`.
- [ ] Role derived from the **decoded JWT** (`jwt-decode`) — the `email === "test_admin@bplay.com"` shortcut is gone (see `05-state-i18n-forms.md`).

### i18n

- [ ] **No hardcoded UI strings** in JSX — every user-facing string is `t('feature.key')`.
- [ ] Key exists in **both** `en.json` **and** `ar.json` (parity — no missing key falls back silently).
- [ ] Interpolation via `t('x', { name })`, not string concatenation.

Parity check:

```bash
node -e "const en=require('./src/shared/i18n/locales/en.json'),ar=require('./src/shared/i18n/locales/ar.json');const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?f(v,p+k+'.'):[p+k]);const e=f(en),a=f(ar);const miss=e.filter(k=>!a.includes(k)).concat(a.filter(k=>!e.includes(k)));console.log(miss.length?'MISSING/EXTRA: '+miss.join(', '):'i18n parity OK')"
```

### Performance

- [ ] Routes are **`React.lazy` + Suspense** (code-split) — the build emits per-route chunks (see `01-architecture.md`).
- [ ] `React.memo` / `useCallback` / `useMemo` applied where a heavy child or table re-renders needlessly — but only where it measurably helps (no cargo-cult).
- [ ] No re-render storms from whole-store destructuring or new object/array literals passed as props each render.
- [ ] Query `staleTime`/caching tuned so navigating back doesn't refetch everything.

### Cleanliness

- [ ] **No `console.log`** (lint allows only `console.warn`/`console.error`; remove even those if debug-only).
- [ ] **No dead code** — unused imports/vars/files/exports removed (`noUnusedLocals`, lint).
- [ ] **No inline style objects** (lint blocks).
- [ ] No commented-out blocks, no `TODO` left without a ticket reference.
- [ ] No leftover `dashboard`/unused scaffolding from the pre-TS app.

---

## 4. Definition of Done

A change is **done** only when ALL of the following hold:

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean (0 errors; no new warnings on touched files).
3. `npx prettier --check .` — clean.
4. `npm run build` — compiles with **zero** errors (the source of truth).
5. `npm run dev` smoke passed: **loading, empty, error, success** all verified for every touched screen.
6. Verified in **RTL (ar)** and at **<768px** (sidebar drawer), keyboard-navigable.
7. All Section-3 quality-gate checklists pass for the touched surface.
8. Follows the standard: tokens-only, CSS Modules, UI-Kit primitives, TanStack Query, auth store, selectors, `toAppError`, both-locale i18n keys.
9. No `console.log`, no dead code, no inline styles, no `any`, no `@ts-ignore`.

### Compact PR self-review checklist

```text
[ ] tsc --noEmit clean
[ ] lint clean · prettier clean
[ ] npm run build compiles (0 errors)
[ ] dev smoke: loading / empty / error / success
[ ] RTL (ar) ok · responsive <768 drawer ok · keyboard/focus ok
[ ] tokens-only · CSS Modules · UI-Kit primitives (no forks)
[ ] TanStack Query (no manual loading flags) · invalidation on mutate · toAppError
[ ] auth store + selectors (no localStorage/whole-store) · JWT role
[ ] i18n keys in en + ar (parity) · no hardcoded strings
[ ] lazy routes · no re-render storms
[ ] no console.log · no dead code · no inline styles · no any / ts-ignore
```

---

## Do / Never recap

- **Do** run the full chain (`tsc → lint → prettier → build`) then smoke the four data states before every "done".
- **Do** fix the root cause; wire `tsc --noEmit` into `build` so types can't slip through.
- **Do** verify RTL and the <768px drawer on any UI change.
- **Never** suppress a gate (`eslint-disable`, `@ts-ignore`, `any`) to reach green.
- **Never** ship having tested only the success path.

> **Rule (final):** Never report a task done while `tsc` or `npm run build` still have errors.
