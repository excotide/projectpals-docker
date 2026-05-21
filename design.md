# ProjectPals — Design Specification
> For use with Google Stitch / AI design-to-code tools.

---

## 1. Design Philosophy

**Dark, minimal, and precise.** ProjectPals is a collaboration platform for technical teams. The UI uses a near-black neutral background, subtle borders, and a single blue accent color for interactive elements. There is no decorative noise — every element exists to serve clarity.

- **Mood:** Professional, focused, developer-tool aesthetic
- **Contrast:** Low-contrast surface layers; high-contrast text on dark backgrounds
- **Density:** Medium — cards have generous padding, but grids are compact

---

## 2. Color System

### Surface Palette (dark theme only)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#101415` | Main page background |
| `card` | `#161c1e` | Card / panel surfaces |
| `elevated` | `#1b2022` | Search bar, input fields, nav hover state |
| `active` | `#1e2628` | Active navigation item background |
| `border` | `#252c2e` | All borders — sidebar, cards, inputs, topbar |
| `chip` | `#2e3739` | Toggle chip / unselected chip border |
| `logout` | `#1f1014` | Logout button hover background |

### Semantic Colors (Tailwind defaults)

| Role | Hex | Tailwind class |
|------|-----|----------------|
| Primary action | `#2563eb` | `blue-600` |
| Primary hover | `#1d4ed8` | `blue-700` |
| Accent / active text | `#3b82f6` | `blue-500` |
| Light accent | `#60a5fa` | `blue-400` |
| Success / Ongoing | `#22c55e` | `green-500` |
| Success light | `#4ade80` | `green-400` |
| Emerald accent | `#34d399` | `emerald-400` |
| Destructive / Logout | `#ef4444` | `red-500` |
| Destructive hover | `#dc2626` | `red-600` |
| Cyan (info tip) | `#06b6d4` | `cyan-400` |

### Text Scale

| Role | Hex | Tailwind class |
|------|-----|----------------|
| Headings | `#f8fafc` | `slate-50` / `white` |
| Body primary | `#f1f5f9` | `slate-100` |
| Secondary | `#94a3b8` | `slate-400` |
| Muted | `#64748b` | `slate-500` |
| Dim / placeholder | `#475569` | `slate-600` |

---

## 3. Typography

**Font family:** `Sora`, fallback `Segoe UI`, `sans-serif`

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Page title | 28px | 700 | Dashboard welcome heading |
| Section heading | 18–20px | 700 | Card titles, section headers |
| Card title | 15px | 600 | Room/project name inside card |
| Body | 14px | 400 | General content |
| Label | 13px | 500 | Form labels, nav items, button text |
| Caption / meta | 11–12px | 400–500 | Timestamps, room codes, subtitles |
| Monospace | 10–22px | 400–700 | Room codes (font-mono) |

**Letter spacing:** Uppercase labels use `tracking-[0.08em]`. Room codes use `tracking-[0.2em]`.

---

## 4. Spacing & Sizing

| Element | Value |
|---------|-------|
| Sidebar width | 230px |
| Topbar height | 60px |
| Card border radius | 14px |
| Panel border radius | 16px (rounded-2xl) |
| Button border radius | 8px (rounded-lg) |
| Chip border radius | 8px |
| Page padding | 32px horizontal, 32px top |
| Card padding | 20–28px |
| Grid gap (rooms) | 18px |
| Input padding | 11px vertical, 16px horizontal |

---

## 5. Core Components

### 5.1 Sidebar

**Width:** 230px · **Background:** `#101415` · **Right border:** 1px `#252c2e`

```
┌──────────────────────────┐
│  ProjectPals             │  ← logo, 17px bold white
│  Precision Collaboration │  ← tagline, 11px slate-500
│                          │
│  ▪ Dashboard             │  ← active: bg #1e2628, text blue-500
│    Create Room           │  ← inactive: text slate-500
│    Join Room             │
│    My Rooms              │
│    History               │
│                          │
│  ──────────────────────  │  ← divider, 1px #252c2e
│    Profile               │
│    Settings              │
│    Logout                │  ← red-500
└──────────────────────────┘
```

- Active item has a **3px blue-500 vertical bar** on the right edge
- Hover state: `bg-elevated` (#1b2022), text slate-400
- Logout hover: `#1f1014` background

---

### 5.2 Topbar

**Height:** 60px · **Background:** `#101415` · **Bottom border:** 1px `#252c2e`

```
[                    ] [Search projects...    ] [🔔] [?] [AB]
                       ← 260px search pill →         ↑ avatar
```

- Search bar: `#1b2022` bg, rounded-full, 260px wide, 14px icon + 13px placeholder
- Icons (bell, help): slate-500, hover slate-300
- Avatar: 34px circle, gradient `blue-500 → violet-500`, 2px `blue-600` border, shows user initials

---

### 5.3 Status Badge

Small pill with colored border and text. No solid background.

| Status | Border & Text |
|--------|---------------|
| Open | `green-500` |
| Matching | `purple-400` |
| Ongoing | `blue-500` |
| Waiting | `slate-400` |
| Completed | `blue-400` |
| Closed | `slate-500` |

```
┌─────────────┐
│  ● Ongoing  │  ← border 1px green-500, text green-500, rounded-full, 11px
└─────────────┘
```

---

### 5.4 Room Code Chip

Monospace code rendered as a dark pill.

```
┌─────────┐
│ ABC123  │  ← bg #252c2e, font-mono, 10px, slate-600, rounded, tracking-wide
└─────────┘
```

---

### 5.5 Room Card (MyRooms / Dashboard)

**Background:** `#161c1e` · **Border:** 1px `#252c2e` · **Hover border:** `blue-600`

```
┌──────────────────────────────────────┐
│ [Open Badge]            [ABC123]     │  ← status + room code chip
│                                      │
│ Website E-Commerce                   │  ← 15px semibold slate-100
│ @budi · May 11, 2026                 │  ← blue-500 username + date, 11px
│                                      │
│ 👥 4 per group  ·  5 groups          │  ← capacity, 12px slate-500
│                                      │
│ [Frontend Dev] [Backend Dev] +1 more │  ← role chips, 11px slate-400
│                                      │
│ [  Copy Code  ]  [  Open Room  ]     │  ← two buttons, full-width pair
└──────────────────────────────────────┘
```

- Role chips: `#1b2022` bg, border `#252c2e`, 11px text slate-400
- "Copy Code" button: `#252c2e` bg, slate-400 text → `emerald-900/text-emerald-400` when copied
- "Open Room" button: `blue-600` bg, white text

---

### 5.6 Action Cards (Dashboard)

Two cards side-by-side in a 2-column grid.

**Create Room card:**
```
┌──────────────────────────────────────── ◯ ┐
│ [+]                                       │  ← 40px blue-700 icon box
│                                           │
│ Create Room                               │  ← 18px bold
│ Start a new precision collaboration…      │  ← 13px slate-500
│                                           │
│ [Create Room →]                           │  ← blue-600 button
└───────────────────────────────────────────┘
```
Background: `linear-gradient(145deg, #101d36, #0f1c35)` · Border: 1px `#252c2e`
Decorative ring (130px circle) at top-right, faint blue border

**Join Room card:**
```
┌────────────────────────────────────────┐
│ [👥]                                   │  ← 40px emerald-900 icon box
│                                        │
│ Join Room                              │
│ Enter a unique invitation code…        │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Enter Room Code (e.g. PP-405)    │  │  ← input, #101415 bg
│ └──────────────────────────────────┘  │
│ [              Join               ]   │  ← blue-600 full-width button
└────────────────────────────────────────┘
```

---

### 5.7 Primary Button

```
bg: #2563eb  hover: #1d4ed8  text: white  radius: 8px  padding: 10px 20px
```

Disabled state: `#252c2e` bg, `slate-600` text, `cursor-not-allowed`

### 5.8 Ghost / Subtle Button

```
bg: transparent  border: 1px #252c2e  text: slate-500
hover border: blue-500/50  hover text: slate-400
```

### 5.9 Destructive Button

```
bg: red-500  hover: red-600  text: white  radius: 8px
```

### 5.10 Text Input

```
bg: #101415  border: 1px #252c2e  radius: 8px  padding: 11px 16px
text: slate-100  placeholder: slate-600
focus border: #2563eb (blue-600)
```

### 5.11 Toggle Chip (multi-select)

```
Selected:   border blue-500, text blue-500, font-semibold
Unselected: border #2e3739, text slate-500
Hover:      border blue-500/50, text slate-400
```

---

## 6. Page Layouts

### 6.1 Global Shell

All authenticated pages share this shell:

```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (230px fixed)  │  MAIN AREA (flex-1)         │
│                        │  ┌───────────────────────┐  │
│  [nav items]           │  │ TOPBAR (60px)         │  │
│                        │  └───────────────────────┘  │
│                        │  ┌───────────────────────┐  │
│                        │  │ PAGE CONTENT          │  │
│                        │  │ (scrollable)          │  │
│                        │  └───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

### 6.2 Dashboard

```
PAGE CONTENT (padding: 32px)
│
├── Welcome heading + subtitle (date + ongoing count)
│
├── ACTION CARDS GRID (2 columns, gap 20px)
│   ├── Create Room card (gradient bg)
│   └── Join Room card (with input)
│
└── YOUR ACTIVE ROOMS
    ├── Section header + "View all" link
    └── ROOMS GRID (3 columns, gap 18px)
        └── Room Card × N
```

---

### 6.3 CreateRoom

```
PAGE CONTENT (padding: 28px)
│
├── ERROR BANNER (conditional, red border)
│
├── 2-COLUMN GRID (1fr + 380px, gap 20px)
│   ├── LEFT COLUMN
│   │   ├── Card: Project Identity
│   │   │   ├── Project Name input
│   │   │   └── Role Definitions
│   │   │       ├── Input + [Add] button
│   │   │       └── Role list (bullet + name + × )
│   │   │
│   │   └── Card: Collaboration Logistics
│   │       ├── Productivity Windows (2×2 toggle chips)
│   │       └── Work Environment (2×2 toggle chips)
│   │
│   └── RIGHT COLUMN (spans both rows)
│       └── Card: Project Scale
│           ├── Max members (number input)
│           ├── Number of groups (number input)
│           ├── Pool estimate bar
│           └── [Create Room] button (disabled until valid)
│
└── PRO-TIP BANNER (cyan border, gradient headline)
```

**Success state:** Green check ring + "Room Created!" heading + [View Room Details]

**Info state:** Room detail card with stats + monospace room code + copy button + [Go to Room]

---

### 6.4 MyRooms

```
PAGE CONTENT (padding: 32px)
│
├── "My Rooms" heading + count badge
├── Subtitle text
│
├── FILTER TABS (horizontal row)
│   └── [All 5] [Open 2] [Matching 1] [Ongoing 1] [Closed 1]
│       Active tab: blue-600 solid · Inactive: border #252c2e
│
├── LOADING / ERROR / EMPTY STATE (full-width card)
│
└── ROOMS GRID (3 columns → 2 → 1 responsive, gap 18px)
    └── Room Card × N (enriched with roles, capacity, owner)
```

---

## 7. Motion & Interaction

| Interaction | Duration | Property |
|-------------|----------|----------|
| Button hover color | 200ms | background, color |
| Card border hover | 200ms | border-color |
| Nav item hover | 150ms | background, color |
| Input focus border | 200ms | border-color |
| Chip select | 150ms | border, color, font-weight |
| Copy → Copied feedback | 2000ms timeout, then reset | background, color |
| Logout spinner | `animate-spin` (Tailwind) | rotation |

---

## 8. Iconography

All icons are inline SVG, **18×18px** in nav, **14–20px** in content. Stroke-based (`stroke="currentColor"`, `strokeWidth="2"`), no fill except for the grid/dashboard icon.

Key icons used:
- Dashboard: 4-square grid (filled rects)
- Create Room: circle with plus
- Join Room: person with plus
- My Rooms: rectangle with inner lines (layout)
- History: clock
- Profile: person circle
- Settings: gear/cog
- Logout: arrow-right-from-box
- Bell: notification bell
- Search: magnifying glass
- Copy: overlapping rectangles
- Check: polyline checkmark
- Trash: trash bin

---

## 9. Empty & Loading States

### Loading
Single card with centered text: *"Loading your rooms..."* — `#1b2022` bg, `#252c2e` border, `slate-500` text.

### Error
Same card but with `red-500` border and `red-400` text showing the error message.

### Empty
Dashed-border card (`border-dashed #252c2e`), `slate-500` message, optionally two action buttons (Create Room / Join Room) centered.

---

## 10. Room Detail Page (owner vs member view)

The detail page uses the `access.is_owner` flag from the API to conditionally render:

| Element | Owner | Member |
|---------|-------|--------|
| "Edit Room" button | ✓ visible | ✗ hidden |
| "Hapus Room" (red) | ✓ visible | ✗ hidden |
| "Leave Room" button | ✗ hidden | ✓ visible |
| "Owner" badge | ✓ shown | shows "Member" |
| Owner info (name + username) | shown for all | shown for all |
