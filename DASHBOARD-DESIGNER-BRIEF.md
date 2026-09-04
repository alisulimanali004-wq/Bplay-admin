# Bplay Super‑Admin **Dashboard** — Designer Brief

**Prepared for:** the visual designer (Figma / Figma Make)
**Prepared by:** the Bplay product team
**Version:** 1.0 · 14 Jul 2026
**Deliverable requested:** a world‑class, animated, comprehensive **Statistics / Overview dashboard** — the home screen a platform operator sees after login.

> **Read me first.** You do **not** need any prior knowledge of Bplay — Section 1 explains the whole product from zero. Everything you need to design confidently is in this one file: what the product is, who the screen is for, the exact brand colors you must use, every number/chart we want on the screen, how it behaves, and how it should feel and move.

---

## ملخّص للمصمم (بالعربية)

Bplay منصّة سورية لحجز الملاعب والنوادي الرياضية — سوق ذو جانبين: **اللاعبون** (الطلب) و**أصحاب الملاعب/المنشآت** (العرض). هذه الشاشة هي **لوحة تحكّم "السوبر‑أدمن"** (مدير المنصّة) — أول ما يراه بعد الدخول، تعطيه صورة فورية عن صحّة المنصّة كلّها: كم حجز، كم إيراد، كم منشأة بانتظار الموافقة، أين المناطق القويّة والضعيفة... مع مخطّطات وأرقام حيّة.

**المطلوب منك:** تصميم خرافي، احترافي، جميل، بأنيميشن قوي وأنيق — شامل ومنطقي. **الشرط الوحيد غير القابل للتفاوض: الألوان مقفلة على ألوان المنصّة** (نظام "Pitch Forest" — غابة داكنة + نعناع مضيء + زجاج مصنفر، القسم 3). ما عدا الألوان: **المساحة إبداعك** — الترتيب، الحركة، التفاصيل، الشخصية البصرية، كلّها لك. اللغة عربية/إنجليزية مع دعم كامل للاتجاه من اليمين لليسار (RTL)، والعملة الليرة السورية (SYP).

---

## Table of contents
0. [What we're asking you to design](#0-what-were-asking-you-to-design)
1. [The platform, explained from zero](#1-the-platform-explained-from-zero)
2. [The feature — what it is & why it's powerful](#2-the-feature--what-it-is--why-its-powerful)
3. [🔒 LOCKED — the brand color & token system (Figma‑ready)](#3--locked--the-brand-color--token-system-figma-ready)
4. [The data & KPI architecture — what to show](#4-the-data--kpi-architecture--what-to-show)
5. [Information architecture & interactions](#5-information-architecture--interactions)
6. [Visual & motion design direction](#6-visual--motion-design-direction)
7. [References — what "world‑class" looks like](#7-references--what-world-class-looks-like)
8. [Creative room — where we want you to push](#8-creative-room--where-we-want-you-to-push)
9. [Deliverables — what to hand back](#9-deliverables--what-to-hand-back)
10. [Appendix — realistic numbers for your mockups](#10-appendix--realistic-numbers-for-your-mockups)

---

## 0. What we're asking you to design

A single screen: the **Super‑Admin Dashboard** (the platform "Overview" / home). Today, when the platform operator logs in, they're dumped straight onto a plain list of admin accounts — there is **no home, no pulse, no overview**. We want to replace that with a screen that answers, in **under 2 seconds and without scrolling**:

1. **Is the marketplace healthy right now?** (Is supply meeting demand? Is money flowing?)
2. **Does anything need me?** (Approvals waiting, content flagged, subscriptions expiring…)
3. **Where is it strong or weak?** (Which regions/cities are winning or lagging?)

…and then lets the operator drill deeper into charts, comparisons, and eventually the detail pages.

**The bar:** legendary ("خرافي"), creative, beautiful, world‑class, with strong but tasteful animation — a screen that feels like the same premium universe as the Bplay mobile app, only now it's a **calm, cinematic control room**.

**Two rules that never bend:**
- 🔒 **Use the platform's exact colors** (Section 3). This is a dark, forest‑green + luminous‑mint identity. No blues‑as‑brand, no generic SaaS palette.
- ♿ **Arabic / RTL and reduced‑motion are first‑class**, not afterthoughts (Sections 5–6).

**Everything else is your creative canvas** — layout personality, the exact choreography, the hero treatment, the little details that make it sing.

---

## 1. The platform, explained from zero

### 1.1 What Bplay is
**Bplay is a sports‑facility marketplace** (think "the app that connects players with courts") operating in **Syria**. Players discover and **book courts / pitches** (padel, tennis, football, basketball, swimming, volleyball) at clubs and standalone facilities, subscribe to club memberships, and interact in a small social community. All money is in **Syrian Pounds (SYP)**.

It is a classic **two‑sided marketplace**:

| Side | Who | What they bring | In our data |
|---|---|---|---|
| **Demand** | **Players** | Bookings, subscriptions, spend, community activity | ~16 players today (grows) |
| **Supply** | **Owners** → their **Facilities** (clubs & pitches) → **Courts** | Bookable court‑hours, memberships | 16 owners · 24 facilities · ~45 courts |
| **The join** | A **confirmed booking** | The moment a player and a court‑hour actually connect | ~120 bookings on record |

> The whole product only works when **supply meets demand**. A dashboard for this business must show **both sides and the ratio between them** — not treat them as two separate apps.

### 1.2 Who this screen is for — the operator
There are two operator roles who use the **admin panel** (a web app, separate from the player/owner mobile apps):

- **Super‑Admin** — the platform owner/operator. Sees and governs **everything**. **This dashboard is primarily for them.**
- **Regional Admin** — a staff member scoped to one **geographic region** (a city/area). Sees the **same** dashboard, but **auto‑filtered to their region only**, and with a few super‑admin‑only sections hidden (region comparison, platform‑wide owner actions).

The operator is **not** a data analyst. They're a busy manager who wants to glance, understand, and act. Design for **decision‑at‑a‑glance**, with depth one click away.

### 1.3 What the super‑admin actually governs (the domains)
This is the operator's world — every one of these is a place the dashboard can surface a number or a queue:

| Domain | What they do |
|---|---|
| **Owners** (supply onboarding) | Review & **approve/reject** new owner accounts (Stage‑1 gate); activate/deactivate/**block** an owner (cascades to all their facilities) |
| **Facilities** (supply) | Review & **approve/reject** each facility (Stage‑2 gate); suspend/reactivate; read‑only view of courts, occupancy, revenue |
| **Players** (demand) | View full player profiles; deactivate / block; see reports against players |
| **Bookings** | **Read‑only oversight** of every court booking (they monitor, they don't cancel) |
| **Subscriptions** | Read‑only oversight of club memberships (active/expiring/churned) |
| **Regions** | Define geographic regions; assign admins to them; find "orphan" facilities that fall outside every region |
| **Admins** | Create/manage the regional‑admin roster; assign regions |
| **Community** | **Moderate** the social feed (hide/remove violating posts & comments) |
| **Plans** | Manage the player paid‑plan catalog (a paid plan unlocks community posting) |
| **Feedback & Chat** | Reply to feedback from players/owners; chat with owners |
| **Statistics & Finance** | **← This dashboard.** Read‑only analytics across everything. Revenue is *displayed* (from confirmed payments), never *controlled* here. |

**Two ideas to keep in mind while designing:**
- **Approvals are a two‑stage gate** — a new owner is approved first, then each of their facilities is approved. **Pending approvals are the operator's #1 daily job** and the highest‑value thing to surface.
- **Region is a lens on everything** — nearly every number can be sliced "per region / per governorate."

### 1.4 The current visual identity (from the real app)
The screen must feel like it belongs to the same family as the Bplay mobile app. Here's that family's DNA, observed from the real product:

- **A dark "forest" stage.** The whole app floats on a near‑black **deep green** background with a soft **radial glow** bleeding down from the top — atmospheric, cinematic, calm.
- **Frosted‑glass surfaces.** Cards, inputs, and chips are translucent white washes over the forest, with hairline borders and a subtle top‑edge sheen. Depth comes from **light**, not heavy drop shadows.
- **Luminous mint is the signature.** A pale, glowing mint‑green (`#cdecc6`) is the accent — used for primary buttons (with **dark** ink on top, never white text), active states, and the most important data. Primary CTA buttons carry a soft **glossy light‑sheen** across them.
- **Editorial serif headlines.** Big page titles ("Welcome *back*", "Create a club", "Members") are set in an **elegant serif** — often with one word in *italic mint* — contrasted against clean sans‑serif body text (**Cairo**, an Arabic‑first font). This serif‑display move is the app's signature and gives it a premium, editorial feel.
- **Warm amber** (`#d4a373`) is the single earthy secondary accent — used sparingly (money/revenue signals).
- **Status is color‑coded with dots + pills:** mint = active/paid/good, amber = pending, orange = paused/warning, red = blocked/danger, gray = neutral, blue = new/info.
- **Rounded, soft, floating.** Generous corner radii, floating pill navigation, circular avatars with initials, count summaries ("8 active · 14 total").

*(You will receive reference screenshots of the mobile app alongside this brief. Match this world — but this is a **desktop data console**, so it's more spacious and structured than the phone.)*

### 1.5 Language, direction, currency
- **Bilingual: English + Arabic.** The UI ships in both. **Arabic is Right‑to‑Left (RTL)** — the entire layout **and the animations** mirror. Design the English (LTR) view, but note RTL in your specs (Section 6.6).
- **Font:** **Cairo** for all UI text (it covers Arabic beautifully). Optionally an elegant **serif** for large English display headings/numerals (falls back to Cairo Bold in Arabic).
- **Currency:** **SYP** (Syrian Pounds), formatted compactly ("4.25M", "620K"), always with tabular (monospaced) figures so digits don't jitter.

---

## 2. The feature — what it is & why it's powerful

### 2.1 The gap
Right now the operator logs in and sees a **list of admins**. That's like opening your business and the first thing you see is the employee directory — not sales, not orders, not problems. **There is no pulse.**

### 2.2 The mission
Build the **operating surface** of the entire Bplay marketplace: a single, gorgeous screen that turns a pile of raw records (bookings, facilities, players, money, regions) into an **instant, honest read on the health of the business** — and a **prioritized to‑do list** of what needs attention — with the depth to investigate anything on the spot.

### 2.3 The one‑sentence design brief
> **A calm, cinematic control room carved out of a deep forest at night — luminous mint data glowing on near‑black green glass; precise, expensive, quietly alive, never busy.**

Design toward: **cinematic · luminous · calm‑dense · editorial · botanical‑premium · tactile‑glass · quietly alive.**
Avoid: **neon dashboard · corporate‑blue SaaS · gauge clutter · gamer‑RGB · crowded walls of equal widgets.**

The paradox to embrace: **it reads as "خرافي" *because* it's restrained, not despite it.** One choreographed entrance + honest count‑ups + buttery tooltips beats fifty moving parts.

---

## 3. 🔒 LOCKED — the brand color & token system (Figma‑ready)

> **This is the one hard constraint.** Every color on the screen comes from the tokens below — they are ported 1:1 from the live Bplay app. Build them as **Figma color styles / variables** and pull from them; don't introduce new hues. (You *may* invent tints/opacities of these, gradients from these, and of course all the layout/typography/motion personality — but the palette itself is fixed.)
>
> The console is **dark‑theme only** — "Pitch Forest" *is* a dark identity. Do not design a light version (except an optional print/export variant, noted in §6.4).

### 3.1 Brand / primary
| Figma style | Hex | Use |
|---|---|---|
| `brand/primary` (sageMist) | `#cdecc6` | The signature mint accent — north‑star value, primary trend line, active/focus states, primary CTA fill |
| `brand/primary-hover` | `#b9e3b0` | Hover / pressed on mint |
| `brand/primary-accent` (sage) | `#8ba888` | Links & secondary accents |
| `brand/primary-deep` (pitchForest) | `#344c3d` | Deep brand green |
| `brand/on-primary` (ink) | `#0c1f17` | **Text/icons that sit ON mint** — dark ink, **never white** |
| `brand/secondary` (amber) | `#d4a373` | The single earthy accent — **money / revenue** signal |
| `brand/secondary-strong` | `#b07f50` | Deeper amber |
| `gradient/brand` | `linear-gradient(135deg,#ecfbe8,#cdecc6,#8ba888)` | cream → mint → sage (hero/CTA) |

### 3.2 Surfaces (the forest stage)
| Figma style | Hex | Use |
|---|---|---|
| `surface/bg` (pitchDeepest) | `#0a1b13` | Page background — the stage everything floats on |
| `surface/1` (pitch) | `#122a20` | Default card / panel |
| `surface/2` (pitchMid) | `#1f3d31` | Raised surface — **KPI tiles**, data panels |
| `surface/3` (pitchSoft) | `#2f5544` | Lightest green — reserve for the **one north‑star hero tile** |
| `surface/dialog` | `#14271d` | Dialogs, tooltips, sheets |
| `overlay/scrim` | `rgba(6,16,11,0.72)` | Modal scrim over the stage |
| `gradient/stage` | `radial-gradient(1100px 620px at 50% -12%, rgba(47,85,68,0.45), transparent 72%)` | **The ambient top glow** — put this behind the hero. This single move makes the console feel like the app. |

### 3.3 Frosted glass (the material language)
| Figma style | Value | Use |
|---|---|---|
| `glass/fill` | `rgba(255,255,255,0.06)` | Card wash over the forest |
| `glass/fill-strong` | `rgba(255,255,255,0.09)` | Raised glass |
| `glass/border` | `rgba(255,255,255,0.10)` | Hairline card border |
| `glass/border-strong` | `rgba(255,255,255,0.16)` | Hover / emphasis border |
| `gradient/glass` | `linear-gradient(135deg, glass/fill-strong, glass/fill)` | Top‑edge sheen on cards |

### 3.4 Text (cream on forest)
| Figma style | Hex | Use |
|---|---|---|
| `text/primary` (cream) | `#ecfbe8` | Primary foreground / values |
| `text/muted` | `#a9c2a4` | Labels, secondary text |
| `text/subtle` | `#7e967c` | Axes, hints, placeholders |
| `text/disabled` | `#5a6f5c` | Disabled |

### 3.5 Status & data‑series palette (semantic — lock the meaning)
Pin these meanings across **every** chart and badge. A color never changes meaning between two charts.

| Meaning | Figma style | Text hex | Tint bg (12%) | Border (35%) |
|---|---|---|---|---|
| **Good** — active / paid / confirmed / attended | `status/success` | `#cdecc6` | `rgba(205,236,198,0.12)` | `rgba(205,236,198,0.35)` |
| **Pending** — under‑review / outstanding | `status/warning` | `#fbbf24` | `rgba(251,191,36,0.12)` | `rgba(251,191,36,0.35)` |
| **Warn (reversible)** — paused / suspended / walk‑in | `status/caution` | `#fb923c` | `rgba(251,146,60,0.12)` | `rgba(251,146,60,0.35)` |
| **Danger** — rejected / blocked / cancelled / churn | `status/danger` | `#f87171` | `rgba(248,113,113,0.12)` | `rgba(248,113,113,0.35)` |
| **Neutral** — inactive / maintenance / no‑show | `status/neutral` | `#9ca3af` | `rgba(156,163,175,0.12)` | `rgba(156,163,175,0.35)` |
| **Info / new** — recurring / subscription | `status/info` | `#93c5fd` | `rgba(147,197,253,0.12)` | `rgba(147,197,253,0.35)` |

**Chart series ramp (color‑blind‑distinct, in order):**
`#cdecc6` (mint) → `#93c5fd` (info blue) → `#fbbf24` (warning gold) → `#fb923c` (caution orange) → `#f87171` (danger red) → `#9ca3af` (neutral gray) → `#d4a373` (amber = money series).

**Feedback fills** (buttons/toasts): success `#8fcf99`, danger `#f2796f` / hard‑destructive `#d4183d`, warning/amber `#d4a373`, info `#7fb4e0`, caution/orange `#fb923c`.

### 3.6 Glow (precious — use sparingly)
| Style | Value | Use |
|---|---|---|
| `glow/primary` | `rgba(205,236,198,0.16)` | Mint halo / orb |
| `glow/forest` | `rgba(47,85,68,0.5)` | Deep‑green orb |
| `shadow/glow-sm` | `0 8px 24px rgba(205,236,198,0.14)` | Hover lift on tiles |
| `shadow/glow` | `0 18px 48px rgba(205,236,198,0.22)` | North‑star tile / primary CTA only |

> **Reserve the mint glow** for the north‑star tile, the primary CTA, and hover. Glow is precious, not ambient.

### 3.7 Type, spacing, radius, shadow, motion tokens
**Type** — family **Cairo** (`'Cairo', system-ui, sans-serif`); optional serif display for big EN headings/numerals.
Sizes: `12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 56` px. Weights: 400 / 500 / 600 / 700. Line‑height: tight 1.2 · normal 1.5 · relaxed 1.7.

**Spacing** (4px base): `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80`.
**Radius:** `6 · 10 · 12 · 16 · 24 · 999(full)`. Cards use **16px**; pills use full.
**Shadow:** sm `0 1px 2px rgba(0,0,0,0.2)` · md `0 10px 30px rgba(0,0,0,0.2)` · lg `0 25px 80px rgba(0,0,0,0.4)`.
**Motion tokens:** fast **150ms** · normal **250ms** · slow **400ms**. Easings: entrance `cubic-bezier(0.22,1,0.36,1)` (out‑expo), soft `cubic-bezier(0.25,0.46,0.45,0.94)`, spring `{bounce:0.2, duration:0.4}`.

**Layout constants:** sidebar 250px · header 64px. **For this one page**, widen the content cap to **~1440px** (the rest of the app is 1200) — a data console earns the extra room. Page padding 32px desktop / 16px mobile.

### 3.8 Copy‑paste block — the complete token set (source of truth)
This is the actual token file the whole app is built from. Paste it straight into Figma variables / a style sheet — **every** color, size, and easing you need is here.

```css
:root {
  /* ---------- Brand / primary (luminous mint; dark ink sits ON it) ---------- */
  --color-primary:        #cdecc6;  /* sageMist — the app's primary accent */
  --color-primary-hover:  #b9e3b0;  /* deeper mint for hover / pressed */
  --color-primary-accent: #8ba888;  /* sage — links & secondary accents */
  --color-primary-deep:   #344c3d;  /* pitchForest — deep brand green */
  --color-on-primary:     #0c1f17;  /* ink/text on mint CTAs (NEVER white) */
  --gradient-brand: linear-gradient(135deg, #ecfbe8, #cdecc6, #8ba888);

  --color-secondary:        #d4a373; /* warm amber — the single earthy accent (money) */
  --color-secondary-strong: #b07f50;

  /* ---------- Feedback (button/toast fills) ---------- */
  --color-success:      #8fcf99;  --color-success-bg: #16301e;
  --color-danger:       #f2796f;  --color-danger-hover: #d4183d;  --color-danger-bg: #3a1f1c;
  --color-warning:      #d4a373;  --color-warning-bg: #33271c;
  --color-info:         #7fb4e0;  --color-info-bg: #1b2a36;
  --color-caution:      #fb923c;  --color-caution-hover: #ea7a28;

  /* ---------- Surfaces (Pitch-Forest greens — the dark stage) ---------- */
  --color-bg:        #0a1b13;  /* pitchDeepest — page background */
  --color-surface:   #122a20;  /* pitch — default card / panel */
  --color-surface-2: #1f3d31;  /* pitchMid — raised surface / KPI tiles */
  --color-surface-3: #2f5544;  /* pitchSoft — reserve for the north-star tile */
  --color-dialog:    #14271d;  /* dialog / tooltip / bottom-sheet */
  --color-overlay:   rgba(6, 16, 11, 0.72);
  --gradient-stage:  radial-gradient(1100px 620px at 50% -12%, rgba(47,85,68,0.45), transparent 72%);

  /* ---------- Frosted glass (translucent white wash over the forest) ---------- */
  --color-glass:               rgba(255,255,255,0.06);
  --color-glass-strong:        rgba(255,255,255,0.09);
  --color-glass-border:        rgba(255,255,255,0.10);
  --color-glass-border-strong: rgba(255,255,255,0.16);
  --gradient-glass: linear-gradient(135deg, var(--color-glass-strong), var(--color-glass));

  /* ---------- Borders ---------- */
  --color-border:        #24382c;
  --color-border-light:  #1c2c22;
  --color-border-strong: rgba(255,255,255,0.16);
  --color-divider:       #1e3228;

  /* ---------- Text (cream on forest) ---------- */
  --color-text:          #ecfbe8;  /* cream — primary foreground */
  --color-text-muted:    #a9c2a4;  /* labels / secondary */
  --color-text-subtle:   #7e967c;  /* axes / hints / placeholder */
  --color-text-disabled: #5a6f5c;

  --color-focus: rgba(205,236,198,0.5); /* luminous mint focus ring */

  /* ---------- Semantic status pairs (text / bg @12% / border @35%) ---------- */
  --status-success-text: #cdecc6; --status-success-bg: rgba(205,236,198,0.12); --status-success-border: rgba(205,236,198,0.35);
  --status-danger-text:  #f87171; --status-danger-bg:  rgba(248,113,113,0.12); --status-danger-border:  rgba(248,113,113,0.35);
  --status-warning-text: #fbbf24; --status-warning-bg: rgba(251,191,36,0.12);  --status-warning-border: rgba(251,191,36,0.35);
  --status-neutral-text: #9ca3af; --status-neutral-bg: rgba(156,163,175,0.12); --status-neutral-border: rgba(156,163,175,0.35);
  --status-info-text:    #93c5fd; --status-info-bg:    rgba(147,197,253,0.12); --status-info-border:    rgba(147,197,253,0.35);
  --status-caution-text: #fb923c; --status-caution-bg: rgba(251,146,60,0.12);  --status-caution-border: rgba(251,146,60,0.35);

  /* ---------- Ambient glow (mint + forest depth — hero / CTA only) ---------- */
  --color-glow-primary: rgba(205,236,198,0.16);
  --color-glow-forest:  rgba(47,85,68,0.5);
  --shadow-glow-sm: 0 8px 24px rgba(205,236,198,0.14);
  --shadow-glow:    0 18px 48px rgba(205,236,198,0.22);

  /* ---------- Spacing (4px base) ---------- */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px;
  --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px; --space-20:80px;

  /* ---------- Radius ---------- */
  --radius-sm:6px; --radius-md:10px; --radius-lg:12px; --radius-xl:16px; --radius-2xl:24px; --radius-full:999px;

  /* ---------- Typography (Cairo — Arabic-first) ---------- */
  --font-sans: 'Cairo', system-ui, 'Segoe UI', Roboto, sans-serif;
  --text-xs:12px; --text-sm:14px; --text-base:16px; --text-lg:18px; --text-xl:20px;
  --text-2xl:24px; --text-3xl:30px; --text-4xl:36px; --text-5xl:56px;
  --weight-regular:400; --weight-medium:500; --weight-semibold:600; --weight-bold:700;
  --leading-tight:1.2; --leading-normal:1.5; --leading-relaxed:1.7;

  /* ---------- Shadows ---------- */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 10px 30px rgba(0,0,0,0.2);
  --shadow-lg: 0 25px 80px rgba(0,0,0,0.4);

  /* ---------- Transitions / easings ---------- */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
  --ease-entrance: cubic-bezier(0.22, 1, 0.36, 1); /* entrances, count-up finish */
  --ease-soft:     cubic-bezier(0.25, 0.46, 0.45, 0.94); /* reveals, hovers */

  /* ---------- Layout ---------- */
  --sidebar-width: 250px;
  --header-height: 64px;
  --dashboard-max: 1440px; /* this page only; rest of app = 1200px */
}
```

**Data‑series ramp (in order):** `#cdecc6` → `#93c5fd` → `#fbbf24` → `#fb923c` → `#f87171` → `#9ca3af` → `#d4a373`.

---

## 4. The data & KPI architecture — what to show

This is **what** goes on the screen. It's comprehensive on purpose — but you don't render all of it above the fold. The **P0** items are the must‑ship overview (first viewport + first scroll); **P1** adds depth; **P2** is advanced. Use the priorities to decide visual weight and order.

Everything here is computable from **real data we already have** (see Appendix for volumes) — so mockups can use realistic numbers.

### 4.1 ⭐ The North‑Star metric + Hero row (the top band — read in < 2s, no scroll)
**North‑Star = "Confirmed Bookings (this period)"** — the single number that captures *both* sides connecting (like Airbnb's "nights booked"). Its money sibling is **Booking GMV (SYP)**. Crown Confirmed Bookings as the biggest tile; show GMV as co‑primary.

The **Hero KPI row** — 6 numbers, read in one glance:

| # | Tile | Meaning | Comparison |
|---|---|---|---|
| 1 | **Confirmed Bookings** ⭐ *(oversized, ~2–3× the others)* | Marketplace liquidity — supply meets demand | vs prev period + % of target |
| 2 | **Booking GMV (SYP)** | Money the marketplace moved | vs prev period |
| 3 | **Active Facilities / Total** (e.g. **10 / 24**) | Supply base | new this period |
| 4 | **Active Players / Total** (e.g. **13 / 16**) | Demand base | new this period |
| 5 | **Active Subscriptions** (of 55) | Recurring demand | vs prev + churn Δ |
| 6 | **Needs Attention** (e.g. **9**) | Sum of pending approvals + open reports — a live counter | vs yesterday |

Tile 6 scrolls to / expands the **Attention feed** (§4.4). Accent convention: mint = totals/north‑star · amber = money · blue = active/healthy · gold = attention · orange = at‑risk · red = broken.

### 4.2 The global frame (controls that drive the WHOLE page)
- **Time‑range selector:** Today · 7d · **30d (default)** · 90d · This month · Custom. Every widget re‑queries on change.
- **Region / governorate selector:** All regions · one of the live regions · "Orphan pool" (outside all regions). Segments every metric. *(Super‑admin only; a regional admin sees a locked region chip.)*
- **Compare‑to‑previous** toggle → every delta names its baseline ("vs previous 30 days"); YoY option for YTD/Year.
- **Freshness stamp** "Data as of 10:42" + manual refresh + **Export** (Excel).

> **Money discipline (important):** there are several different money numbers in the system. Keep them in separate jobs and never blend: **GMV = booking revenue + subscription revenue** (the one headline). "Owner revenue" and "facility revenue" are **per‑entity rollups** for leaderboards/maps only. "Platform (B2B) revenue" (what owners pay Bplay) is its **own** tile. Label them clearly.

### 4.3 The sections (each is a band on the page; drill‑down noted)
For each metric: **P0/P1/P2** priority + the chart we recommend (you may propose better — keep it honest, see §4.5).

**A · Platform Pulse** *(the overview band — P0)*
The Hero row + a secondary strip: Total Owners/Active (16/10) · Total Regions (6) · Community activity (14 posts · 92 reactions) · Platform B2B revenue.
→ *Big north‑star tile + StatCard grid.* Each tile drills to its list page with the filter pre‑applied.

**B · Growth & Acquisition** *(two‑sided funnel — P0/P1)*
New Players · New Owners · Player Activation Rate (% with ≥1 booking) · Owner approval‑funnel conversion.
→ *Line (small‑multiples: players vs owners, not dual‑axis)* over weeks; an *acquisition→activation funnel* (P2); *cohort‑retention heatmap* (P2).

**C · Supply — Facilities & Courts** *(P0/P1)*
**Facility Approval Pipeline** (pending 6 · active 10 · rejected 3 · suspended 3 · owner‑suspended 2 = 24) · Total Bookable Courts (~45) · Avg Occupancy % · Avg Rating · Club vs Pitch (15/9) · aged‑in‑review · orphan facilities.
→ *Proportional segmented bar* for the pipeline (mint/amber/red/gray/orange), *sorted horizontal bar* for facilities‑by‑governorate, *ranked leaderboards* (top revenue/booked/rated/occupancy).

**D · Demand — Bookings & Operations** *(P0/P1)*
Total Bookings · **Fulfilment quality** (confirmed / cancelled / no‑show %) · GMV & avg value · Online vs walk‑in split · payment‑status mix · bookings by sport.
→ *Area line* over time; *donut with center total* for status mix; *weekday × hour heatmap* for peak demand.

**E · Marketplace Liquidity & Matching** *(the two‑sided core — P2, aspirational)*
Supply/Demand balance per region · Booking fill‑rate · time‑to‑confirm.
→ *Supply‑vs‑demand bubble/scatter* (one bubble per region, size = GMV, 45° line = balance) · *per‑region deviation diverging bar*. *This is what makes it a marketplace — worth a hero moment even if it starts as a proxy.*

**F · Revenue & Finance (SYP)** *(P0/P1 — read‑only)*
Total GMV · Revenue by source (booking vs membership) · Platform B2B revenue · Outstanding/receivables · revenue by region · by sport.
→ *Area line* with optional target band · *100% stacked bar over time* for source split (**not a pie**) · *choropleth/point map or sorted bar* for region.

**G · Recurring Revenue — Subscriptions & Plans** *(P0/P1)*
Active Subscriptions (of 55) · MRR · Churn rate · **Near‑expiry / renewal risk** · subs by status/segment/plan · owner tier distribution (free 4 / pro 5 / elite 2).
→ *Proportional segmented bar* for status · *sorted bar* for plan popularity · *segment donut*.

**H · Community & Engagement** *(P0/P1 — moderation‑only)*
Posts (14) · Engagement (92 reactions + 40 comments) · Active posters · **Moderation load** (removed/flagged) · reaction‑type mix · author type (player vs facility).
→ *Line* for engagement trend · *stacked bar* for reaction mix · *ranked list* of top posts.

**I · Regional Distribution & Comparison** *(super‑admin exclusive — P1; the single most operator‑defining view)*
Side‑by‑side region comparison (players · facilities · bookings · GMV · occupancy · rating per region) · coverage/orphan pool · region assignment health.
→ *Sortable comparison table with inline mini‑bars* (the operator's flagship table) · *coverage map* (circles + facility/orphan pins) · *diverging bars* vs platform mean.

**J · Operations, Governance & Moderation Health** *(P0/P1 — the "needs‑me‑now" domain)*
Approval queue depth (pending owners 3 + facilities 6) · Open player reports · Admin roster health (15 admins · regional 9 / general 5 · unassigned regions · suspended 3) · suspended/blocked entities.
→ *Queue StatCards with warning/danger accent + "→ review" CTA* · *coverage map* of admin assignment gaps.

**K · People Quality — Players & Owners** *(P1/P2)*
Owner verification funnel (docs by type × status) · owner trust distribution · player reputation (avg rating, no‑show violations) · **top‑player leaderboards** (most‑booking / highest‑spend / most‑active).
→ *Stacked bar / funnel* for verification · *ranked lists with medal chips* for leaderboards · *histograms* for distributions.

### 4.4 The "Needs‑Action" feed (the live operating surface)
A ranked, urgency‑ordered panel (red → amber → green). Each row = icon + label + count + relative time + a deep‑link CTA. This is the modern "operating surface" idea — it makes the console feel **alive** with zero real AI. Suggested order:

1. 🔴 Pending **facility** approvals — **6** → facilities
2. 🔴 Pending **owner** approvals — **3** → owners
3. 🔴 Open **player reports** → players
4. 🟠 Flagged / removed **community** posts — **1** → community
5. 🟠 Aged‑in‑review facilities → facility detail
6. 🟠 Coverage gap: **orphan facilities** → regions
7. 🟠 Ungoverned regions (unassigned) → admins
8. 🟡 **Expiring / near‑expiry subscriptions** → subscriptions
9. 🟡 Idle / low‑occupancy facilities → facility detail
10. 🟢 New paid subscriptions (revenue‑positive) → subscriptions

### 4.5 Chart discipline (what separates world‑class from amateur)
- **Bars start at zero.** Non‑negotiable. Sort ranking bars; label values on them.
- **No pie/donut for trends**, and none with > 5 slices. Prefer sorted bars & stacked bars.
- **No dual‑axis** charts (they manufacture false correlation) — use small‑multiples, 100%‑stacked, or scatter.
- **Color is always paired with icon + label** — never color alone (color‑blind + grayscale safe).
- **Every number carries a named comparison** ("vs prev 30d" / "% of target"), or **hides its delta** when there's no baseline. Never show "+300%" on 4 bookings — annotate low‑N as "small sample".
- **One semantic palette everywhere** (§3.5) — a color never changes meaning.
- **Max ~5 lines** per line chart, else small‑multiples.

---

## 5. Information architecture & interactions

### 5.1 Page structure, top‑to‑bottom
The **first viewport holds ≤ 9 elements**; everything else is progressive disclosure below the fold.

| # | Band | Sketch | Why here |
|---|---|---|---|
| **0** | **Command bar** (sticky) | Title "Platform Overview" + global controls (§4.2) + freshness stamp | Controls govern the whole page before any number is read |
| **1** | **Hero row** — asymmetric **8 / 4** | **Left (8):** ⭐ north‑star Confirmed‑Bookings tile — oversized value, delta, sparkline, % of target. **Right (4):** **Needs‑Attention** stack (top 3–4 urgency chips) | Answers "is it healthy?" + "what needs me?" in one glance |
| **2** | **Platform KPI bento** — 4‑up then 3‑up | The 8 headline cards (Players / Owners / Facilities / Bookings / Subscriptions / GMV / Community / Regions) | The scannable "state of the platform in 2 seconds" |
| **3** | **Marketplace liquidity** — 7 / 5 | Left: supply‑vs‑demand balance per region. Right: liquidity funnel (request → confirmed → paid → completed) | What makes it a marketplace, not two apps |
| **4** | **Trends & composition** — 8 / 4 | Left: Bookings & GMV over time (multi‑series line + optional target band). Right: composition stacked bar | Change‑over‑time = the steering signal |
| **5** | **Region performance** *(super‑admin only)* | Full‑width sortable comparison table + coverage map | Find strongest/weakest regions & expansion gaps |
| **6** | **Domain panels** — 2‑up | Compact cards: Supply, Demand, Recurring, Engagement, Governance — each with a "View all →" | Depth on demand (Linear's progressive disclosure) |
| **7** | **Recent activity feed** (footer) | Timeline of recent platform events | Ambient "what just happened" — a calm closer |

**Scan path:** north‑star (0.5s) → KPI bento (2s) → attention triage → liquidity/region strength → drill into a domain → drill into an entity. Each step narrows scope; every element is a link into a detail page.

### 5.2 Drill‑down (nothing is a dead end)
Three tiers: **hover** → glass tooltip (exact value + named comparison); **click a tile / "View all →"** → the feature list with filters pre‑applied; **click a chart segment** → same, with that segment's filter (e.g. the "pending" bar carries `status=pending`). Every KPI and chart maps to an existing detail page.

### 5.3 States (design all of them)
Each widget loads independently — **partial failure never blanks the page**.

| State | KPI tile | Chart / table |
|---|---|---|
| **Loading** | Skeleton shaped like the final card (no spinner, no layout shift) | Skeleton at the chart's final height |
| **Empty (true zero)** | Render **`0`** in muted text — a real zero is data | Zero‑baseline + "No activity in this period" |
| **Empty (out of range)** | Mini empty‑state in the card + "widen range" hint | Same, with widen‑range affordance |
| **Error** | Compact error + retry; rest of page stays live | Error + retry |
| **No‑permission** (regional admin on super‑admin widget) | Widget **absent**; grid reflows. Optional locked "Available to super‑admins" card | Section simply not rendered |
| **Partial / low‑N** | Suppress delta when no prior period; annotate tiny denominators | Same |

**Delta semantics:** up = good by default — but for **churn / no‑show / cancellations, up = bad → invert the color.** Always arrow **+** color **+** label.

### 5.4 Responsive
- **≥1280 (wide desktop):** 12‑col; hero 8/4; KPI 4‑up; trends 8/4; liquidity 7/5; region table full‑width; domain panels 2‑up.
- **1024–1280 (laptop):** KPI 4‑up tight or 3‑up; hero 8/4 → 7/5.
- **768–1024 (tablet):** sidebar → icon rail; hero **stacks**; KPI 2‑up; charts single‑column; tables get horizontal scroll (page body never scrolls sideways).
- **≤768:** single column; command‑bar controls collapse into a **filter drawer**; sidebar → off‑canvas.

### 5.5 Role differences
Same page, one `scope`:

| Aspect | Super‑admin | Regional admin |
|---|---|---|
| Data scope | Whole platform | Auto‑filtered to their region(s); region is a **locked chip** |
| Region‑comparison table (§4.3‑I) | Visible | **Hidden** |
| Orphan pool / platform‑wide owner actions | Visible | **Hidden** |
| Attention rail | All queues | In‑region facility approvals + in‑region feedback |
| Revenue / GMV | Platform‑wide | Region‑scoped (still read‑only) |

### 5.6 Accessibility & perceived speed
Skeleton‑first (target **< 2s** to first meaningful paint, never a blank page) · last‑known values show instantly then reconcile · count‑up **once** (never on refresh) · lazy‑mount charts below the fold · honor `prefers-reduced-motion` · color + icon + label everywhere · tabular figures · keyboard/focus (mint focus ring) · screen‑reader labels on tiles & charts · RTL first‑class.

---

## 6. Visual & motion design direction

*(This is the heart of the brief. Hexes/durations are literal so you can build without guessing. Where it says **"room"**, the choice is yours.)*

### 6.1 Art direction & mood
The stage is the app's forest gradient, ported: background `#0a1b13` with the ambient top glow (`gradient/stage`). Three elevation greens do the structural work: stage `#0a1b13` → cards `#122a20` → raised data surfaces `#1f3d31`, with `#2f5544` reserved for the **one north‑star tile**. **Luminous mint `#cdecc6` is the ink of data** — full strength only for the north‑star value, the primary trend line, and focus/active; elsewhere it's a wash/glow/hairline. Text is cream `#ecfbe8` → muted `#a9c2a4` → subtle `#7e967c`. Warm amber `#d4a373` = money only. **Frosted glass is the material**; elevation comes from light (top‑edge sheen + hairline borders), not heavy shadows.

**Typographic signature (room):** carry the app's **serif‑display + italic‑mint‑accent‑word** into the EN hero headline and the big KPI numerals (a Playfair/Fraunces‑class serif), falling back to **Cairo Bold** in Arabic. Body, labels, tables stay Cairo. This gives the dashboard an editorial signature the plain admin pages lack, without breaking Arabic.

### 6.2 Layout & grid
12‑column grid, 24px gutters. **Embrace bento asymmetry** — do *not* make every row a uniform 4‑up. North‑star hero spans ~5–6 cols and is taller; attention panel sits beside it (4 cols); charts use 8/4 and 7/5 splits. Section‑to‑section gap 48px. Each section opens with a small **ALL‑CAPS eyebrow** (12px, letter‑spacing 0.08em, muted) + a serif/Cairo‑bold section title — the app's "OWNER DASHBOARD" idiom. **The fold shows 5–9 elements max**; deeper analytics live below the fold or behind Tabs.

**Header/hero:** full‑bleed band on the stage glow. Left: eyebrow `SUPER ADMIN · PLATFORM OVERVIEW` → serif headline *"Good morning, [name]"* (accent word in italic mint) → quiet subtitle ("Damascus · 14 Jul 2026"). Right: the global control cluster (time‑range + region + freshness dot). Optional faint decorative **sparkline/contour watermark** of the booking trend behind the headline at ~6% opacity — a botanical/topographic trace, not a chart. *(Room — invent it.)*

### 6.3 KPI tile anatomy & variants
Base tile: `#1f3d31` bg, 1px glass border, 16px radius, small shadow, 16–20px padding, a **4px inline‑start accent bar**, uppercase muted label (12px), value 30px bold **tabular‑nums**, a 40×40 glass icon chip.

| Variant | When | Add | Size |
|---|---|---|---|
| **Plain number** | stable totals | base | ~112px tall |
| **Delta chip** | anything steered | top‑end pill: arrow + signed % + **named comparison**; green up `#8fcf99` / red down `#f2796f`; hide when no baseline | base |
| **Sparkline** | KPIs with a trend | 7–30pt mint polyline + gradient area fill tucked under the value; end‑dot | base (value → 24px) |
| **Progress / gauge** | occupancy, % of target | SVG ring or bullet bar; threshold color ≥80 success / ≥60 warning / else danger | base–1.5× |
| **Comparison** | two‑value read (my region vs peer) | primary value + muted secondary + delta between | base–wide |
| **⭐ North‑star hero** | Confirmed Bookings / GMV | `#2f5544` bg, serif numeral 36–56px, delta + sparkline + progress‑to‑target together, subtle mint glow; **2–3× the others** | ~5–6 cols, ~200px tall |

### 6.4 Chart styling
**No chart library is installed** — the codebase uses dependency‑free SVG + `framer-motion` (already available) for sparklines, gauges, segmented/proportional bars, star distributions, and heatmaps. For genuine line/area/stacked‑over‑time/scatter, one sanctioned library (Recharts) themed **exclusively** with these tokens is acceptable. **Never ship two charting approaches.**

- **Gridlines:** horizontal only, 1px `#1e3228` (optionally dashed). **No vertical gridlines.** Bars start at zero.
- **Axes:** 12px Cairo, `#7e967c`; minimal ticks; money axes compact ("4.25M", "620K").
- **Tooltips:** floating glass card on `#14271d` + backdrop‑blur, 1px glass border, 10px radius, md shadow; uppercase muted label + colored series dot + right‑aligned tabular value + a comparison line ("+8.4% vs prev"); fades in **120ms**; instant crosshair.
- **Legends:** below the chart — dot + label + count‑up value + %.
- **States:** skeleton (never spinner), empty‑state, error+retry, low‑N guard (see §5.3).
- **Light/print variant (only):** for PDF/Excel export or a TV/kiosk mode — stage → cream/white, text → `#0c1f17`, surfaces → white w/ light hairlines, and **darken every series color one step** so fills read on white. Print‑only tokens, not a runtime toggle.

### 6.5 The animation system (make it "خرافي" but tasteful)
**Philosophy:** motion *clarifies* (up = growth), *confirms* (hover/press), or *eases change* (live updates) — never decorates.

1. **Entrance stagger** — **hero row only** on first mount: each tile `opacity 0→1, translateY 12–16px→0`, **400ms** out‑expo, **stagger 50–60ms**. Cap the whole sequence ≤ ~450ms so it still feels instant.
2. **Number count‑up** — big KPIs animate `0 → value` over **600ms**, **once** on load; tabular figures prevent width jitter. Pre‑formatted strings render instantly. **Never** count‑up on background refresh.
3. **Chart draw‑on (first render only)** — lines draw via `stroke-dashoffset` over **600ms**; area fills fade in after; bars grow from the baseline (`scaleY 0→1`, origin bottom) **500ms**, staggered **40ms** per bar; donut/segmented bars sweep in.
4. **Hover micro‑interactions** — tile lifts `translateY(-2px)` + border brightens + faint mint glow, **150ms**; icon chip nudges; charts show crosshair + tooltip instantly. Click = subtle press‑scale ~0.98.
5. **Section reveal on scroll** — `whileInView` once, threshold ~0.15, `opacity 0→1, translateY 16px→0`, **400ms**. Fires once.
6. **Page/route transition** — cross‑fade **200ms** + 8px rise; tab switches use a spring indicator (no content slide that fights the fixed sidebar).
7. **Live‑update pulse** — the freshness dot emits a slow soft mint ring (looping). When a value actually changes, **count/fade to the new number** (never hard‑swap — change‑blindness); list/table reorders slide < 300ms so the operator keeps spatial memory.

**Reduced‑motion (non‑negotiable):** on `prefers-reduced-motion`, render **final values & full charts instantly** — no count‑up, draw‑on, stagger, scroll reveal, or pulse. Keep only instant opacity crossfades.
**Performance:** animate **only `transform` and `opacity`** (GPU); target 60fps; stagger the hero row, not every element; skeletons prevent layout shift; **test on mid‑range Android** — not every operator is on a flagship; interactive < 2s.

### 6.6 Density, iconography, RTL/Arabic
**Density:** data‑forward but **calm** — Linear/Plausible restraint. Padding 16–20px; tile gap 16–24px; section gap 48px. Resist filling empty space — whitespace *is* the premium signal.
**Iconography:** a single line‑icon set at 24px / ~1.75px stroke (the app has ~51 inline SVGs; add chart glyphs: trending‑up/down, bar‑chart, line‑chart, activity, gauge, alert‑circle). Icon chips 40×40 on glass with the accent tint. Don't mix icon families.
**RTL / Arabic — first‑class:**
- **Cairo** everywhere; relaxed line‑height on dense Arabic blocks.
- Build with **logical properties** (inline‑start/end) so `dir="rtl"` mirrors the whole board — the accent bar, grid flow, controls, table alignment flip for free.
- **Mirror motion in RTL** — chart draw‑on & slide‑ins grow right→left; entrance stagger sequences right→left; tooltips anchor on the correct side.
- **Directional glyphs** (delta arrows, chevrons) flip — but **numerals and the sparkline shape do not mirror** (a rising trend still rises).
- Money/numbers: tabular figures; locale‑aware format (`en-US` / `ar-SY`); "{amount} SYP" / "ل.س".

---

## 7. References — what "world‑class" looks like

Steal the **pattern**, not the pixels. Each is best‑in‑class at one thing:

| Product | The lesson |
|---|---|
| **Stripe** | Revenue‑first, calm density. The single most important number top‑left, one trend chart beside it; functional color only. Resist filling space. |
| **Baremetrics** | **Size is hierarchy** — MRR rendered ~3× larger. Visual weight *is* the information architecture. |
| **Linear** | **Progressive disclosure** — lean default surface; deep analytics behind an "Insights" tab. Never drown the user in charts they didn't ask for. |
| **Vercel** | Design the **binary answer** first — unmistakable green/red status, no interpretation tax. |
| **Datadog / Grafana** | **Global controls** (date range + region) drive every widget at once; strict green/amber/red conventions at scale. |
| **Mercury / Ramp** | **Outcome framing** — "+18% vs last month" / "87% of target" beats a bare number. |
| **Plausible** | **Everything above the fold**, no tabs, loads < 2s. Speed is a feature. |
| **Attio / Cursor (2026)** | The dashboard as a **prioritized operating surface** — "what needs your attention now," not a static report. (Our Attention feed, §4.4.) |

**Cross‑cutting truths:** north‑star dominates top‑left · 5–9 default elements · functional color · sub‑2s load · role‑aware defaults · always‑visible nav · **pair every lagging metric (GMV) with a leading one (time‑to‑first‑booking)** · **the marketplace lives in the ratio between the two sides.**

*(Full source list is available; key ones: FT Visual Vocabulary for chart selection, Mixpanel for two‑sided‑marketplace KPIs, Smashing Magazine + UX‑in‑Motion for dashboard motion.)*

---

## 8. Creative room — where we want you to push

These are deliberately **yours** to invent (inside the tokens + RTL + reduced‑motion guardrails):

- **The hero watermark** — the topographic/botanical trace of the booking trend behind the headline.
- **The "Needs‑Attention" panel** — make it feel *alive and ranked by urgency* (the 2026 operating‑surface direction) with zero real AI.
- **The region‑comparison view** — small‑multiples grid? ranked bar? supply‑vs‑demand bubble (size = GMV)? Your call — just keep it honest (sorted, zero‑based, no dual‑axis).
- **The exact bento rhythm** of the KPI grid — as long as the north‑star dominates and the fold stays 5–9 elements.
- **The overall personality & choreography** — the entrance, the micro‑interactions, the empty/hover/live details that make it unmistakably Bplay and unmistakably premium.

> Stay inside the palette, honor RTL and reduced‑motion, keep it calm — and it will read as **خرافي because it's restrained, not despite it.**

---

## 9. Deliverables — what to hand back

Design in **Figma** (light/dark note: **dark only**). We'd love to receive:

1. **A Figma color‑style / variable set** built from Section 3 (so it's reusable and locked).
2. **The desktop dashboard** (≥1440px) — the full page, **super‑admin** view, using the realistic numbers in the Appendix.
3. **Key states of the hero + a couple of tiles/charts:** default, **loading (skeleton)**, empty, hover/tooltip. (These sell the quality.)
4. **The two‑side note:** the **regional‑admin** variant (region‑locked, super‑admin sections hidden) — can be a lighter pass.
5. **Responsive:** at least the **tablet (~800px)** reflow of the hero + KPI bento.
6. **A short motion spec / prototype** — the entrance choreography, count‑up, chart draw‑on, and a hover tooltip. A Figma Smart‑Animate prototype or a few annotated frames is perfect.
7. **RTL note:** one mirrored frame (or an annotation) showing the Arabic direction of the hero + one chart.
8. **Your creative extras** (§8) — surprise us.

Numbers, chart types, and section order in this brief are a **strong starting point, not a cage** — if you see a more elegant or more powerful arrangement, propose it (with a one‑line "why"). We iterate together from your first pass.

---

## 10. Appendix — realistic numbers for your mockups

Use these real volumes so mockups feel true (not "Lorem 999"):

- **Facilities:** 24 total → **6 pending · 10 active · 3 rejected · 3 suspended · 2 owner‑suspended**; 15 clubs / 9 pitches; ~45 courts.
  - By governorate: Damascus 8 · Aleppo 4 · Homs 3 · Latakia 3 · Tartus 2 · Hama 1 · Deir ez‑Zor 1 · Raqqa 1 · Daraa 1.
- **Players:** 16 → 13 active · 2 suspended · 1 blocked; free/paid mix; per‑player counters (bookings, spend SYP, rating 0–5).
- **Owners:** 16 → 10 active · 3 under‑review · 1 blocked; each with 4 verification docs; monthly revenue per owner (sums ≈ 43.7M SYP — a per‑owner rollup, not GMV).
- **Bookings:** ~120, spanning −58…+13 days; statuses confirmed/completed/cancelled/no‑show/under‑review/rejected; prices 25K–120K SYP; sources electronic/manual/private; payment unpaid/paid/refunded.
- **Subscriptions (club memberships):** 55 → statuses active/pending/paused/expired/cancelled; segments premium/new/near‑expiry/churn‑risk; 6‑plan catalog.
- **Owner platform tiers:** Free 4 · Pro 5 · Elite 2 (B2B revenue — its own tile).
- **Community:** 14 posts · 92 reactions · 40 comments · 1 removed · 1 video.
- **Regions:** 6 live circles (Damascus, Aleppo, Homs, Latakia, Hama, Tartus); 3 unassigned to any admin; + an "orphan pool" of entities outside all regions.
- **Admins:** 15 → 9 regional · 5 general · 3 suspended.
- **Example hero numbers you can show:** Confirmed Bookings **1,240** (▲ +18% vs prev 30d · 87% of target) · Booking GMV **48.6M SYP** · Active Facilities **10 / 24** · Active Players **13 / 16** · Active Subscriptions **41 / 55** · Needs Attention **9**.

---

*Questions, or want a specific section expanded (e.g. a full metric‑by‑metric spec sheet, or a fully Arabic version of this brief)? Ask — we'll turn it around fast.*
