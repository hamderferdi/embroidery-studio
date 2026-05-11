import React, { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { ViewportController } from './ViewportController'
import { useCanvasStore, HOOP_SIZES } from '../../store/canvasStore'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { useToolStore, type ToolId } from '../../store/toolStore'
import type { DrawMode } from '../layers/DrawingLayer'
import type { PenMode } from '../layers/PenLayer'
import { ptsToBezier } from '../../embroidery/types'

PIXI.settings.ROUND_PIXELS = false

/** Existing polygon/polyline drawing tools (DrawingLayer) */
const DRAW_TOOLS: Partial<Record<ToolId, DrawMode>> = {
  'satin-fill':   'polygon',
  'tatami-fill':  'polygon',
  'run-stitch':   'polyline',
  'satin-column': 'column',
}

/** Pen tool mode — currently pen always draws a polyline (run-stitch path) */
const PEN_MODE: PenMode = 'polyline'

export default function EmbroideryViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef       = useRef<PIXI.Application | null>(null)
  const vpRef        = useRef<ViewportController | null>(null)

  const {
    hoopSize, showGrid, showHoop, fabricColor,
    setZoom, setViewportSize,
  } = useCanvasStore()

  const {
    objects, selectedIds, clearSelection, selectObject,
    createFillFromBoundary, createRunFromPath, createColumnFromPaths,
    undo, redo, updateObject, liveUpdate, moveObjects, removeObject,
  } = useEmbroideryStore()

  const { activeTool, setTool, setTemporaryPan } = useToolStore()

  // ── Initialize PixiJS ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const w = el.clientWidth  || 800
    const h = el.clientHeight || 600

    const app = new PIXI.Application({
      width:           w,
      height:          h,
      backgroundColor: 0x141210,
      antialias:       true,
      resolution:      window.devicePixelRatio || 1,
      autoDensity:     true,
      powerPreference: 'high-performance',
    })

    el.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    const vc = new ViewportController(app, {
      onZoomChange:      (z) => setZoom(z),
      onObjectClick:     (id, multi) => selectObject(id, multi),
      onBackgroundClick: () => clearSelection(),

      onDrawComplete: (mode, leftPts, rightPts) => {
        const store = useEmbroideryStore.getState()
        const tool  = useToolStore.getState().activeTool
        if (mode === 'polygon') {
          const type = tool === 'tatami-fill' ? 'tatami-fill' : 'satin-fill'
          store.createFillFromBoundary(ptsToBezier(leftPts, true), type)
        } else if (mode === 'polyline') {
          store.createRunFromPath(ptsToBezier(leftPts))
        } else if (mode === 'column') {
          store.createColumnFromPaths(ptsToBezier(leftPts), ptsToBezier(rightPts))
        }
        useToolStore.getState().setTool('select')
      },

      onPenComplete: (_mode, path) => {
        // Pen tool currently creates a run-stitch
        useEmbroideryStore.getState().createRunFromPath(path)
        useToolStore.getState().setTool('select')
      },

      onNodeLiveChange: (id, _field, path) => {
        // Determine which field changed and call liveUpdate
        const obj = useEmbroideryStore.getState().objects.find(o => o.id === id)
        if (!obj) return
        const patch: Record<string, unknown> = {}
        if (_field === 'boundary')  patch.boundary  = path
        if (_field === 'path')      patch.path      = path
        if (_field === 'leftPath')  patch.leftPath  = path
        if (_field === 'rightPath') patch.rightPath = path
        useEmbroideryStore.getState().liveUpdate(id, patch as never)
      },

      onNodeCommit: (id, _field, path) => {
        const patch: Record<string, unknown> = {}
        if (_field === 'boundary')  patch.boundary  = path
        if (_field === 'path')      patch.path      = path
        if (_field === 'leftPath')  patch.leftPath  = path
        if (_field === 'rightPath') patch.rightPath = path
        useEmbroideryStore.getState().updateObject(id, patch as never)
      },

      onObjectMove: (ids, dx, dy) => {
        useEmbroideryStore.getState().moveObjects(ids, dx, dy)
      },
    })
    vpRef.current = vc

    const hoop = HOOP_SIZES[useCanvasStore.getState().hoopSize]
    vc.initFabric(useCanvasStore.getState().fabricColor, hoop, useCanvasStore.getState().showHoop)
    vc.setGridVisible(useCanvasStore.getState().showGrid)
    setViewportSize(w, h)
    setTimeout(() => vc.zoomToFit(hoop), 100)

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        vc.resize(width, height)
        setViewportSize(width, height)
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      vc.destroy()
      app.destroy(true, { children: true, texture: true, baseTexture: true })
      appRef.current = null
      vpRef.current  = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync objects ───────────────────────────────────────────────────────────
  useEffect(() => {
    const vc = vpRef.current
    if (!vc) return
    vc.syncObjects(objects)
  }, [objects])

  // ── Sync selection box (fires on any objects/selection change) ────────────
  useEffect(() => {
    vpRef.current?.syncSelection(selectedIds, objects)
  }, [selectedIds, objects])

  // ── Initialize node-edit layer — ONLY when tool or selection changes ───────
  // Do NOT include `objects` here: geometry changes are handled by syncObjects
  // (which calls nodeEdit.syncObjects, preserving drag state).
  // Including `objects` would reset drag/selection on every liveUpdate frame.
  useEffect(() => {
    const vc = vpRef.current
    if (!vc) return
    if (activeTool === 'node-edit' && selectedIds.length === 1) {
      const obj = useEmbroideryStore.getState().objects.find(o => o.id === selectedIds[0]) ?? null
      vc.syncNodeEdit(obj)
    } else if (activeTool === 'direct-select') {
      vc.syncDirectSelect(useEmbroideryStore.getState().objects)
    } else {
      // Hide node edit when neither editing tool is active
    }
  }, [selectedIds, activeTool])

  // ── Sync view toggles ──────────────────────────────────────────────────────
  useEffect(() => { vpRef.current?.setGridVisible(showGrid) }, [showGrid])
  useEffect(() => { vpRef.current?.updateHoop(HOOP_SIZES[hoopSize], showHoop) }, [hoopSize, showHoop])
  useEffect(() => { vpRef.current?.updateFabricColor(fabricColor) }, [fabricColor])

  // ── Activate tools on activeTool change ───────────────────────────────────
  useEffect(() => {
    const vc = vpRef.current
    if (!vc) return

    const drawMode = DRAW_TOOLS[activeTool]

    // Stop modes that are no longer active
    if (!drawMode) vc.stopDrawMode()
    if (activeTool !== 'node-edit') vc.stopNodeEdit()
    if (activeTool !== 'direct-select') vc.stopDirectSelect()
    if (activeTool !== 'pen') vc.stopPen()

    // Start the new active mode
    if (drawMode) {
      vc.startDrawMode(drawMode)
    } else if (activeTool === 'node-edit') {
      vc.startNodeEdit()
      const { selectedIds: ids, objects: objs } = useEmbroideryStore.getState()
      const obj = ids.length === 1 ? (objs.find(o => o.id === ids[0]) ?? null) : null
      vc.syncNodeEdit(obj)
    } else if (activeTool === 'direct-select') {
      vc.startDirectSelect()
      vc.syncDirectSelect(useEmbroideryStore.getState().objects)
    } else if (activeTool === 'pen') {
      vc.startPen(PEN_MODE)
    }

    vc.setPanMode(activeTool === 'pan')
  }, [activeTool])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey

    // Undo / Redo
    if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
    if ((meta && e.key === 'y') || (meta && e.shiftKey && e.key === 'z')) {
      e.preventDefault(); redo(); return
    }

    // Zoom-to-fit
    if (meta && e.key === '0') {
      e.preventDefault()
      vpRef.current?.zoomToFit(HOOP_SIZES[useCanvasStore.getState().hoopSize])
      return
    }

    // Delete selected objects
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target === document.body) {
        const { selectedIds: ids } = useEmbroideryStore.getState()
        ids.forEach(id => useEmbroideryStore.getState().removeObject(id))
        return
      }
    }

    // Cancel drawing / pen with Escape
    if (e.key === 'Escape') {
      const tool = useToolStore.getState().activeTool
      if (DRAW_TOOLS[tool] || tool === 'pen') { setTool('select'); return }
      clearSelection()
      return
    }

    // Tool shortcuts
    if (!meta && !e.altKey && e.target === document.body) {
      const map: Record<string, ToolId> = {
        v: 'select', a: 'direct-select', h: 'pan',
        n: 'node-edit',                              // N for Node edit
        p: 'pen',
        s: 'satin-column', f: 'satin-fill', t: 'tatami-fill',
        r: 'run-stitch', z: 'zoom-in',
      }
      if (map[e.key.toLowerCase()]) { setTool(map[e.key.toLowerCase()]) }
    }

    // Spacebar pan
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault()
      setTemporaryPan(true)
      vpRef.current?.enableSpacePan(true)
    }
  }, [undo, redo, clearSelection, setTool, setTemporaryPan])

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setTemporaryPan(false)
      vpRef.current?.enableSpacePan(false)
    }
  }, [setTemporaryPan])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [onKeyDown, onKeyUp])

  // ── Cursor ─────────────────────────────────────────────────────────────────
  const cursors: Record<string, string> = {
    select: 'default', pan: 'grab',
    'direct-select': 'default',
    'node-edit': 'default',
    pen: 'crosshair',
    'satin-fill': 'crosshair', 'tatami-fill': 'crosshair',
    'satin-column': 'crosshair', 'run-stitch': 'crosshair',
    text: 'text',
    'zoom-in': 'zoom-in', 'zoom-out': 'zoom-out',
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ cursor: cursors[activeTool] ?? 'default', background: '#141210' }}
    />
  )
}
