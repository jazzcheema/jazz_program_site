# jazz.cheema

My programming portfolio — a 3D interactive experience built with Next.js and Three.js, styled with a sleek PlayStation UI aesthetic.

## Vision

A portfolio that *feels* like a game. Navigating projects, skills, and contact through immersive 3D scenes, smooth camera transitions, and that signature PS-era glow + frosted glass UI language.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| 3D | Three.js |
| Language | TypeScript |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev    # local dev server
npm run build  # production build
npm run start  # serve production build
npm run lint   # lint
```

## Project Structure

```
app/           # Next.js App Router pages and layouts
public/        # Static assets (models, textures, fonts)
```

## Design Language

Primary influence: **The Designers Republic (TDR)** — the Sheffield studio behind Wipeout's visual identity. Their work is the bible for every UI decision.

### TDR / Wipeout visual rules
- **Color** — near-black (`#050510`) backgrounds; single electric blue accent; red only for danger/peak. No gradients, no softness.
- **Typography** — geometric monospace throughout. Tight tracking, all-caps labels, version numbers everywhere (`VER.01.09.26`). Mixed micro and macro scales on the same surface.
- **Data density** — every panel should feel like a technical document: frequency bars (EQ-style), coordinate readouts, material scans, draw-call counts. The UI is *information*, not decoration.
- **Fine print as texture** — dense legal/system copy at the bottom of panels functions as a visual barcode. It doesn't need to be read; it needs to fill space with authority.
- **Arrows** — `→` is the primary navigation glyph. Used for labels, hierarchy, wayfinding. Never bullets.
- **Dividers** — thin 1px horizontal rules between every section. No rounded corners. No shadows.
- **Corporate language** — object names like `LAMP_UNIT_001`, class designations like `CLASS: DECORATIVE-B`, registration codes like `AX-7741-B`. Makes the UI feel like a military/industrial system.
- **Color swatches** — palette always documented inline (name + hex), styled like a brand standards document.
- **No decoration for decoration's sake** — every element is either data or navigation. Nothing is purely aesthetic.

### Palette
| Name  | Hex       | Role                  |
|-------|-----------|-----------------------|
| VOID  | `#050510` | Background            |
| STRAT | `#0033aa` | Borders, dividers     |
| PULSE | `#0055ff` | Labels, headers       |
| CORE  | `#c0ccff` | Primary text          |
| DIM   | `#304080` | Secondary / fine print|
