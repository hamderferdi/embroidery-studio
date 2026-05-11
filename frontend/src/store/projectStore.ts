/**
 * projectStore — manages the list of user projects.
 * Projects are stored in Supabase when auth is available;
 * falls back to localStorage for offline / pre-auth use.
 *
 * The Supabase table uses snake_case columns; we map to/from camelCase
 * at the boundary so the rest of the app always works with ProjectMeta.
 */
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { v4 as uuid } from 'uuid'
import type { EmbroideryObject } from '../embroidery/types'
import type { CanvasPersistedState } from './canvasStore'

export interface ProjectMeta {
  id:           string
  name:         string
  ownerId:      string
  createdAt:    string
  updatedAt:    string
  hoopSize:     string
  stitchCount:  number
  colorCount:   number
  thumbnail:    string | null
  starred:      boolean
}

/** The serialisable, per-project editor state stored in `project-docs`. */
export interface ProjectPayload {
  schemaVersion: 1
  objects:       EmbroideryObject[]
  canvas:        Partial<CanvasPersistedState>
}

export interface ProjectDocument {
  meta:    ProjectMeta
  payload: ProjectPayload | null
}

// ── snake_case ↔ camelCase mappers ────────────────────────────────────────────

interface DbRow {
  id:           string
  name:         string
  owner_id:     string
  created_at:   string
  updated_at:   string
  hoop_size:    string
  stitch_count: number
  color_count:  number
  thumbnail:    string | null
  starred:      boolean
}

function fromDb(row: DbRow): ProjectMeta {
  return {
    id:          row.id,
    name:        row.name,
    ownerId:     row.owner_id,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    hoopSize:    row.hoop_size,
    stitchCount: row.stitch_count,
    colorCount:  row.color_count,
    thumbnail:   row.thumbnail,
    starred:     row.starred,
  }
}

function toDb(meta: ProjectMeta): DbRow {
  return {
    id:           meta.id,
    name:         meta.name,
    owner_id:     meta.ownerId,
    created_at:   meta.createdAt,
    updated_at:   meta.updatedAt,
    hoop_size:    meta.hoopSize,
    stitch_count: meta.stitchCount,
    color_count:  meta.colorCount,
    thumbnail:    meta.thumbnail,
    starred:      meta.starred,
  }
}

// ── Local-storage fallback ─────────────────────────────────────────────────────

const LS_KEY = 'stitchlab_projects'
function lsLoad(): ProjectMeta[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function lsSave(projects: ProjectMeta[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects))
}

const SUPABASE_READY = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
)

// ── Store ──────────────────────────────────────────────────────────────────────

interface ProjectState {
  projects:       ProjectMeta[]
  loading:        boolean
  saving:         'idle' | 'saving' | 'saved' | 'error'
  fetchProjects:  (userId: string) => Promise<void>
  createProject:  (userId: string, name: string) => Promise<ProjectMeta>
  saveProject:    (doc: ProjectDocument) => Promise<void>
  loadProjectDoc: (projectId: string) => Promise<ProjectPayload | null>
  deleteProject:  (id: string) => Promise<void>
  toggleStar:     (id: string) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading:  false,
  saving:   'idle',

  fetchProjects: async (userId) => {
    set({ loading: true })
    if (SUPABASE_READY) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })
      if (!error && data) {
        set({ projects: (data as DbRow[]).map(fromDb), loading: false })
        return
      }
    }
    set({ projects: lsLoad().filter(p => p.ownerId === userId), loading: false })
  },

  createProject: async (userId, name) => {
    const now = new Date().toISOString()
    const meta: ProjectMeta = {
      id:          uuid(),
      name,
      ownerId:     userId,
      createdAt:   now,
      updatedAt:   now,
      hoopSize:    '130x180',
      stitchCount: 0,
      colorCount:  0,
      thumbnail:   null,
      starred:     false,
    }
    if (SUPABASE_READY) {
      await supabase.from('projects').insert(toDb(meta))
    } else {
      lsSave([meta, ...lsLoad()])
    }
    set(s => ({ projects: [meta, ...s.projects] }))
    return meta
  },

  saveProject: async (doc) => {
    set({ saving: 'saving' })
    const updated: ProjectMeta = { ...doc.meta, updatedAt: new Date().toISOString() }
    try {
      if (SUPABASE_READY) {
        // 1. Always save metadata — this is the critical operation.
        await supabase.from('projects').upsert(toDb(updated))

        // 2. Save the full document payload to Storage.
        //    Non-fatal: if the bucket doesn't exist the meta save still succeeds.
        if (doc.payload !== null) {
          const body = JSON.stringify({ meta: updated, payload: doc.payload })
          await supabase.storage
            .from('project-docs')
            .upload(`${doc.meta.id}.json`, body, {
              upsert:      true,
              contentType: 'application/json',
            })
            .catch(() => {
              // Storage bucket missing or RLS blocked — store locally as fallback
              localStorage.setItem(
                `stitchlab_doc_${doc.meta.id}`,
                JSON.stringify({ meta: updated, payload: doc.payload }),
              )
            })
        }
      } else {
        const all = lsLoad()
        const idx = all.findIndex(p => p.id === updated.id)
        if (idx >= 0) all[idx] = updated; else all.unshift(updated)
        lsSave(all)
        if (doc.payload !== null) {
          localStorage.setItem(
            `stitchlab_doc_${doc.meta.id}`,
            JSON.stringify({ meta: updated, payload: doc.payload }),
          )
        }
      }
      set(s => ({
        saving:   'saved',
        projects: s.projects.map(p => p.id === updated.id ? updated : p),
      }))
      setTimeout(() => set({ saving: 'idle' }), 2500)
    } catch {
      set({ saving: 'error' })
      setTimeout(() => set({ saving: 'idle' }), 4000)
    }
  },

  loadProjectDoc: async (projectId) => {
    try {
      if (SUPABASE_READY) {
        const { data, error } = await supabase.storage
          .from('project-docs')
          .download(`${projectId}.json`)
        if (!error && data) {
          const text = await data.text()
          const doc  = JSON.parse(text) as ProjectDocument
          return doc.payload ?? null
        }
        // Storage bucket missing or file not found — fall through to localStorage
      }
      // localStorage fallback (used when !SUPABASE_READY or Storage bucket absent)
      const raw = localStorage.getItem(`stitchlab_doc_${projectId}`)
      if (raw) {
        const doc = JSON.parse(raw) as ProjectDocument
        return doc.payload ?? null
      }
    } catch {
      // Corrupt or missing document — return null so caller starts fresh
    }
    return null
  },

  deleteProject: async (id) => {
    if (SUPABASE_READY) {
      await supabase.from('projects').delete().eq('id', id)
    } else {
      lsSave(lsLoad().filter(p => p.id !== id))
    }
    set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
  },

  toggleStar: (id) => {
    set(s => {
      const updated = s.projects.map(p => p.id === id ? { ...p, starred: !p.starred } : p)
      if (SUPABASE_READY) {
        const project = updated.find(p => p.id === id)
        if (project) supabase.from('projects').update({ starred: project.starred }).eq('id', id)
      } else {
        lsSave(updated)
      }
      return { projects: updated }
    })
  },
}))
