import React from 'react'
import TopToolbar from './ui/toolbar/TopToolbar'
import LeftToolPanel from './ui/toolbar/LeftToolPanel'
import RightInspector from './ui/inspector/RightInspector'
import BottomStatusBar from './ui/statusbar/BottomStatusBar'
import EmbroideryViewport from './engine/viewport/EmbroideryViewport'

/**
 * Full-screen application layout:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │              Top Toolbar                     │  h-10
 *   ├──────┬──────────────────────────┬────────────┤
 *   │ Tool │                          │  Inspector │  flex-1
 *   │ Panel│    PixiJS Viewport       │            │
 *   │  48px│      (flex-grow:1)       │    220px   │
 *   ├──────┴──────────────────────────┴────────────┤
 *   │              Bottom Status Bar               │  h-7
 *   └─────────────────────────────────────────────┘
 */
export default function App() {
  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#141210' }}
    >
      {/* Top toolbar */}
      <TopToolbar />

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left tool panel */}
        <LeftToolPanel />

        {/* Center viewport — fills all remaining space */}
        <div className="flex-1 min-w-0 relative">
          <EmbroideryViewport />
        </div>

        {/* Right inspector */}
        <RightInspector />
      </div>

      {/* Bottom status bar */}
      <BottomStatusBar />
    </div>
  )
}
