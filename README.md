# Embroidery Studio

A professional embroidery digitizing application built for the web — inspired by Wilcom, Hatch, and Figma. Draw shapes directly on the canvas, tune stitch parameters in the inspector, and export to industry-standard machine formats.

## Features

- **WebGL viewport** — PixiJS v7 + pixi-viewport: infinite pan/zoom, 60fps even with 50k+ stitches
- **Four stitch types** — Satin Fill, Tatami Fill, Run Stitch, Satin Column
- **Interactive drawing** — polygon, polyline, and column draw modes with snap-to-close and rubber-band preview
- **Node editing** — drag individual boundary/path vertices to reshape objects in real-time
- **Live stitch regeneration** — change angle, density, or length; stitches recompute instantly
- **Undo / Redo** — 50-level snapshot history (Ctrl+Z / Ctrl+Y)
- **Export** — DST, PES, VP3, EXP, JEF, SVG via FastAPI + pyembroidery backend
- **Hoop presets** — 100×100 mm through 300×200 mm with fabric texture and vignette shadow

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| Rendering | PixiJS v7 + pixi-viewport v5 |
| State | Zustand 4 |
| UI chrome | TailwindCSS 3 |
| Backend | FastAPI + pyembroidery |

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Backend (optional — required for file export)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs on [http://localhost:8000](http://localhost:8000). With the backend running, the **Export DST** and **Export PES** buttons in the toolbar will download machine-embroidery files.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `H` | Pan tool |
| `A` | Node edit |
| `F` | Satin Fill |
| `T` | Tatami Fill |
| `S` | Satin Column |
| `R` | Run Stitch |
| `Z` | Zoom In |
| `Escape` | Cancel draw / deselect |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+0` | Zoom to fit |
| `Space` (hold) | Temporary pan |
| Middle mouse / scroll | Pan / zoom |

## Drawing Guide

1. Select a stitch tool from the left panel (or press its shortcut key).
2. **Left-click** to place anchor points on the canvas.
3. **Double-click** or **right-click** to complete the shape (for polygons: click near the first point to snap-close).
4. For Satin Column: right-click to finish the left edge, then draw the right edge, then right-click again to finish.
5. The shape switches to the Select tool automatically. Use the right inspector to tune parameters.
6. Switch to **Node Edit** (`A`) to drag individual vertices.

## Architecture

```
src/
  embroidery/
    types.ts                  — domain model (EmbroideryObject, StitchPair, etc.)
    EmbroideryEngine.ts       — routes objects to the right generator
    generators/
      SatinFillGenerator.ts   — scanline polygon fill
      TatamiFillGenerator.ts  — segmented scanline fill with row offset
      SatinColumnGenerator.ts — arc-length-synchronized dual-path stitches
      RunStitchGenerator.ts   — polyline walk with multi-pass support
  engine/
    renderers/
      StitchRenderer.ts       — 3-pass thread drawing (shadow / body / highlight)
    layers/
      FabricLayer.ts          — woven fabric background + hoop border
      GridLayer.ts            — adaptive mm/cm grid
      EmbroideryLayer.ts      — manages one StitchRenderer per object
      SelectionLayer.ts       — dashed bounding box + resize handles
      DrawingLayer.ts         — in-progress shape preview
      NodeEditLayer.ts        — draggable vertex handles
    viewport/
      ViewportController.ts   — pixi-viewport wrapper, pointer routing
      EmbroideryViewport.tsx  — React bridge, keyboard shortcuts, store sync
  store/
    embroideryStore.ts        — objects, history, stitch generation
    canvasStore.ts            — zoom, hoop, view toggles
    toolStore.ts              — active tool state
  ui/
    toolbar/                  — TopToolbar, LeftToolPanel
    inspector/                — RightInspector, ObjectsList, ThreadPanel
    statusbar/                — BottomStatusBar
```
