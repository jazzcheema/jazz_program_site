# jazz.cheema

Personal programming portfolio built with Next.js, React, and Three.js. The current direction is a set of quiet interactive rooms: pale software fields, sparse object staging, block-particle text, minimal controls, and purposeful hidden transitions.

## Vision

The site should feel like a small system of connected instruments rather than a game menu or marketing page. Each route gets one clear interaction:

- **Home**: a pale room with the lamp as the persistent mark and the flying-carpet object as the navigation surface.
- **Clouds**: an external-project launcher. 3D portfolio objects sit above a bottom-centered project signal, description, stack/type details, and particle controls (`<`, `VISIT`, `>`).
- **Sand**: an abstract sand-kingdom gate field. A block must be moved through a minimal castle pattern before contact is revealed.
- **CV**: the document-like portfolio page, keeping its pale editorial surface and measured type system.
- **Krate signal lab**: the hidden dark room. This is the exception where the palette can turn evil, dense, and signal-heavy.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
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

```text
app/           # Next.js App Router pages, layouts, and client components
public/        # Static assets: models, textures, fonts, icons
```

## Design Direction

Primary internal references are the **CV page** and **Krate signal lab**. External references are **Fors** for pale restraint, tiny controls, centered signal compositions, and negative space; and **Teenage Engineering** for product-as-interface staging, thin schematic language, and instrument-like interaction.

The target is not arcade, racing, military HUD, or dense game UI. The interactive parts can still be playful, but the visual language should stay calm, precise, and sparse.

### Core Rules

- **One clear focus per page**: avoid adding explanatory panels or decorative systems unless they serve the main interaction.
- **Pale field first**: default scene surface is `#e2deda` (body, home, CV); dark UI belongs mainly to the hidden Krate room or inverse hover states.
- **Lamp as site mark**: do not add large homepage identity text, portfolio-axis branding, or top-right personal labels. The lamp owns that corner.
- **Portfolio links matter most on Clouds**: preserve the bottom-centered particle project title, description, stack/type metadata, and `VISIT` link.
- **Sand stays abstract**: no genie, camera object, webcam/skyfeed, character scene, or top nav. It is a block/gate puzzle that reveals contact.
- **Buttons flip with purpose**: hover/focus should invert color and swap command text when useful, for example `MAKE_CONTACT` → `EMAIL` and `GATE CONFIRMED` → `UNLOCKED`.
- **True inverse on flip**: dark cards flip to pure `#ffffff`; light cards flip to `#161616`. Avoid off-white as a hover state.
- **Block language is shared**: pixel dots, particle letters, square gates, signal grids, and small block trails are the common interaction vocabulary.
- **Use viewport corners deliberately**: controls can live at the edges when useful; avoid forcing every page into a vertical center aisle.
- **No decorative atmosphere**: avoid starfields, vortexes, generic glows, and mood effects unless the specific interaction requires them.
- **Scene pages are viewport-locked**: home, Clouds, Sand, and hidden lab should not scroll. CV can remain document-like.
- **Frosted glass for floating panels**: sand stage and joystick use `backdrop-filter: blur(14px)` with semi-transparent backgrounds. Contact cards use `blur(18px)`. Keeps the field visible behind UI.
- **Grid responds to mouse on desktop**: all scene pages (home, clouds, sand) drift the background grid with a slow lerp (4%, ±24px) and ghost visited cells with a fading white canvas trail. Mobile skips both effects.

### Palette

| Name | Value | Role |
|---|---|---|
| FIELD | `#e2deda` | Primary pale room surface (body, home, CV) |
| FIELD-ALT | `#e9e5e0` | Sand room surface and castle block field |
| INK | `#161616` | Primary text and active inverse controls |
| RULE | `rgba(22,22,22,0.12)` | Dividers, grid lines, inactive frames |
| GHOST | `#8b8780` | Secondary labels and quiet metadata |
| MUTED | `#3d3a36` | Readable body copy |
| HEAT | `#c87820` | Sand/castle blocks, advisory cards, peak/high state |
| OK | `#249958` | Gate, ready, confirmed state |
| TRACE | `#2a5fc0` | Active block, selection, movement trail |

### Advisory Cards

Both the desktop `SystemAdvisory` and the mobile gate screen use the same card design: `#c87820` background, octagonal `clip-path`, `!` icon box, `SYS-ADV` header line, rule dividers, and a dark `#0c0c0c` clipped button with `#c87820` text that flips on hover. The mobile version uses `CLASS: NOTICE-M` and mobile-specific copy. Both are shown once per device via `localStorage`.

### Sand Page Details

- The gate contact card appears 420ms after the gate opens — prevents the closing touch from immediately triggering hover state on the card.
- Contact card uses frosted dark glass (`rgba(22,22,22,0.78)` + `blur(18px)`) so the pale field bleeds through slightly.
- Sand game grid is 190px tiles; home and clouds are 192px. `GridMouseTrail` takes a `cellSize` prop to stay aligned.
- On mobile the joystick and contact card share the same bottom-center position; the delay above prevents overlap glitch.

### Page Notes

- **Clouds** should keep the 3D object carousel visually lighter on desktop so objects do not collide with the project title and text.
- **Sand** should be very simple, but not free. Contact is earned by solving a small spatial interaction.
- **Krate hidden room** can remain theatrical and darker because the contrast is the point of that route.
- **README is the source of design truth** for this experimental redesign pass; remove old visual references when they stop matching the site.
