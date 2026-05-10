import { create } from 'zustand'

export type ToolId =
  | 'select'
  | 'pan'
  | 'satin-column'
  | 'satin-fill'
  | 'tatami-fill'
  | 'run-stitch'
  | 'text'
  | 'node-edit'
  | 'zoom-in'
  | 'zoom-out'

export interface ToolState {
  activeTool: ToolId
  previousTool: ToolId
  cursorOverCanvas: boolean
  setTool: (tool: ToolId) => void
  setCursorOverCanvas: (v: boolean) => void
  temporaryPan: boolean
  setTemporaryPan: (v: boolean) => void
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'select',
  previousTool: 'select',
  cursorOverCanvas: false,
  temporaryPan: false,

  setTool: (tool) => set((s) => ({
    previousTool: s.activeTool,
    activeTool: tool,
  })),

  setCursorOverCanvas: (v) => set({ cursorOverCanvas: v }),

  setTemporaryPan: (v) => {
    const s = get()
    if (v && !s.temporaryPan) {
      set({ temporaryPan: true, previousTool: s.activeTool, activeTool: 'pan' })
    } else if (!v && s.temporaryPan) {
      set({ temporaryPan: false, activeTool: s.previousTool })
    }
  },
}))
