# ZenTrip Frontend Rewrite — "NIGHT RADAR"

> Mission-control / aviation-ops redesign. **Backend stays untouched** — frontend-only rewrite.
> Data flow is **store-first** (Zustand + localStorage is the single source of truth).

---

## 1. Why this works for a resume project

- Instantly distinct from the blue/purple-glass AI-app template every reviewer has seen
- The theme *is* the story: "8 AI agents running a flight operation" — the design narrates the architecture
- Monospace data readouts, radar sweeps, HUD frames → feels engineered, matches an AI-orchestration project
- Dark themes photograph well in portfolio screenshots and README GIFs

## 2. Design system

### 2.1 Palette (replaces globals.css tokens)

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#07090A` | Page background (near-black, green-tinted) |
| `--color-panel` | `#0D1210` | Panels / cards |
| `--color-panel-raised` | `#131A17` | Raised surfaces, hovers |
| `--color-foreground` | `#D7E4DC` | Primary text (green-tinted white) |
| `--color-dim` | `#6B7A72` | Secondary text |
| `--color-radar` | `#7CFC9A` | Primary accent — radar phosphor green |
| `--color-amber` | `#FFB454` | Warnings, in-progress states, highlights |
| `--color-alert` | `#FF6B5E` | Errors, destructive |
| `--color-grid` | `rgba(124,252,154,0.07)` | Grid/scanline lines |
| `--color-frame` | `rgba(124,252,154,0.18)` | HUD borders |

### 2.2 Typography

- Display: **Space Grotesk** (headlines, big numerals)
- Data: **JetBrains Mono** (all numbers, coordinates, timestamps, labels, statuses)
- Body: Space Grotesk / Inter (keep it minimal — this UI is data-first)
- Convention: tiny uppercase mono labels with wide tracking (`tracking-[0.2em] text-[10px]`) everywhere — this is the signature texture

### 2.3 Textures & effects

- **Dot-grid background** on all pages (CSS radial-gradient, subtle)
- **Scanline sweep**: one thin green line slowly traversing the hero (CSS animation, 8s loop)
- **HUD corners**: cards framed with corner brackets (`::before/::after` L-shapes) instead of full borders
- **Glow**: `box-shadow: 0 0 24px rgba(124,252,154,0.12)` on active elements only
- **Status semantics**: green = completed/OK, amber = working/pending, red = error — consistent across the whole app
- Motion: Framer Motion, short (150–300ms), all "instrument" like — blips, sweeps, count-ups. No bouncy springs.

### 2.4 Remove

- All glassmorphism (`.glass`), the blue `#19C2FF` / purple `#6D5EF9` duo, gradient text, rounded-2xl soft cards
- Replace Tailwind theme tokens in `globals.css` + delete `shadow-glow`, `gradient-text` utilities (add `hud-corner`, `dot-grid`, `scanline` utilities instead)

## 3. Store-first data rules (the simplification)

1. Zustand (`useTripStore`) is the **only** trip data source. No fetch-on-load anywhere.
2. **Delete** the trip detail page's auto-sync-on-mount effect and `saveTripChanges()` server PUTs.
3. Orchestrate still calls `POST /api/agents/orchestrate` (SSE) — the only generation path.
4. Weather still calls `/api/weather`.
5. **Share & Export-to-server panels: remove.** Keep client-side exports (JSON download, ICS calendar, checklist MD, print-to-PDF) — they're local-only anyway.
6. Group vote: keep the **client-side merge** path only (already exists in `submitVotes` when `!hasSupabaseConfig`); drop the server branch.
7. Delete trip = `removeSavedTrip()` only.
8. Keep `hasSupabaseConfig` import if needed to hide any leftover server UI, but goal is: **zero DB API calls from the frontend**.

## 4. Page-by-page plan

### 4.1 Landing `/` — "Control Tower"
- Full-viewport radar: CSS/SVG concentric rings + rotating sweep (conic-gradient animation), blips pulse as the sweep passes
- Headline in Space Grotesk 64–96px: `PLAN LIKE A FLIGHT OPS TEAM` — no emoji chips
- Live "flight board" strip instead of feature grid: mono rows `AGT-01 INTENT ......... READY` that flick to `ACTIVE` on scroll
- Single CTA: `INITIATE TRIP ▸` (square, green outline → fill on hover)
- Footer: mono coordinates-style text

### 4.2 Wizard `/trip/new` — "Flight Plan Filing"
- Stepper as a **checklist panel**: `01 DESTINATION — FILED`, progress like pre-flight checks
- Inputs: square corners, mono labels, focus ring = green outline + glow
- Budget/duration sliders styled as throttle levers (custom track, mono readout right-aligned)
- Review step reads like a **flight plan card**: `DEST: KOCHIN · PAX: 2 · FUEL: ₹50,000`

### 4.3 Generation overlay — "Mission Control" *(signature moment #1)*
- Full-screen takeover: left = agent roster (8 rows), right = live log ticker
- Each agent row: mono id (`AGT-04 ROUTE`), status blip, animated progress bar, one-line output
- Radar mini-map center-bottom showing overall %; sweep speed tied to progress
- On `trip` SSE event: brief "PLAN LOCKED" stamp, then navigate

### 4.4 Trip detail `/trip/[id]` — "Operations Board"
- Top bar: trip code (`ZT-4F2A` from id), destination, PAX, status chip; actions as icon buttons
- Tabs as segmented mono control: `ITINERARY / BUDGET / MAP / WX / CHECKLIST`
- Day cards: HUD frames; day number as big mono numeral; right rail per day = weather + travel load readouts
- Timeline: vertical dashed line with blip markers; meals vs activities distinguished by icon + color (amber meals, green activities)
- **Signature moment #2:** clicking "Route Map" draws the route SVG stroke with `stroke-dashoffset` animation, end-to-end
- Lock day = amber `LOCKED` stamp overlay; regenerate = inline sweep animation on that day card only
- Remove: share panel, export-to-server panel, group-vote server branch (keep client-side merge UI, restyled)

### 4.5 Dashboard `/dashboard` — "Hangar"
- Trips as **flight-strip cards**: horizontal rows (like airport departure boards), mono columns: `CODE / DESTINATION / DAYS / BUDGET / CONF% / STATUS`
- Row hover: green edge glow + actions reveal (open, duplicate, delete)
- Search input styled as a command line: `> search_`
- Empty state: "NO FLIGHT PLANS ON FILE — INITIATE FIRST TRIP"
- Add **"Load demo trip"** button (recruiter path — zero LLM calls)

### 4.6 Auth `/auth`, Profile `/profile`, Settings `/settings`, Plans `/plans`, Shared `/shared/[slug]`
- Same skin; low effort: tokens + typography swap, HUD frames
- `/plans`: keep as "sample destinations" board restyled; consider deprioritizing — it's static content, not core story
- `/shared/[slug]`: keep functional (it's a public view), restyle only; it uses the API but that's its purpose

## 5. Component inventory

**New shared:** `HudFrame` (corner-bracket card), `StatusBlip`, `MonoLabel`, `RadarSweep`, `BoardRow` (flight strip), `CommandInput`
**Rework:** `Navbar` → `TopBar` (thin, mono links, terminal logo `ZENTRIP_`), `MobileBottomNav` (green accent), `AgentPanel` (extract from wizard page into `components/agents/`), `BudgetChart` (recharts → custom green/amber donut or keep recharts with new palette), `TripRouteMap` (leaflet dark tiles: CartoDB dark_matter + route overlay styling)
**Delete:** share/export server panels, `saveTripChanges`, sync-on-mount effect

## 6. Implementation order

1. **Tokens & shell** — globals.css palette/fonts/utilities, TopBar, MobileBottomNav, dot-grid bg → every page instantly re-skinned
2. **Landing** — radar hero + flight board
3. **Store-first cleanup** — remove sync/PUT/share/export server code (with 4)
4. **Wizard + Mission Control overlay**
5. **Trip detail** — itinerary, timeline, budget, map, wx, checklist
6. **Dashboard** — flight strips + demo trip
7. **Secondary pages** — auth/profile/settings sweep
8. **Polish** — count-up numerals, scanline timing, reduced-motion media queries, mobile audit

Each milestone ships a usable app. Milestones 1–3 alone transform the feel.

## 7. Quality bar

- Light-touch: respect `prefers-reduced-motion` (no sweeps/pulses)
- Contrast: dim text ≥ 4.5:1 against panels
- No layout shift from fonts (`display: swap`)
- Mobile: single-column ops board; radar effects scale down gracefully
- Typecheck (`npx tsc --noEmit`) + `npm run build` green after every milestone
