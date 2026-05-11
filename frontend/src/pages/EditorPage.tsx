/**
 * EditorPage — wraps the existing embroidery editor for a specific project.
 * Handles project load/save lifecycle around the editor.
 */
import React, { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore }    from '../store/authStore'
import App                 from '../App'

// ── Save-status indicator (shown in the top toolbar via portal) ───────────────

export function SaveIndicator() {
  const { saving } = useProjectStore()
  if (saving === 'idle') return null
  const map: Record<string, { text: string; color: string }> = {
    saving: { text: '↑ Saving…',  color: '#8c857c' },
    saved:  { text: '✓ Saved',    color: '#40916c' },
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

// ── Editor page ────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const { projects, fetchProjects, saveProject } = useProjectStore()

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch project list if not yet loaded
  useEffect(() => {
    if (user && projects.length === 0) {
      fetchProjects(user.id)
    }
  }, [user, projects.length, fetchProjects])

  // Autosave every 60 seconds
  useEffect(() => {
    if (!projectId || !user) return
    autoSaveRef.current = setInterval(() => {
      const meta = projects.find(p => p.id === projectId)
      if (meta) {
        saveProject({ meta, payload: null })
      }
    }, 60_000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [projectId, user, projects, saveProject])

  const project = projects.find(p => p.id === projectId)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Back-to-dashboard button — sits above the editor toolbar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 20,
        height: 0,   // zero-height; children absolutely positioned
        pointerEvents: 'none',
      }}>
        {/* Dashboard back button — overlaid on top-left of existing toolbar */}
        <div style={{
          position: 'absolute',
          right: 220, top: 10,
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto',
        }}>
          <SaveIndicator />
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '4px 12px', borderRadius: 6,
              background: 'rgba(26,23,20,0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #3a3630',
              fontSize: 11, color: '#8c857c',
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* The full editor */}
      <App projectId={projectId} projectName={project?.name} />
    </div>
  )
}
