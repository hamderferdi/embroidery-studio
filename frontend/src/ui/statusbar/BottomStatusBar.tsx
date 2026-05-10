import React from 'react'
import { useCanvasStore } from '../../store/canvasStore'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { useToolStore } from '../../store/toolStore'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-studio-faint text-xs">{label}</span>
      <span className="text-studio-muted text-xs font-mono">{value}</span>
    </div>
  )
}

const Divider = () => <div className="w-px h-3 bg-studio-border mx-2" />

const TOOL_HINTS: Record<string, string> = {
  select:         'Click to select · Click + Drag to move · Shift+click multi-select',
  pan:            'Drag to pan · Scroll to zoom · Release Space to exit pan',
  'satin-column': 'Click to place left edge points · Right-click to finish',
  'satin-fill':   'Click to draw fill boundary · Double-click to close shape',
  'tatami-fill':  'Click to draw fill boundary · Double-click to close shape',
  'run-stitch':   'Click to place path points · Double-click to finish',
  text:           'Click on canvas to place lettering',
  'node-edit':    'Click a node to select · Drag to move',
  'zoom-in':      'Click to zoom in · Scroll to zoom',
  'zoom-out':     'Click to zoom out',
}

export default function BottomStatusBar() {
  const { zoom, hoopSize, viewportWidth, viewportHeight } = useCanvasStore()
  const { stitchCount, selectedIds, objects } = useEmbroideryStore()
  const { activeTool } = useToolStore()

  const selectedCount = selectedIds.length
  const hint = TOOL_HINTS[activeTool] ?? ''

  const zoomPct = Math.round(zoom * 100)

  return (
    <div
      className="flex items-center gap-2 px-3 h-7 flex-shrink-0 select-none"
      style={{
        background: '#161310',
        borderTop: '1px solid #2e2a26',
        zIndex: 10,
      }}
    >
      {/* Tool hint */}
      <span className="text-studio-faint text-xs flex-1 truncate">{hint}</span>

      <Divider />

      {/* Canvas info */}
      <Stat label="Zoom" value={`${zoomPct}%`} />
      <Divider />
      <Stat label="Hoop" value={hoopSize} />
      <Divider />
      <Stat label="Objects" value={objects.length} />
      <Divider />
      <Stat label="Stitches" value={stitchCount.toLocaleString()} />
      {selectedCount > 0 && (
        <>
          <Divider />
          <Stat label="Selected" value={selectedCount} />
        </>
      )}

      <Divider />

      {/* WebGL indicator */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="WebGL rendering active" />
        <span className="text-studio-faint text-xs">WebGL</span>
      </div>
    </div>
  )
}
