/**
 * EditorPage — per-project lifecycle wrapper.
 *
 * Every time a different projectId is opened this page:
 *  1. Resets all editor stores (embroidery objects, canvas settings, tool state)
 *  2. Shows a loading overlay while fetching the project document
 *  3. Hydrates the stores with the loaded data
 *  4. Fits the viewport to the project's hoop
 *
 * On save / autosave it:
 *  1. Captures a thumbnail from the PixiJS canvas
 *  2. Packs the full editor state into a ProjectPayload
 *  3. Persists meta + payload to Supabase (or localStorage fallback)
 *
 * Result: projects A and B are always completely independent.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore }     from '../store/projectStore'
import { useAuthStore }        from '../store/authStore'
import { useEmbroideryStore }  from '../store/embroideryStore'
import { useCanvasStore }      from '../store/canvasStore'
import { useToolStore }        from '../store/toolStore'
import { useSettingsStore }    from '../store/settingsStore'
import { captureSnapshot, fitViewportToHoop } from '../lib/viewportCapture'
import App from '../App'

// ── Save-status indicator ──────────────────────────────────────────────────────

export function SaveIndicator() {
  const { saving } = useProjectStore()
  if (saving === 'idle') return null
  const map: Record<string, { text: string; color: string }> = {
    saving: { text: '↑ Saving…',    color: '#8c857c' },
    saved:  { text: '✓ Saved',      color: '#40916c' },
    error:  { text: '⚠ Save error', color: '#f87171' },
  }
  const s = map[saving]
  return (
    <span style={{
      fontSize: 11, color: s.color,
      fontFamily: '"Inter", system-ui, sans-serif',
      letterSpacing: '-0.01em',
      transition: 'opacity 0.3s',
    }}>
      {s.text}
    </span>
  )
}

// ── Loading overlay ────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#141210',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14,
    }}>
      {/* Animated stitch dot */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #2d6a4f30',
        borderTopColor: '#2d6a4f',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 13, color: '#4a4540', fontFamily: '"Inter", system-ui, sans-serif', letterSpacing: '-0.01em' }}>
        Loading project…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Editor page ────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user }      = useAuthStore()

  const { projects, fetchProjects, saveProject, loadProjectDoc } = useProjectStore()
  const autosaveInterval = useSettingsStore(s => s.autosaveInterval)

  const [isLoading, setIsLoading] = useState(true)

  // ── Load project on mount / projectId change ─────────────────────────────
  useEffect(() => {
    if (!projectId) {
      // Dev mode: no project ID — just reset stores and open blank canvas
      useEmbroideryStore.getState().reset()
      useCanvasStore.getState().reset()
      useToolStore.getState().reset()
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)

      // 1. Wipe all shared editor state so nothing bleeds from previous project
      useEmbroideryStore.getState().reset()
      useCanvasStore.getState().reset()
      useToolStore.getState().reset()

      // 2. Fetch project list if needed (gives us the meta / name)
      if (user && projects.length === 0) {
        await fetchProjects(user.id)
      }

      // 3. Load the stored document payload
      const payload = await loadProjectDoc(projectId!)

      if (cancelled) return

      // 4. Hydrate stores with saved data
      if (payload) {
        if (payload.objects && payload.objects.length > 0) {
          useEmbroideryStore.getState().hydrateObjects(payload.objects)
        }
        if (payload.canvas) {
          useCanvasStore.getState().hydrateCanvas(payload.canvas)
        }
      }

      setIsLoading(false)

      // 5. Zoom viewport to fit the hoop once the canvas has rendered
      setTimeout(() => fitViewportToHoop(), 120)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ── Save function ────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!projectId) return

    const embState  = useEmbroideryStore.getState()
    const canvState = useCanvasStore.getState()

    // Capture thumbnail BEFORE we await anything (DOM must still be rendered)
    const thumbnail = captureSnapshot()

    const colorCount = new Set(
      embState.objects.map(o => (o as { color?: { hex?: string } }).color?.hex ?? '')
        .filter(Boolean)
    ).size

    // Find the current meta (may have been fetched after component mounted)
    const allProjects = useProjectStore.getState().projects
    const meta = allProjects.find(p => p.id === projectId)
    if (!meta) return

    await saveProject({
      meta: {
        ...meta,
        stitchCount: embState.stitchCount,
        colorCount,
        hoopSize:    canvState.hoopSize,
        thumbnail:   thumbnail ?? meta.thumbnail,
      },
      payload: {
        schemaVersion: 1,
        objects: embState.objects,
        canvas: {
          hoopSize:    canvState.hoopSize,
          fabricColor: canvState.fabricColor,
          showGrid:    canvState.showGrid,
          showRulers:  canvState.showRulers,
          showHoop:    canvState.showHoop,
        },
      },
    })
  }, [projectId, saveProject])

  // ── Autosave ─────────────────────────────────────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    if (!projectId || !user || autosaveInterval === 0 || isLoading) return

    autoSaveRef.current = setInterval(doSave, autosaveInterval * 1000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [projectId, user, autosaveInterval, isLoading, doSave])

  // ── Keyboard save (Cmd/Ctrl + S) ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        doSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doSave])

  const project = projects.find(p => p.id === projectId)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {isLoading && <LoadingOverlay />}
      <App projectId={projectId} projectName={project?.name} onSave={doSave} />
    </div>
  )
}
