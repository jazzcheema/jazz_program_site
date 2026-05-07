# jazz.cheema

My programming portfolio — a 3D interactive experience built with Next.js and Three.js, styled with a severe off-black PlayStation UI aesthetic and sparse product-instrument web language.

## Vision

A portfolio that *feels* like a game. Navigating projects, skills, and contact through immersive 3D scenes, smooth camera transitions, and a PS-era technical interface built from darkness, low-contrast gray text, sparse instrument-color data, and quiet product-site precision.

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

Secondary web references: **Fors** and **Teenage Engineering**. These add restraint: open negative space, tiny technical navigation, product-as-interface hero composition, thin line icons, pixel-grid gestures, and an engineered-but-playful instrument feel. The site should feel like a piece of software that belongs next to a synth, sampler, controller, or dev kit.

### TDR / Wipeout visual rules
- **Color** — off-black (`#0c0c0c`) dominates. Panels, rules, labels, and fine print live in compressed gray values. Blue is no longer the primary accent; color appears only as data state (amber / green / muted blue), never as decoration. No gradients.
- **Panel surface / frosted glass** — cards and info panels can use translucent off-black (`rgba(12, 12, 12, 0.72)`) or pale smoke (`rgba(226, 222, 218, 0.46-0.72)`) with restrained Gaussian-style backdrop blur (`blur(18px) saturate(118%)`) so 3D objects, scene geometry, pixels, or product forms remain visibly present behind the UI. Critical confirmations and contact surfaces can sit heavier (`rgba(12, 12, 12, 0.84-0.90)`) with stronger blur (`blur(24px-26px) saturate(124%)`) for a denser glass instrument feel. The blur must reveal depth behind the surface; if nothing is behind it, use a flatter panel instead.
- **Interactive glass states** — when a HUD/contact tile becomes actionable, the whole card should be the hit area. Hover/focus may invert the surface into CORE-on-VOID or VOID-on-CORE, swap the command label, and keep the motion short and mechanical.
- **Product-site restraint** — use Fors-style minimal grey fields and centered pixel/signal compositions when a page needs air, calm, or onboarding. Use Teenage Engineering-style black product stages, thin outline marks, oversized line typography, and object close-ups when a page needs presence. The references should temper the TDR density, not replace it.
- **Icon language** — prefer thin, schematic icons and simple glyph systems: stars, tools, lab marks, outline boxes, pixel paths, arrows, small instrument symbols. Icons should feel like printed hardware legends or OS toolbar marks.
- **Shape language** — cards, panels, tiles, and modals should be rectilinear with restrained radii. Default to `4px-8px`; larger cards may use up to `12px` only when the glass surface needs softness. Avoid fully rounded rectangles, pill-shaped cards, and bubbly containers. Pills are reserved for tiny status chips or compact nav controls when the interaction clearly benefits.
- **Responsive framing** — 3D scenes are composed against a `1440×900` design frame and should scale by camera containment, not by independent per-model hacks. Smaller or narrower viewports pull the camera back to preserve the full composition proportionally.
- **Typography** — geometric monospace throughout. Tight tracking, all-caps labels, version numbers everywhere (`VER.01.09.26`). Mixed micro and macro scales on the same surface.
- **Data density** — every panel should feel like a technical document: frequency bars (EQ-style), coordinate readouts, material scans, draw-call counts. The UI is *information*, not decoration.
- **Fine print as texture** — dense legal/system copy at the bottom of panels functions as a visual barcode. It doesn't need to be read; it needs to fill space with authority.
- **Arrows** — `→` is the primary navigation glyph. Used for labels, hierarchy, wayfinding. Never bullets.
- **Dividers** — thin 1px horizontal rules between every section. Shadows are rare and shallow; optical separation should come from contrast, blur, and object depth behind glass.
- **Corporate language** — object names like `LAMP_UNIT_001`, class designations like `CLASS: DECORATIVE-B`, registration codes like `AX-7741-B`. Makes the UI feel like a military/industrial system.
- **Color swatches** — palette always documented inline (name + hex), styled like a brand standards document.
- **No decoration for decoration's sake** — every element is either data or navigation. Nothing is purely aesthetic.
- **No scroll anywhere** — the entire experience is viewport-locked. No `overflow-y` or `overflow-x` scroll on any surface, including panels and overlays. If content doesn't fit, reduce density or size — never introduce a scrollable region. `body` carries `overflow: hidden` globally; all components must respect it.

### Palette
| Name   | Hex       | Role                              |
|--------|-----------|-----------------------------------|
| VOID   | `#0c0c0c` | Primary background / scene void   |
| PANEL  | `#101010` | Panel mass / recessed surfaces    |
| GLASS  | `rgba(12,12,12,0.72-0.90)` | Translucent blurred panel surface / heavier contact glass |
| RULE   | `#1e1e1e` | Borders, dividers, hard seams     |
| GHOST  | `#303030` | Secondary labels / inactive data  |
| SIGNAL | `#808080` | Readable data text                |
| CORE   | `#c8c8c8` | Primary labels / active headings  |
| HEAT   | `#c87820` | Peak data / high-band bars        |
| FIELD  | `#249958` | Stable data / normal-band bars    |
| TRACE  | `#2a5fc0` | Occasional instrument trace only  |
