/**
 * settingsStore — user preferences, persisted to localStorage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MeasurementUnit = 'mm' | 'inches'
export type RenderQuality   = 'performance' | 'balanced' | 'quality'
export type AutosaveInterval = 30 | 60 | 120 | 300 | 0  // 0 = off

export interface SettingsState {
  // Editor
  autosaveInterval:  AutosaveInterval
  defaultHoopSize:   string
  measurementUnit:   MeasurementUnit
  renderQuality:     RenderQuality
  showGrid:          boolean
  showRulers:        boolean
  // Viewport
  zoomSensitivity:   number   // 0.5 – 2.0
  invertScroll:      boolean
  // UI
  sidebarWidth:      number
  // Actions
  update: (partial: Partial<Omit<SettingsState, 'update'>>) => void
  reset:  () => void
}

const DEFAULTS = {
  autosaveInterval: 60   as AutosaveInterval,
  defaultHoopSize:  '130x180',
  measurementUnit:  'mm' as MeasurementUnit,
  renderQuality:    'balanced' as RenderQuality,
  showGrid:         true,
  showRulers:       false,
  zoomSensitivity:  1.0,
  invertScroll:     false,
  sidebarWidth:     220,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (partial) => set(partial),
      reset:  () => set(DEFAULTS),
    }),
    { name: 'stitchlab-settings' }
  )
)
