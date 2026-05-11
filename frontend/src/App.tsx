import React from 'react'
import TopToolbar from './ui/toolbar/TopToolbar'
import LeftToolPanel from './ui/toolbar/LeftToolPanel'
import RightInspector from './ui/inspector/RightInspector'
import BottomStatusBar from './ui/statusbar/BottomStatusBar'
import EmbroideryViewport from './engine/viewport/EmbroideryViewport'

interface AppProps {
  projectId?:   string
  projectName?: string
  onSave?:      () => void
}

/**
 * Full-screen editor layout.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │              Top Toolbar                     │  h-14
 *   ├──────┬──────────────────────────┬────────────┤
 *   │ Tool │                          │  Inspector │  flex-1
 *   │ Panel│    PixiJS Viewport       │            │
 *   │  48px│      (flex-grow:1)       │    220px   │
 *   ├──────┴──────────────────────────┴────────────┤
 *   │              Bottom Status Bar               │  h-7
 *   └─────────────────────────────────────────────┘
 */
export default function App({ projectId, projectName, onSave }: AppProps) {
  return (
    <div className="editor-root flex flex-col">
      <TopToolbar projectName={projectName} onSave={onSave} />

      <div className="flex flex-1 min-h-0">
        <LeftToolPanel />

        <div className="flex-1 min-w-0 relative">
          <EmbroideryViewport />
        </div>

        <RightInspector />
      </div>

      <BottomStatusBar />
    </div>
  )
}
