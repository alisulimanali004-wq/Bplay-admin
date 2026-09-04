# 02 — Design System: Tokens, Styling, RTL & Responsive

The visual contract for **bplay-admin**. Every color, space, radius, shadow, font size, and motion timing lives in **one** token file (`src/styles/tokens.css`) and is consumed **only** via `var(--token)` inside CSS Modules. This kills the current anti-pattern of **259 scattered hardcoded colors** and the **0.2–0.6s ad-hoc transition chaos**. Read this before writing a single line of CSS. See `03-ui-kit.md` for how primitives apply these tokens.

---

## 1. The token files

### 1.1 `src/styles/tokens.css` (THE single source of truth)

**Rule:** This is the only file allowed to contain literal color/space/size values. Everything else references these custom properties.

```css
/* src/styles/tokens.css — the ONLY place literal design values live. Dark theme is the default. */
:root {
  /* ---------- Brand / primary (luminous mint accent; dark ink sits ON it) ---------- */
  --color-primary: #CDECC6;          /* sageMist — the app's primary accent */
  --color-primary-hover: #B9E3B0;    /* deeper mint for hover / pressed */
  --color-primary-accent: #8BA888;   /* sage — links & secondary accents */
  --color-primary-deep: #344C3D;     /* pitchForest — deep brand green */
  --color-on-primary: #0C1F17;       /* pitchDeep — ink/text on mint CTAs (never white) */
  /* Brand CTA gradient: cream -> mint -> sage (135deg); label ink = --color-on-primary */
  --gradient-brand: linear-gradient(135deg, #ECFBE8, #CDECC6, #8BA888);

  --color-secondary: #D4A373;        /* warm amber — the single earthy accent */
  --color-secondary-strong: #B07F50;

  /* ---------- Feedback (semantic; text + tint bg) ---------- */
  --color-success: #8FCF99;
  --color-success-bg: #16301E;
  --color-danger: #F2796F;
  --color-danger-hover: #D4183D;     /* hard-destructive for irreversible confirms */
  --color-danger-bg: #3A1F1C;
  --color-warning: #D4A373;
  --color-warning-bg: #33271C;
  --color-info: #7FB4E0;
  --color-info-bg: #1B2A36;

  /* ---------- Surfaces (Pitch-Forest greens; dark is the only theme) ---------- */
  --color-bg: #0A1B13;               /* pitchDeepest — the stage the app floats on */
  --color-surface: #122A20;          /* pitch — default card / panel */
  --color-surface-2: #1F3D31;        /* pitchMid — raised glass surface */
  --color-surface-3: #2F5544;        /* pitchSoft — lightest green surface */
  --color-dialog: #14271D;           /* dialog / bottom-sheet background */
  --color-overlay: rgba(6, 16, 11, 0.72);  /* modal scrim over the forest stage */

  /* ---------- Frosted glass (translucent white wash over the dark stage) ---------- */
  --color-glass: rgba(255, 255, 255, 0.06);
  --color-glass-strong: rgba(255, 255, 255, 0.09);
  --color-glass-border: rgba(255, 255, 255, 0.10);
  --color-glass-border-strong: rgba(255, 255, 255, 0.16);
  --gradient-glass: linear-gradient(135deg, var(--color-glass-strong), var(--color-glass));

  /* ---------- Borders ---------- */
  --color-border: #24382C;
  --color-border-light: #1C2C22;
  --color-border-strong: rgba(255, 255, 255, 0.16);
  --color-divider: #1E3228;

  /* ---------- Text (cream on forest) ---------- */
  --color-text: #ECFBE8;             /* cream — primary foreground */
  --color-text-muted: #A9C2A4;       /* secondary text */
  --color-text-subtle: #7E967C;      /* hint / placeholder / de-emphasized */
  --color-text-disabled: #5A6F5C;

  /* ---------- Focus (luminous mint ring) ---------- */
  --color-focus: rgba(205, 236, 198, 0.5);  /* sageMist @50% */

  /* ---------- Semantic status pairs (text / bg @12% / border @35%) — Badge & table-row vocabulary ---------- */
  /* Mapped 1:1 to the app's owner-status colors: active - pending - warn - info - danger - neutral. */
  --status-success-text: #CDECC6;    /* active / paid / confirmed (mint) */
  --status-success-bg: rgba(205, 236, 198, 0.12);
  --status-success-border: rgba(205, 236, 198, 0.35);
  --status-danger-text: #F87171;     /* rejected / suspended / destructive (red) */
  --status-danger-bg: rgba(248, 113, 113, 0.12);
  --status-danger-border: rgba(248, 113, 113, 0.35);
  --status-warning-text: #FBBF24;    /* pending / under-review (amber) */
  --status-warning-bg: rgba(251, 191, 36, 0.12);
  --status-warning-border: rgba(251, 191, 36, 0.35);
  --status-neutral-text: #9CA3AF;    /* inactive / maintenance (gray) */
  --status-neutral-bg: rgba(156, 163, 175, 0.12);
  --status-neutral-border: rgba(156, 163, 175, 0.35);
  --status-info-text: #93C5FD;       /* new / recurring (blue) */
  --status-info-bg: rgba(147, 197, 253, 0.12);
  --status-info-border: rgba(147, 197, 253, 0.35);

  /* ---------- Spacing (4px base) ---------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* ---------- Radius ---------- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 999px;

  /* ---------- Typography ---------- */
  --font-sans: 'Cairo', system-ui, 'Segoe UI', Roboto, sans-serif; /* Arabic-first — matches the Bplay app */
  --font-mono: ui-monospace, monospace;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  --text-5xl: 56px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* ---------- Shadows ---------- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 25px 80px rgba(0, 0, 0, 0.4);

  /* ---------- Transitions (standardized — no more 0.2/0.35/0.6 chaos) ---------- */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;

  /* ---------- Z-index ---------- */
  --z-header: 100;
  --z-sidebar: 200;
  --z-dropdown: 1000;
  --z-modal: 1100;
  --z-toast: 1200;

  /* ---------- Breakpoints (documented for reference; media queries use literals) ---------- */
  --bp-xs: 480px;
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;

  /* ---------- Layout constants ---------- */
  --sidebar-width: 250px;
  --header-height: 64px;
}
```

**Note:** CSS custom properties **cannot** be used inside `@media` conditions (e.g. `@media (min-width: var(--bp-md))` does **not** work). Breakpoint tokens exist for documentation and JS use; media queries use the literal px (see §6). Keep the two in sync.

### 1.2 `src/styles/globals.css` (reset + base + import)

```css
/* src/styles/globals.css — imported ONCE from main.tsx. Reset + base only; no component styling. */
@import './tokens.css';

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
}

/* Media defaults */
img,
picture,
svg,
video {
  display: block;
  max-width: 100%;
}

/* Form controls inherit typography */
button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

a {
  color: var(--color-primary-accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* Global, consistent focus-visible ring for keyboard users */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
:focus:not(:focus-visible) {
  outline: none;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Custom scrollbar (dark theme) */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}
```

`main.tsx` imports it once:

```tsx
// src/main.tsx
import './styles/globals.css';
```

---

## 2. The ironclad styling rule

**Rule:** In any CSS Module or feature stylesheet, every color, spacing, radius, font-size, shadow, and transition **must** be `var(--token)`. Never a raw hex, rgb, rgba, or magic px.

**Rule:** **No inline `style={{ ... }}` objects** for design values. Inline style is permitted only for a genuinely dynamic runtime value that cannot be a token or class (e.g. a computed progress-bar width `style={{ inlineSize: \`${pct}%\` }}`, or a chart geometry). Everything static goes through a CSS Module class.

**Never:** `color: #2563eb`, `margin-left: 16px`, `box-shadow: 0 10px 30px rgba(0,0,0,.25)`, `transition: all 0.3s`, `<div style={{ color: '#fff', padding: 16 }}>`.

**Do:** `color: var(--color-primary)`, `margin-inline-start: var(--space-4)`, `box-shadow: var(--shadow-md)`, `transition: background-color var(--transition-fast)`.

The current codebase has **259 scattered hardcoded colors** and dozens of ad-hoc transition durations. That is exactly the debt this token system exists to erase — a new hardcoded value is a review-blocking regression.

```css
/* ❌ Anti-pattern (what we are killing) */
.card {
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  transition: transform 0.3s;
}

/* ✅ Token-only */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-normal);
}
```

---

## 3. CSS Modules conventions

**Rule:** Each component owns a sibling `*.module.css`: `Foo.tsx` ↔ `Foo.module.css`. Import as `styles` and reference `className={styles.foo}`.

```tsx
// src/shared/ui/Card/Card.tsx
import styles from './Card.module.css';

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}
```

```css
/* src/shared/ui/Card/Card.module.css */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

**Conventions:**
- Class names are **camelCase** (`.rowActions`, `.isActive`) so they map to `styles.rowActions` cleanly.
- One module per component; no shared "utilities.module.css" grab-bags. Shared visual patterns become **primitives** in `shared/ui` (see §4 and `03-ui-kit.md`), not copy-pasted CSS.
- **No global leakage:** module classes are locally scoped by design. Never rely on a class name being globally visible.
- **`:global` escape hatch** is allowed **only** for styling third-party DOM you don't control (e.g. a portal library) or for a documented app-wide class. Scope it tightly:

```css
/* Allowed, narrow escape hatch */
.calendar :global(.rdp-day_selected) {
  background: var(--color-primary);
}
```

**Never:** put a bare `:global(.someClass)` at the top level of a module to define app-wide styles — that belongs in `globals.css`.

- **Combining classes:** use a template string or a tiny `cx` helper; do not build class strings with hardcoded literals that duplicate module names.

```tsx
const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');
// <button className={cx(styles.btn, isActive && styles.active)} />
```

---

## 4. Reusable token-driven patterns

These are the canonical recipes. Prefer the `shared/ui` **primitive** that already implements them; drop to the raw CSS only when building that primitive.

### 4.1 Brand gradient

```css
.hero {
  background: var(--gradient-brand);
  color: var(--color-text);
}
/* Gradient text (e.g. logo wordmark) */
.brandText {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### 4.2 Elevation (shadows)

```css
.raised { box-shadow: var(--shadow-sm); }
.floating { box-shadow: var(--shadow-md); }   /* cards, dropdowns */
.overlayPanel { box-shadow: var(--shadow-lg); } /* modals */
```

### 4.3 Focus ring

Global `:focus-visible` (in `globals.css`) covers keyboard users. When a component needs an explicit ring (custom control, active tab), use the token:

```css
.control:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus);
}
```

### 4.4 Status pairs (the Badge recipe)

Semantic status colors always travel as a **text/bg pair**. This is exactly what `Badge` (see `03-ui-kit.md`) exposes via `variant`.

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding-block: var(--space-1);
  padding-inline: var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}
.success { color: var(--status-success-text); background: var(--status-success-bg); }
.danger  { color: var(--status-danger-text);  background: var(--status-danger-bg); }
.warning { color: var(--status-warning-text); background: var(--status-warning-bg); }
.neutral { color: var(--status-neutral-text); background: var(--status-neutral-bg); }
.info    { color: var(--status-info-text);    background: var(--status-info-bg); }
```

---

## 5. RTL — logical properties everywhere

`document.documentElement.dir` is `"rtl"` for Arabic, `"ltr"` for English (synced by the i18n layer — see `05-state-i18n-forms.md`). CSS **must not** hardcode physical direction; the browser flips logical properties automatically.

**Rule:** Use logical properties for every directional value:

| Physical (never) | Logical (always) |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `border-top-left-radius` | `border-start-start-radius` |
| `float: left` | `float: inline-start` |
| `border-left` | `border-inline-start` |

**Never:** `left`, `right`, `margin-left`, `padding-right`, `text-align: left`, `border-left`, physical corner radii, or `transform: translateX` for directional layout offsets (translateX is not auto-flipped — mirror it via `[dir='rtl']` if needed).

**Before / after:**

```css
/* ❌ Physical — breaks in Arabic RTL */
.menuItem {
  padding-left: var(--space-4);
  border-left: 3px solid transparent;
  text-align: left;
}
.menuItem .icon { margin-right: var(--space-2); }

/* ✅ Logical — correct in both LTR and RTL, zero extra CSS */
.menuItem {
  padding-inline-start: var(--space-4);
  border-inline-start: 3px solid transparent;
  text-align: start;
}
.menuItem .icon { margin-inline-end: var(--space-2); }
```

For the rare glyph that must mirror (chevrons, back arrows), flip only that icon:

```css
[dir='rtl'] .chevron { transform: scaleX(-1); }
```

Values that are inherently physical and should **not** flip (a top shadow, a drop-down that always opens downward) stay physical — logical props are for the inline (start/end) axis.

---

## 6. Responsive — mobile-first + sidebar→drawer

**Rule:** Author base styles for the smallest screen, then layer `min-width` media queries upward. The five breakpoints:

| Name | min-width | Typical use |
| --- | --- | --- |
| xs | 480px | large phones |
| sm | 640px | small tablets |
| md | **768px** | **sidebar becomes persistent; drawer below** |
| lg | 1024px | multi-column dashboards |
| xl | 1280px | max content width / wide tables |

Media-query template (mobile-first, literal px kept in sync with the `--bp-*` tokens):

```css
/* Base = mobile */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
/* ≥768px */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
/* ≥1024px */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### 6.1 Sidebar → drawer (fixes the current `margin-left: 250px` bug)

**Current bug:** the layout hardcodes `margin-left: 250px` on the content, so on mobile the sidebar overlaps content and the RTL view is wrong. Fix: logical margin, only applied at `md+`; below `md` the sidebar is an off-canvas drawer with an overlay.

```css
/* DashboardLayout.module.css */
.shell {
  display: flex;
  min-block-size: 100vh;
}

/* --- Sidebar: off-canvas drawer by default (mobile) --- */
.sidebar {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;              /* start-anchored → flips for RTL */
  inline-size: var(--sidebar-width);
  z-index: var(--z-sidebar);
  background: var(--color-surface);
  border-inline-end: 1px solid var(--color-border);
  transform: translateX(-100%);        /* hidden off-canvas */
  transition: transform var(--transition-normal);
}
[dir='rtl'] .sidebar { transform: translateX(100%); } /* mirror the off-canvas direction */
.sidebar.open { transform: translateX(0); }

/* Overlay shown only when the drawer is open on mobile */
.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: calc(var(--z-sidebar) - 1);
}

/* Content: no inline offset on mobile (drawer floats over) */
.content {
  flex: 1;
  min-inline-size: 0;                  /* prevents flex overflow of tables */
  padding: var(--space-4);
}

/* --- md+: sidebar becomes persistent, content gets a logical offset --- */
@media (min-width: 768px) {
  .sidebar {
    transform: none;                   /* always visible */
  }
  .overlay { display: none; }
  .content {
    margin-inline-start: var(--sidebar-width); /* ✅ logical, not margin-left */
    padding: var(--space-6);
  }
}
```

```tsx
// Drawer open/close driven by the uiStore (selector), not local prop-drilling
const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
const closeSidebar = useUiStore((s) => s.closeSidebar);

<aside className={cx(styles.sidebar, isSidebarOpen && styles.open)}>…</aside>
{isSidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}
```

**Never** hardcode `margin-left: 250px` on content, and never apply the offset below `md` — that is the exact regression being fixed.

---

## 7. Typography scale usage

**Rule:** Font sizes come only from `--text-*`; weights from `--weight-*`; line-heights from `--leading-*`.

| Role | Size token | Weight | Line-height |
| --- | --- | --- | --- |
| Page title (H1) | `--text-3xl` / `--text-4xl` | `--weight-bold` | `--leading-tight` |
| Section heading (H2) | `--text-2xl` | `--weight-semibold` | `--leading-tight` |
| Card / panel title (H3) | `--text-lg` | `--weight-semibold` | `--leading-tight` |
| Body | `--text-base` | `--weight-regular` | `--leading-normal` |
| Secondary / table cell | `--text-sm` | `--weight-regular` | `--leading-normal` |
| Caption / badge / meta | `--text-xs` | `--weight-medium` | `--leading-normal` |
| Marketing hero (landing) | `--text-5xl` | `--weight-bold` | `--leading-tight` |

```css
.pageTitle {
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-text);
}
.muted {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

Use `--color-text` for primary text, `--color-text-subtle` for secondary, `--color-text-muted` for de-emphasized/placeholder. Long-form prose (rare here) uses `--leading-relaxed`.

---

## 8. Motion — timing tokens + framer-motion

**Rule:** Every transition/animation duration is `--transition-fast | --transition-normal | --transition-slow`. This replaces the current mix of `0.2s / 0.3s / 0.35s / 0.6s`. Map framer-motion durations to the **same numeric values** (seconds): 0.15 / 0.25 / 0.4.

CSS transitions — always name the properties, never `all`:

```css
.button {
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}
.card {
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}
```

framer-motion — centralize the timing so components don't invent their own:

```ts
// src/shared/ui/motion.ts — single source for motion values (mirrors the CSS tokens)
export const DURATION = { fast: 0.15, normal: 0.25, slow: 0.4 } as const;
export const EASE = [0.4, 0, 0.2, 1] as const; // matches `ease`

export const fadeScale = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: DURATION.normal, ease: EASE },
};
```

```tsx
// Modal / dialog usage — consistent everywhere
import { motion, AnimatePresence } from 'framer-motion';
import { fadeScale } from '@ui/motion';

<AnimatePresence>
  {isOpen && (
    <motion.div className={styles.dialog} {...fadeScale}>
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

**Never:** inline a magic `transition={{ duration: 0.6 }}` or `transition: all 0.3s ease` — pull from `DURATION` / the `--transition-*` tokens. Honor `prefers-reduced-motion` (already globally handled in §1.2).

---

## Do / Never recap

**Do**
- Put every literal design value in `tokens.css`; reference via `var(--token)` in CSS Modules.
- One `Foo.module.css` per `Foo.tsx`; camelCase classes; combine with `cx()`.
- Use logical properties (`margin-inline-start`, `inset-inline-start`, `text-align: start`, `border-start-start-radius`) for all directional CSS.
- Author mobile-first; layer `min-width` media queries; make the sidebar a drawer below 768px and offset content with `margin-inline-start` only at `md+`.
- Pull typography from `--text-*`/`--weight-*`/`--leading-*`; pull motion from `--transition-*` / `DURATION`.
- Promote a repeated visual pattern into a `shared/ui` primitive (see `03-ui-kit.md`).

**Never**
- Hardcode hex/rgb/rgba/px for color, space, radius, shadow, or timing (that's the 259-color debt).
- Use inline `style={{}}` for static design values.
- Use physical direction (`left`/`right`/`margin-left`/`text-align:left`/`border-left`) or hardcode `margin-left: 250px`.
- Use `transition: all` or an ad-hoc duration outside the three tokens.
- Leak styles globally from a module (except a tightly-scoped `:global` escape hatch for third-party DOM).
