# New Portfolio Handoff

This repo should be treated as a strong sandbox, not as the final public portfolio shell. The next site can keep the best interaction ideas while losing the toy-room/game framing. The goal is a clean creative-programming portfolio that feels minimal, breathable, cohesive, fresh, and technically alive.

## Positioning

Jazzcheema.net should feel like a working studio interface for creative programming:

- Quiet enough that the work can breathe.
- Visually distinctive without feeling like a game menu.
- Technically expressive, but not constantly asking the user to play.
- Built around atmosphere, realtime systems, filmic motion, and audio-reactive 3D.
- Clear about professional credibility: selected work, technical depth, CV, contact.

The current site can remain a sandbox, easter-egg world, or alternate experience. The new main site should be more editorial and precise.

## What To Keep

### 1. Light-up Tile / Cursor Background

Source: `app/components/GridMouseTrail.tsx`

Why it works:

- It is abstract, ambient, and not tied to any game metaphor.
- The interaction is subtle: the cursor leaves memory rather than triggering a gag.
- It scales well as a site-wide texture behind clean layouts.

How to adapt:

- Keep it as a low-opacity fixed canvas.
- Use larger cells on portfolio pages, smaller cells only in dense technical sections.
- Replace the current eerie green mode with named themes: `neutral`, `night`, `signal`, `warm`.
- Add a `disabledOnMobile` prop or render a static CSS grid on mobile.

Suggested next-site defaults:

```ts
cellSize: 144
trailLength: 8
fadeMs: 900
baseGridAlpha: 0.035
activeAlpha: 0.11
```

### 2. BFG Room Color And Lighting Direction

Source areas:

- `app/components/SceneWrapper.tsx`
- `app/components/CarpetScene.tsx`
- `app/globals.css`, BFG-related classes

What to keep:

- The dark green/black lighting language.
- The feeling of volumetric glow and charged air.
- The audio-reactive point data.

What not to keep for the main site:

- Konami unlock framing.
- Weapon/game semantics.
- Hidden-room structure as the primary navigation.

Translate it into:

- A "signal field" around selected 3D objects.
- Ambient volumetric studies behind project case studies.
- Audio-reactive point clouds as visual instruments, not weapons.

### 3. "Look" Project Overlay

Source: `app/components/CloudsPage.tsx`

Why it works:

- It lets a 3D object become a doorway into real work.
- The video overlay is closer to a portfolio case-study system than the rest of the sandbox.
- The sticky frosted controls feel polished.

How to adapt:

- Keep the idea of object -> inspect -> project detail.
- Rename interaction language away from "look" if it feels too game-like. Good alternatives: `View`, `Open`, `Study`, `Case`.
- Use actual project thumbnails/videos sooner. The project itself should be visible quickly.
- Make the overlay a reusable `ProjectCaseStudyOverlay` with sections for problem, role, stack, clips, and link.

### 4. CV Page

Source: `app/components/CVPage.tsx`

Why it works:

- It has a good balance of craft and credibility.
- The content is strong.
- The canvas/dot systems add identity without preventing scanning.

How to adapt:

- Keep the content model: About, Experience, Education, Awards, Credits, Skills.
- Reduce any unlock/game mechanics for the main domain.
- Use it as the information-density anchor for the new site.
- Consider making CV available at `/cv` and as a downloadable PDF.

### 5. Rounded Frosted Flip Buttons

Source areas:

- `app/globals.css`: `.sand-audio-control`, `.sand-weather-control`, `.mobile-gate-btn`, `.video-overlay-return-btn`, `.sand-email-flip`, `.bfg-exit-btn`
- `app/components/SceneWrapper.tsx`
- `app/components/SandPage.tsx`
- `app/components/CloudsPage.tsx`

Keep:

- Rounded/frosted controls.
- Inverse color hover states.
- Compact pill controls that expand only when useful.

Refine:

- Keep border radius consistent: small cards around 8px, pills only for controls.
- Use fewer novelty labels.
- Prefer icons for common actions, text for project/navigation actions.
- Make hover inversions fast and crisp: 140-180ms.

## What To Leave Behind

The new main site should avoid:

- Making the whole site feel like a room-navigation game.
- Requiring users to discover essential portfolio content.
- Overusing hidden interactions, codes, or jokes.
- Putting the strongest professional information behind playful mechanics.
- Letting 3D scenes compete with the work.

Sandbox energy is valuable, but jazzcheema.net should establish trust immediately.

## Design Ethos

### Keywords

Minimal, breathable, sharp, atmospheric, cinematic, technical, tactile, calm, precise.

### Layout

- First screen should show name, role, selected work access, and a living visual system.
- Use generous whitespace and clear section rhythm.
- Let 3D and canvas systems live full-bleed or behind content, not inside decorative cards.
- Keep project pages editorial: title, role, year, stack, media, process, outcome.
- Use dense layouts only where useful, like CV and technical notes.

### Typography

- Keep a mono voice, but do not let everything feel like terminal UI.
- Pair the existing Geist Mono feel with a clean sans for longer text.
- Keep body copy readable and calm.
- Avoid all-caps for long labels. Save all-caps for small metadata.

### Color

Recommended base palette:

```css
--paper: #ece9e4;
--ink: #111111;
--muted: rgba(17, 17, 17, 0.56);
--line: rgba(17, 17, 17, 0.12);
--glass: rgba(236, 233, 228, 0.58);
--night: #060806;
--signal-green: #44ff88;
--acid: #c6ff00;
--warm-amber: #c87820;
--cool-blue: #2a5fc0;
```

Use accents sparingly. The site should not become one-note green, blue, beige, or purple. The base should feel neutral, with signal colors appearing when systems activate.

### Motion

- Motion should feel like signal, breath, scan, focus, and audio response.
- Prefer slow springing and easing over bouncing.
- Good defaults: `cubic-bezier(0.16, 1, 0.3, 1)` for entrance, 140-180ms ease for hover.
- Avoid constant large movement behind reading surfaces.

## Suggested Site Structure

```txt
/
  Living minimal homepage
  Selected work
  Volumetric study / signal field
  Contact

/work
  Grid or index of projects

/work/teva
/work/episode
/work/krate
  Case studies with video, stack, role, notes

/cv
  Refined version of current CV page

/lab
  Optional home for experiments, point-cloud studies, sandbox links
```

The current repo can be linked from `/lab` if you want to preserve it publicly without letting it define the main identity.

## Component Extraction Map

### Copy Almost Directly

`app/components/GridMouseTrail.tsx`

- Rename to `LightGridBackground`.
- Turn hardcoded colors into props.
- Keep fixed canvas and pointer memory.

`app/lib/audioAnalyser.ts`

- Keep as the base audio analysis singleton.
- Rename return values if needed, but the current `bass`, `mid`, `treble`, `snare`, `highSpike` split is useful.
- Add an option for an invisible audio element or generated oscillator source in the new repo.

### Copy With Refactor

`app/components/CVPage.tsx`

- Extract data arrays into `content/cv.ts`.
- Split into `CVSection`, `ExperienceItem`, `SkillsMatrix`, and `GhostTrail`.
- Remove unlock mechanics for the public CV.

`app/components/CloudsPage.tsx`

- Extract project data into `content/projects.ts`.
- Pull out `ProjectCaseStudyOverlay`, `ProjectObjectCarousel`, `DotMatrixProjectSignal`, and `ParticleButton`.
- Avoid carrying over the whole page as one large component.

`app/components/CarpetScene.tsx`

- Do not copy wholesale.
- Extract point-cloud sampling, audio-reactive displacement, lighting recipes, and render-loop hygiene.
- Leave the room navigation and BFG interaction behind.

`app/components/LampCorner.tsx`

- Useful as a smaller reference for mesh-to-point-cloud conversion.
- The lamp point-cloud swap is easier to port than the full BFG scene.

### CSS To Rebuild As Tokens

From `app/globals.css`, preserve the ideas, not the file:

- Frosted pill controls.
- Inverse hover buttons.
- Fixed canvas backgrounds.
- Sticky frosted overlay bars.
- Subtle grid overlays.

In the new repo, create a small design-system layer:

```txt
components/ui/GlassButton.tsx
components/ui/ExpandablePill.tsx
components/ui/LightGridBackground.tsx
components/project/ProjectCaseStudyOverlay.tsx
components/three/VolumetricPointCloud.ts
lib/audio/analyser.ts
lib/three/sampleMeshPoints.ts
```

## Volumetric Point Cloud Direction

This should become a signature language of the new site.

### Core Idea

Point clouds should surround or reveal invisible objects. The object can be absent, transparent, or only implied by the behavior of the particles. Audio can come from:

- An actual visible audio track.
- A hidden loop used only as a modulation source.
- A generated Web Audio oscillator/noise source.
- Microphone input only if explicitly requested by the user.

For the main portfolio, invisible or silent-source audio-reactivity is the strongest direction: the site feels alive without becoming a music player.

### Visual Modes

1. Shell Field
   Points sit on or near the sampled surface of an invisible model. Bass pushes outward along normals.

2. Volumetric Fog Field
   Points occupy a loose sphere/box around the object. Mids create sway and drift.

3. Signal Spikes
   Treble/high transients briefly stretch points into line segments.

4. Reveal/Conceal
   The mesh stays hidden, but the point cloud density, opacity, and motion reveal its silhouette.

5. Project Aura
   Each project has a distinct field behavior: Teva cinematic/soft, Episode CRT/electric, Krate social/music/pulse.

### Architecture

Recommended reusable pieces:

```ts
type AudioBands = {
  bass: number
  mid: number
  treble: number
  snare: number
  highSpike: number
}

type PointCloudSource = {
  base: Float32Array
  phases: Float32Array
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
}
```

Sampling recipe from this repo:

```ts
object.updateMatrixWorld(true)
const inv = new THREE.Matrix4().copy(object.matrixWorld).invert()
const verts: number[] = []

object.traverse((child) => {
  const mesh = child as THREE.Mesh
  if (!mesh.isMesh) return
  const posAttr = mesh.geometry.attributes.position
  if (!posAttr) return

  mesh.updateWorldMatrix(true, false)
  const toLocal = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)

  for (let i = 0; i < posAttr.count; i += 2) {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(toLocal)
    verts.push(v.x, v.y, v.z)
  }
})
```

Animation recipe:

```ts
const { bass, mid, snare, highSpike } = getAudioFreqs()
const pos = geometry.attributes.position as THREE.BufferAttribute

for (let i = 0; i < pos.count; i++) {
  const bx = base[i * 3]
  const by = base[i * 3 + 1]
  const bz = base[i * 3 + 2]
  const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
  const phase = phases[i]

  const shell = bass * 0.08 * (0.45 + 0.55 * Math.sin(time * 8 + phase))
  const sway = mid * 0.06
  const spike = highSpike * 0.12 * Math.sin(time * 70 + phase * 2.1) ** 2
  const push = shell + spike + snare * 0.06

  pos.setXYZ(
    i,
    bx + (bx / len) * push + Math.sin(time * 1.4 + phase) * sway,
    by + (by / len) * push + Math.sin(time * 1.1 + phase * 1.3) * sway,
    bz + (bz / len) * push + Math.sin(time * 1.7 + phase * 0.7) * sway,
  )
}

pos.needsUpdate = true
material.opacity = Math.min(0.82, 0.24 + bass * 0.4 + mid * 0.25 + snare * 0.35)
material.size = 0.008 + highSpike * 0.008
```

### Important Performance Rules

- Mutate existing `Float32Array` buffers. Do not allocate new arrays every frame.
- Cap device pixel ratio, usually `Math.min(window.devicePixelRatio, 2)`.
- Use `depthWrite: false` and additive blending for luminous fields.
- Dispose geometries/materials on unmount.
- Pause or reduce animation when not visible.
- Make mobile point counts lower and motion calmer.
- Keep readable content over a stable scrim or in quiet zones.

## Homepage Direction

A strong first version of the new homepage:

- Full viewport, neutral paper background.
- Subtle light-up tile background.
- Small header: Jazz Cheema, Work, CV, Lab, Contact.
- Large but not huge intro: "Creative developer building cinematic interactive systems."
- One living volumetric point-cloud object in the background or side field.
- Three selected work links with compact metadata.
- Frosted buttons with inverse hover: `View Work`, `CV`, `Email`.

Avoid a marketing hero. Make it feel like the actual workspace is already loaded.

## Migration Order

1. Start a clean Next app with Three.js and the same font direction.
2. Add tokens and `GlassButton`.
3. Port `GridMouseTrail` as `LightGridBackground`.
4. Port CV content into clean data files and build `/cv`.
5. Build project content data and a minimal `/work`.
6. Add `ProjectCaseStudyOverlay` using the better parts of `CloudsPage`.
7. Build `VolumetricPointCloud` as the main visual system.
8. Add `/lab` only after the main pages feel cohesive.

## Naming Direction

Good words for the new site:

- Signal
- Field
- Study
- Work
- Index
- System
- Scene
- Volume
- Trace

Use fewer words like:

- Room
- Game
- Unlock
- Quest
- Enter
- Shoot
- Secret

## Final Read

The new site should feel like someone opened a precise creative tool, not like they entered a toy world. Keep the tactile canvas work, the frosted controls, the CV strength, and the audio-reactive point-cloud research. Strip the framing down until the work, the atmosphere, and the technical authorship all feel like one coherent system.
