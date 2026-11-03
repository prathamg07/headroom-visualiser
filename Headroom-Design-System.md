# Headroom Design System

> Form follows function. Color carries meaning. Geometry structures the page.

| | |
|---|---|
| **Product** | Headroom |
| **Document** | Design System v1.0 |
| **Date** | 4 November 2026 |
| **Theme** | Bauhaus (geometric, primary color, functional) |
| **Scope** | All screens, all surfaces, all components |

---

## 1. Design Philosophy

Headroom follows the Bauhaus discipline: geometry is the vocabulary, primary color is the signal, and every pixel earns its place by doing a job. Decoration is not permitted. Gradients, drop shadows, soft edges, glassmorphism, and skeuomorphic texture are all absent on purpose.

The three rules that govern every component:

1. **Shape is semantic.** A square is a container. A circle is a point of attention. A triangle is a warning or a direction. Hard edges by default; rounded corners only where the touch target demands it.
2. **Color is semantic.** Primary red signals money leaving or danger. Primary blue signals action and incoming money. Primary yellow signals caution before damage. Black is structure. White is ground. Nothing uses color for mood.
3. **Layout is a grid.** Everything sits on an 8px grid. Negative space is a design element, not what's left over.

### What strict Bauhaus costs in a finance UI (and what we do about it)

- Yellow cannot carry text on white. We never ask it to. Yellow appears as a fill behind black text, or as a thick (6px+) block beside black-text content.
- Saturated primary across large surfaces fatigues the eye over long sessions. We define two palettes (strict and tempered) and recommend the tempered palette for any fill above 200px square, including dashboards and the heatmap. The strict palette is reserved for buttons, badges, toasts, chart marks, and other small bright accents.
- All-hard-edges can feel aggressive on small tap targets. We permit a maximum 2px corner radius on form inputs, buttons, and chips. Cards, modals, and surfaces stay at 0px.
- Bauhaus was a print movement, not a UI movement. Where print would use an ornamental composition, we use a functional composition. The heatmap, not a graphic, is the "poster."

---

## 2. Color

### 2.1 Strict palette (primary, for accents)

| Token | Hex | Usage |
|---|---|---|
| `--red-primary` | `#E53935` | Debits, over-budget, destructive actions, collision indicators |
| `--blue-primary` | `#1E88E5` | Credits, primary actions, selected state, links |
| `--yellow-primary` | `#FDD835` | Caution, near-threshold, "tight" state. Never on white. |
| `--black` | `#0A0A0A` | All text, borders, structural rules |
| `--white` | `#FFFFFF` | Page ground, inverse text, default surface |

### 2.2 Tempered palette (for large fills)

| Token | Hex | Usage |
|---|---|---|
| `--red-fill` | `#D64545` | Heatmap red, collision banner background |
| `--blue-fill` | `#2D6CDF` | Chart fills, heatmap "safe above margin" |
| `--yellow-fill` | `#E8C547` | Heatmap yellow (with black text layered on top only) |
| `--ink-900` | `#111111` | Primary text |
| `--ink-700` | `#333333` | Secondary text |
| `--ink-500` | `#666666` | Tertiary text, disabled labels |
| `--ink-300` | `#B3B3B3` | Divider lines in dense data views only |
| `--ground` | `#FAFAFA` | Page background (one notch off white, prevents glare) |
| `--surface` | `#FFFFFF` | Cards, inputs, elevated surfaces |
| `--surface-inverse` | `#0A0A0A` | Black surfaces (header, strong footers, filled buttons) |

### 2.3 Semantic mapping (fixed; never remap)

| Meaning | Token |
|---|---|
| Money out, danger, destructive | `--red-primary` / `--red-fill` |
| Money in, primary CTA, link, selected | `--blue-primary` / `--blue-fill` |
| Caution, approaching threshold | `--yellow-primary` / `--yellow-fill` |
| Structure (text, border, rule) | `--black` / `--ink-900` |
| Ground, surface | `--ground` / `--surface` |

### 2.4 Contrast rules (hard constraints)

- Red, blue, and black on white or `--ground` all pass WCAG AA at any text size.
- Yellow carries no text, no icon, and no border thinner than 4px on any light surface. Yellow carries black text only when the yellow fill is at least 32px tall and the text is at least 16px.
- Black text on `--red-fill` or `--blue-fill` is permitted and tested per component. White text on `--red-primary` passes AA at 16px+ bold; required size and weight are enforced in the button and badge specs.
- No color-only signaling. Every red state carries a shape (triangle or filled square), every yellow state carries a word or icon, every selected state has a 2px black border in addition to the blue fill.

### 2.5 Dark mode

Deferred to v1.1. Bauhaus is historically a light-ground movement and inverting it naively produces a very different visual language. When shipped, it will not be an automatic inversion; it will be a separately designed black-ground variant with its own token file.

---

## 3. Typography

### 3.1 Typefaces

| Role | Face | Fallback stack |
|---|---|---|
| Display and UI | **Jost** (variable) | `"Jost", "Futura", "Century Gothic", system-ui, sans-serif` |
| Numeric and data | **JetBrains Mono** | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace` |
| Body (long text) | **Jost** (same face, lower weight) | same as UI |

Jost is a free, open-source Futura clone. If you license real Futura PT, swap the first entry in the stack. All numeric content (amounts, dates, headroom day counts, account balances) is JetBrains Mono so that digits align in columns without fighting proportional spacing.

### 3.2 Casing rule

Microcopy, labels, buttons, section titles, and navigation items are **lowercase**. This is a direct reference to Herbert Bayer's Universal typeface (1925), and it is the single strongest signal that the design is Bauhaus-literate rather than just a geometric sans.

- Buttons: `add transaction`, not `Add Transaction`.
- Nav items: `ledger`, `heatmap`, `groups`, `budgets`.
- Section titles: `headroom`, `this week`, `upcoming`.
- Content headings inside long text (help docs, empty states with paragraphs) use **sentence case**.
- Merchant names, user names, and user-entered text keep their original case.
- Full sentences in body copy use standard case.

### 3.3 Weights

Jost: 400 (regular), 500 (medium), 700 (bold). Nothing lighter than 400, nothing in between.

### 3.4 Type scale

| Token | Face | Size / Line height | Weight | Case | Use |
|---|---|---|---|---|---|
| `display-xl` | Jost | 72 / 76 | 700 | lower | Headroom day count on the dashboard |
| `display-l` | Jost | 48 / 52 | 700 | lower | Section hero (balance, forecast total) |
| `display-m` | Jost | 32 / 36 | 500 | lower | Card titles, screen titles |
| `title` | Jost | 20 / 24 | 500 | lower | Row titles, modal titles |
| `body` | Jost | 16 / 24 | 400 | standard | Long text, descriptions |
| `label` | Jost | 14 / 20 | 500 | lower | Form labels, nav, buttons |
| `caption` | Jost | 12 / 16 | 400 | lower | Metadata, timestamps, helper text |
| `numeric-xl` | JetBrains Mono | 72 / 76 | 500 | tabular | Hero amounts on the dashboard |
| `numeric-l` | JetBrains Mono | 32 / 36 | 500 | tabular | Transaction amounts in detail view |
| `numeric-m` | JetBrains Mono | 20 / 24 | 500 | tabular | Row amounts in the ledger |
| `numeric-s` | JetBrains Mono | 14 / 20 | 500 | tabular | Metadata amounts, percentages |

Numeric styles always use `font-variant-numeric: tabular-nums;`.

### 3.5 Letter spacing

- `display-xl`, `display-l`, `display-m`: `-0.01em` (tighten slightly, Jost looks right this way)
- `label` and `caption` in lowercase: `0.02em` (open up slightly for readability at small sizes)
- Numeric: `0`

---

## 4. Grid and Spacing

### 4.1 Base unit

8px. All spacing, component dimensions, and layout gutters are multiples of 8.

### 4.2 Spacing tokens

| Token | Pixels |
|---|---|
| `space-0` | 0 |
| `space-1` | 4 (half step, use sparingly) |
| `space-2` | 8 |
| `space-3` | 16 |
| `space-4` | 24 |
| `space-5` | 32 |
| `space-6` | 48 |
| `space-7` | 64 |
| `space-8` | 96 |
| `space-9` | 128 |

### 4.3 Page grid

Desktop uses a 12-column grid with 24px gutters and a maximum content width of 1280px. The outer page gutter is 48px on screens 1280px and up, 32px between 768 and 1280, and 16px below 768.

Mobile (below 768px) collapses to a single column with 16px side gutters. Cards occupy full width minus the gutters.

### 4.4 Density

Default density targets 56px minimum row height for interactive rows (tappable on mobile), 44px minimum for secondary interactive controls, and 32px minimum for chips and badges. A separate `density: compact` setting reduces row height to 40px for power users on the ledger view only.

---

## 5. Shape and Form

### 5.1 Shape vocabulary

- **Square** (and rectangle): the default container, card, button, input, surface. Hard corners.
- **Circle**: single points of attention. Used for avatars, the active-state dot in navigation, category color chips in the legend, the "live" indicator on a running import.
- **Triangle**: warnings, directional cues. Used for the collision banner icon, the "at risk" marker in the heatmap cell, dropdown chevrons (triangle pointing down, not a stylized chevron).
- **Line**: strong structural rules. 2px black lines are a first-class design element, not a divider of last resort.

### 5.2 Corner radius

| Token | Pixels | Applied to |
|---|---|---|
| `radius-0` | 0 | Cards, modals, tables, surfaces, heatmap cells, banners |
| `radius-1` | 2 | Buttons, inputs, selects, chips, checkboxes, radios |
| `radius-full` | 50% | Avatars, status dots, category chips |

Nothing else. No 4px, 8px, 12px, 16px, or "soft" radii.

### 5.3 Borders

- Default border: `2px solid --black`. This is the Bauhaus line weight, and it is the structural element that holds the whole UI together.
- Secondary divider: `1px solid --ink-300`, used only inside dense data tables where a 2px rule would be too heavy.
- Focus ring: `3px solid --blue-primary` with `2px offset`, visible on every focusable element.

### 5.4 Elevation

There is no elevation. No drop shadows, no glow, no box-shadow. Separation between surfaces is achieved with the 2px black border and the `--ground` versus `--surface` tonal split.

The one exception: modal and sheet overlays use a flat `rgba(10, 10, 10, 0.5)` scrim over the page. The modal itself sits on the scrim with a 2px black border and no shadow.

---

## 6. Iconography

### 6.1 Style

- Geometric construction from circles, squares, and triangles.
- 2px stroke, flat ends (not rounded).
- 24px default size, drawn on a 24px artboard with 2px padding on all sides (so the active area is 20px square).
- Single color per icon: inherits `currentColor`.
- No two-tone, no gradients, no filled-plus-outlined mix.

### 6.2 Core icon set

| Name | Composition |
|---|---|
| `arrow-up` | Vertical line + triangle head, 2px stroke |
| `arrow-down` | Same, inverted |
| `plus` | Two 2px lines crossing at the center |
| `minus` | One 2px horizontal line |
| `close` | Two 2px lines at 45 and 135 degrees |
| `check` | Two 2px lines forming a right angle |
| `warning` | Triangle outline with a square dot inside |
| `search` | Circle + 2px diagonal line |
| `filter` | Three horizontal lines decreasing in length |
| `calendar` | Square with two short vertical lines on top |
| `account` | Square (bank) or circle (person) depending on context |
| `settle` | Two circles with a 2px line between |

No icon font. SVG only, inlined as React components so `currentColor` works and each icon can be tested for crisp 2px rendering.

---

## 7. Motion

### 7.1 Principle

Motion in Bauhaus is mechanical. Elements appear, move, and disappear in straight lines at constant speed. No bounce, no spring, no overshoot.

### 7.2 Durations

| Token | ms | Easing |
|---|---|---|
| `motion-instant` | 0 | none |
| `motion-fast` | 120 | linear |
| `motion-base` | 200 | linear |
| `motion-slow` | 320 | linear |

Easing is `linear` by default. Do not use `ease-out`, `ease-in-out`, or any custom Bezier.

### 7.3 Uses

- Hover state changes: `motion-fast` or instant.
- Modal, sheet, toast open/close: `motion-base`.
- Page transitions: `motion-instant` (no animated route change).
- Heatmap and chart data updates: `motion-slow` on fill color, `motion-instant` on numeric labels (they snap).
- Loading: a single bar of `--black` moving left to right at constant speed inside a 2px-bordered rectangle. No spinners.

### 7.4 Reduced motion

If `prefers-reduced-motion: reduce` is set, all durations become 0.

---

## 8. Components

Each component below specifies the canonical form. Variants exist only where listed.

### 8.1 Button

**Primary (filled, blue):**
- Background `--blue-primary`, text `--white`, border `2px solid --black`, radius `radius-1`.
- Height 48px, horizontal padding 24px.
- Label: `label` style, lowercase, weight 500.
- Hover: background `--black`, text `--white`. No scale, no shadow.
- Pressed: background `--black`, inset 2px shift via `transform: translate(1px, 1px)`.
- Disabled: background `--ink-300`, text `--white`, border `--ink-300`.
- Focus: adds the 3px blue focus ring (see 5.3) with 2px offset.

**Primary (filled, red, destructive):**
- Same as primary blue, with `--red-primary` as background.

**Secondary (outline):**
- Background `--white`, text `--black`, border `2px solid --black`, radius `radius-1`.
- Same metrics as primary.
- Hover: background `--black`, text `--white`.

**Tertiary (text):**
- No border, no background. Text `--black` with a 2px solid `--black` underline under the label (always visible, this is the affordance in a borderless control). Underline becomes `--blue-primary` on hover.

**Icon button:**
- 44px square, 2px solid `--black` border, `--white` background, icon `--black`.
- Hover inverts to `--black` background, `--white` icon.

**Sizing variants:** small (32px tall, 16px horizontal padding), default (48px), large (56px). The display-sized primary CTA on the dashboard uses the large variant.

### 8.2 Input (text, number)

- Height 48px, padding 12px 16px, background `--white`, border `2px solid --black`, radius `radius-1`.
- Text style `body`, aligned left. Numeric inputs use `numeric-m` and right-align.
- Label above, `label` style, lowercase, 8px gap from input.
- Helper text below, `caption` style, 8px gap.
- Error state: border becomes `--red-primary` (still 2px), a red triangle warning icon appears to the right of the label, and helper text is `--red-primary`.
- Focus: focus ring (3px blue, 2px offset), border stays black.
- Disabled: background `--ground`, text `--ink-500`, border `--ink-300`.

### 8.3 Select

Same shell as the input. The dropdown opens below as a flat panel with a 2px black border, no shadow. Options are 44px tall, left-aligned, with a 2px bottom divider between them. The selected option has a `--blue-primary` 4px vertical bar on the left.

### 8.4 Checkbox and Radio

- Checkbox: 24px square, 2px solid `--black` border, `radius-1`, `--white` background. Checked state: `--black` fill with a 2px white check icon inside. No indeterminate style (if you need one, use a filled `--black` square with a 2px white horizontal line inside).
- Radio: 24px circle, 2px solid `--black` border. Selected: inner 12px `--blue-primary` circle, no outer fill change.
- Label on the right, 12px gap.

### 8.5 Toggle

Rectangle, not a pill. 48px wide, 24px tall, 2px solid `--black` border, `radius-1`. Off: `--white` fill, thumb (a 20px filled black square) on the left. On: `--blue-primary` fill, thumb on the right. The thumb moves `motion-fast`, linear.

### 8.6 Card

- Background `--surface`, border `2px solid --black`, `radius-0`, padding `space-4` (24px).
- Title (if present) uses `display-m` style, lowercase, placed top-left with 16px bottom margin.
- Cards never nest inside cards. A grouping inside a card is marked by a 2px horizontal rule.

### 8.7 List row

- Height 56px (default) or 40px (compact), full width.
- Bottom border `1px solid --ink-300` between rows, 2px solid `--black` at the top of the first row and the bottom of the last.
- Horizontal padding 16px.
- Left: icon or category chip (circle, 12px).
- Middle: title (`body`), subtitle (`caption`, `--ink-500`).
- Right: amount (`numeric-m`), red for debit, blue for credit. Sign is always shown.
- Hover: background `--ground`.

### 8.8 Table

Flat and dense. 2px black top and bottom rule on the whole table. Header row uses `label` style, lowercase, with a 2px black bottom rule. Body rows use `caption` or `body` style with 1px `--ink-300` dividers. Numeric columns use JetBrains Mono, right-aligned, with `tabular-nums`. Zebra striping is not used.

### 8.9 Modal

- Width 480px (default) or 640px (wide). Full width on mobile with 16px side gutter.
- Background `--surface`, border `2px solid --black`, `radius-0`, padding `space-5` (32px).
- Title at top using `display-m` lowercase, 24px bottom margin.
- Close button (icon button) in the top-right, outside the padding (16px from the top and right edges).
- Footer with buttons right-aligned, 16px gap, 24px above (top rule 2px `--black`).
- Scrim: flat `rgba(10, 10, 10, 0.5)`.

### 8.10 Toast

- Width 360px, docked top-right (desktop) or top-center (mobile).
- Background: `--surface` for info, `--red-primary` for error, `--blue-primary` for success. Yellow is not used for toasts because of the yellow-on-white rule.
- 2px black border, `radius-0`, padding 16px.
- Text style `body`, `--black` for info, `--white` for error and success.
- Icon on the left (24px), close icon on the right.
- Auto-dismiss after 5 seconds; swipe or click close to dismiss sooner. Errors require manual dismiss.

### 8.11 Tag and Badge

- Height 24px, horizontal padding 8px, `radius-1`, `label` style at 12px.
- Default: `--white` background, 2px `--black` border, `--black` text.
- Red: `--red-primary` background, `--white` text (bold), no border.
- Blue: `--blue-primary` background, `--white` text (bold), no border.
- Yellow: `--yellow-primary` background, `--black` text (bold), no border. Because this is a filled block above 24px and uses black text, it passes contrast.

### 8.12 Tooltip

Black rectangle with white `caption` text, 8px padding, no arrow (an arrow would be a decorative triangle that isn't earning its place, and the anchor is already clear). Appears on hover after 400ms.

### 8.13 Empty state

- Centered within the container.
- Top: a single geometric mark (a 64px circle, square, or triangle in `--black`) that matches the section's shape vocabulary. The ledger empty state uses a square. The groups empty state uses a circle. The alerts empty state uses a triangle.
- Below: a one-line `title` sentence in standard case explaining what will appear here.
- Below that: a primary button to take the first action.

### 8.14 Loading

- Inline: a 2px black rectangle, 160px wide, 4px tall, with a 32px `--black` segment sliding left to right inside it at 1200ms per cycle, linear.
- Full-screen: the same bar centered, with no overlay. No spinners, no skeleton shimmer, no pulsing dots.

### 8.15 Progress bar

- Full width, 8px tall, 2px solid `--black` border, `radius-0`.
- Fill: `--blue-primary` (default), `--yellow-primary` for 75% to 99% (carrying no text on top), `--red-primary` for 100% and over.
- Numeric label (percentage) is below the bar, not inside, and uses `numeric-s`.

### 8.16 Navigation

**Top bar (desktop):** 64px tall, `--black` background, `--white` text and icons. Logo on the left (just the wordmark `headroom` in Jost 500 lowercase, 24px, white). Primary nav items in the center, right-aligned account menu.

**Sidebar (desktop, when enabled):** 240px wide, `--white` background, 2px right border in `--black`. Each item is a 48px row with left-aligned icon (24px) and label. Active item: `--blue-primary` fill, `--white` text, 4px `--black` left bar.

**Bottom bar (mobile):** 64px tall, `--black` background, 4 items with icon (24px) and label (`caption`, 10px, lowercase). Active item: `--blue-primary` icon and label.

---

## 9. Headroom-specific components

### 9.1 Heatmap cell

The single most important element in the product.

- Cell: 56px square on desktop, 40px square on mobile. 2px black border. `radius-0`.
- Fill: `--white` (no data), `--blue-fill` (safe, above buffer + margin), `--yellow-fill` (between buffer and buffer + margin), `--red-fill` (below buffer).
- Overlay: date number in the top-left corner, `caption` style, black text. Projected end-of-day balance in the bottom-right, `numeric-s`, black text when over yellow or white, white text when over red or blue (verified for contrast).
- Collision marker: a 12px solid `--black` triangle in the top-right corner of any cell that is part of a collision run.
- Today marker: a 2px black ring inset by 2px from the cell edge (so the cell has an inner frame).
- Hover: cell border thickens to 3px; a flat tooltip card appears showing the day's full event list.

### 9.2 Headroom tile

Hero element on the dashboard.

- Full-width card, 2px black border, `--white` background, padding 32px.
- Left half: `display-xl` number in `numeric-xl` style, with a 32px `label`-style word `days` below it. The number is black at or above the alert threshold, red below.
- Right half: a horizontal timeline rectangle 48px tall and spanning the available width, 2px black border. Divided into days in the forecast; the portion left of the headroom date is `--blue-fill`, the portion right of it is `--red-fill`. Today is a 4px black vertical line.
- Below the timeline: the headroom date in `title` style, format `"until 24 nov"`.

### 9.3 Transaction row (ledger)

- 56px row, following the list-row spec.
- Left: 12px circle in the category color.
- Middle-left: merchant name in `body` lowercase if user has not overridden case; account name below in `caption`, `--ink-500`.
- Middle-right: category label in `label` style (lowercase).
- Right: amount in `numeric-m`, right-aligned. Debit prefixed with `-` and colored `--red-primary`; credit prefixed with `+` and colored `--blue-primary`. Voided transactions get a 1px strikethrough.

### 9.4 Account card

- Card component (see 8.6).
- Title: account name, lowercase (if the user typed `HDFC Savings`, keep as given).
- Below the title: account kind as a tag (see 8.11).
- Hero number: current balance in `numeric-l`.
- Below that: a 12px horizontal bar showing projected balance range over the forecast (minimum to maximum). The bar uses `--ink-300` for the range and a 2px `--blue-primary` marker for the current balance.

### 9.5 Burn-rate chart

- 240px tall, full-width inside the card.
- Flat composition. No axes beyond a 2px black baseline and a 2px black left rule.
- Daily spending bars: solid `--red-primary`. The median line is a dashed 2px `--black` horizontal rule across the chart.
- Y-axis labels (dates on the x-axis) in `caption`, lowercase, 8px gap from axis.
- No gridlines, no legends.

### 9.6 Collision banner

- Full-width across the dashboard, below the headroom tile.
- Background `--red-fill`, text `--white`.
- Left: a 24px solid white triangle pointing right.
- Middle: `title`-style message in sentence case, white. Example: `Collision ahead: 24 to 30 nov projected below buffer.`
- Right: a secondary button variant inverted to white border on red, label `see details`.
- Dismissible with an icon button on the far right.

### 9.7 Split row (groups)

- 56px row.
- Left: 32px circle avatar of the payer (initials, white on black).
- Middle: split label in `body`, below it `paid by X · split N ways` in `caption`.
- Right: user's share in `numeric-m`. Red if owed by user, blue if owed to user. Zero balance is `--ink-500`.

### 9.8 Import review screen

- Two-column layout on desktop. Left column: the raw pasted text in a monospace block, scrollable, with phone numbers and card digits visibly redacted (replaced with `●●●●`).
- Right column: a stacked list of extracted items, each a card (the lightweight variant with 2px border, no padding beyond 16px).
- Each item card shows at the top a tag indicating the action (`create`, `update`, `skip`, `discard`) in the semantic color.
- Fields are editable inline. Low-confidence items get a yellow 4px left bar inside the card.
- Bottom action bar fixed to the viewport: primary button `confirm N items`, secondary `discard all`.

### 9.9 Settle-up card

- Card with the group's name at top.
- A list of suggested transfers as rows: `A pays B X currency`. Each row is 56px with a `record` button on the right.
- Below the list: a summary line in `caption` saying `N transfers will zero all balances`.

---

## 10. Layout patterns

### 10.1 Dashboard (desktop)

12-column grid, 24px gutters.

- Row 1: Headroom tile spans 8 columns, alerts list spans 4 columns.
- Row 2: Heatmap spans 12 columns.
- Row 3: Account cards, 3 per row (each spans 4 columns).
- Row 4: Burn-rate chart spans 8 columns, upcoming recurring spans 4 columns.

### 10.2 Dashboard (mobile)

Single column, top to bottom: Headroom tile, collision banner (if any), heatmap (horizontally scrollable one week at a time), account cards (stacked), burn-rate chart, upcoming recurring.

### 10.3 Ledger

Fixed header: search input, filter chips, add-transaction button (right-aligned, primary blue, large).

Below the header: date-grouped rows. Each date is a 32px bar with the date on the left (`label`, lowercase) and the net total for the day on the right (`numeric-m`). Rows for that day follow.

### 10.4 Groups

A list of groups as cards (3 per row desktop, 1 per row mobile). Each group card shows the name, member count, and the user's current net balance as a large `numeric-l` colored by direction.

---

## 11. Content patterns

### 11.1 Writing voice

Direct, lowercase, present tense. Short sentences.

- Button labels are verbs: `add`, `save`, `delete`, `confirm`, `settle up`, `record`.
- Status labels are adjectives or nouns, not sentences: `on track`, `tight`, `at risk`, `pending`, `settled`.
- Error messages state what went wrong and what to do: `amount is required.` and `enter a positive number.` Not `Please enter an amount for this field.`

### 11.2 Numbers

- Always show the currency symbol (`₹`, `$`) immediately before the number, no space.
- Always show the sign for transaction amounts (`-₹340`, `+₹10,000`).
- Use thousands separators per the user's locale.
- Decimal places: 2 for currency with minor units (USD, INR as rupees). For currencies with no minor unit (JPY), 0.
- Dates in the UI chrome use lowercase short form: `24 nov`, `wed 24 nov`, never `November 24, 2026`.

### 11.3 Empty strings

Never show an empty field as blank where a value is expected. Show `not set` in `--ink-500` instead. Never show `N/A`; show `not applicable` written out or (preferably) do not show the field at all.

---

## 12. Accessibility

- All text passes WCAG AA for contrast (4.5:1 for body, 3:1 for large text and UI components).
- Every interactive element has a visible focus state (the 3px blue focus ring).
- No color-only state (every red/blue/yellow state is paired with shape, icon, or text).
- Keyboard traversal order follows visual order. Modals trap focus and restore it on close.
- All icons used alone (icon buttons) have an `aria-label`.
- The heatmap is navigable by arrow keys cell-to-cell, with each cell announcing its date, projected balance, and state (safe, tight, over buffer) to screen readers.
- `prefers-reduced-motion` disables all animation.
- Form labels are always visible; placeholder-as-label is forbidden.

---

## 13. Token file (reference)

A single CSS variables file at `apps/web/src/styles/tokens.css` is the source of truth. Any component style that hardcodes a color, radius, or spacing value in place of a token fails lint.

```css
:root {
  /* color strict */
  --red-primary: #E53935;
  --blue-primary: #1E88E5;
  --yellow-primary: #FDD835;

  /* color tempered */
  --red-fill: #D64545;
  --blue-fill: #2D6CDF;
  --yellow-fill: #E8C547;

  /* neutral */
  --black: #0A0A0A;
  --white: #FFFFFF;
  --ground: #FAFAFA;
  --surface: #FFFFFF;
  --surface-inverse: #0A0A0A;
  --ink-900: #111111;
  --ink-700: #333333;
  --ink-500: #666666;
  --ink-300: #B3B3B3;

  /* spacing */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;
  --space-7: 64px;
  --space-8: 96px;
  --space-9: 128px;

  /* radius */
  --radius-0: 0;
  --radius-1: 2px;
  --radius-full: 9999px;

  /* border */
  --border-strong: 2px solid var(--black);
  --border-soft: 1px solid var(--ink-300);

  /* focus */
  --focus-ring: 3px solid var(--blue-primary);
  --focus-offset: 2px;

  /* motion */
  --motion-fast: 120ms linear;
  --motion-base: 200ms linear;
  --motion-slow: 320ms linear;

  /* font */
  --font-ui: "Jost", "Futura", "Century Gothic", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms linear;
    --motion-base: 0ms linear;
    --motion-slow: 0ms linear;
  }
}
```

---

## 14. What NOT to do

A short list of things that would break the system. Treat these as review blockers.

- Do not introduce a fourth color beyond red, blue, yellow (and black, white, grey). If a new state needs to be visually distinct, use shape, border weight, or layout, not color.
- Do not add rounded corners above 2px. Do not use `border-radius: 8px` anywhere. The one exception is `radius-full` for avatars and dots.
- Do not add drop shadows. If a surface needs to feel lifted, give it a 2px black border and a white background against the `--ground` page.
- Do not use gradients. Flat fill only.
- Do not mix cases. Lowercase labels mean *all* labels. Do not sentence-case one nav item because it "looks weird."
- Do not use Jost at weights below 400 or above 700. No `font-weight: 300`, no `900`.
- Do not use proportional digits for amounts. Always `tabular-nums`.
- Do not animate with `ease-in-out` or spring physics. Linear only.
- Do not use yellow for text. Ever.
- Do not add emoji as icons. Use the SVG icon set.
- Do not use skeleton shimmer for loading. Use the sliding-bar component.
- Do not nest cards inside cards.
- Do not use outlined icon style on one screen and filled on another. Pick one per icon (outlined, 2px) and keep it everywhere.
- Do not add ornamental Bauhaus decoration (the primary-colored circle-triangle-square poster motif) into the UI as a visual flourish. It belongs on the login screen and the marketing site, not inside the app. Form follows function; the geometry is already doing its job in the components.

---

## 15. Revision history

| Version | Date | Changes |
|---|---|---|
| 1.0 | 4 November 2026 | Initial design system. Color (strict and tempered palettes), typography (Jost + JetBrains Mono, lowercase casing rule), 8px spacing grid, shape vocabulary, 0px/2px radius policy, flat elevation, linear motion, full component specs, Headroom-specific component specs, token file, hard do-not list |
