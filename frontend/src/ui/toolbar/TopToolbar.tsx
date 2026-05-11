import React from 'react'
import { useCanvasStore, HOOP_SIZES, type HoopSize } from '../../store/canvasStore'
import { useEmbroideryStore } from '../../store/embroideryStore'

const Separator = () => (
  <div className="w-px h-5 bg-studio-border mx-1 flex-shrink-0" />
)

const TopBtn = ({
  label, title, onClick, active, disabled,
}: { label: string; title: string; onClick: () => void; active?: boolean; disabled?: boolean }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`icon-btn px-2.5 text-xs font-medium tracking-wide ${active ? 'active' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    style={{ width: 'auto', minWidth: 32 }}
  >
    {label}
  </button>
)

const BACKEND = 'http://localhost:8000'

async function exportDesign(format: string, stitches: { x: number; y: number }[]) {
  const res = await fetch(`${BACKEND}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stitches, format }),
  })
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `embroidery.${format}`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TopToolbar({ projectName }: { projectName?: string }) {
  const {
    hoopSize, setHoopSize, showGrid, toggleGrid,
    showRulers, toggleRulers, showHoop, toggleHoop, showStitchPoints, toggleStitchPoints,
  } = useCanvasStore()

  const { stitchCount, loadDemo, objects, undo, redo, canUndo, canRedo } = useEmbroideryStore()

  const handleExport = async (format: string) => {
    // Flatten all stitches from all objects into a single array
    const allStitches: { x: number; y: number }[] = []
    for (const obj of objects) {
      if (obj.stitches) {
        for (const [a, b] of obj.stitches) {
          allStitches.push({ x: a.x, y: a.y })
          allStitches.push({ x: b.x, y: b.y })
        }
      }
    }
    if (allStitches.length === 0) { alert('No stitches to export.'); return }
    try {
      await exportDesign(format, allStitches)
    } catch (err) {
      alert(`Export error: ${err instanceof Error ? err.message : err}\n\nMake sure the backend is running:\n  cd backend && pip install -r requirements.txt && uvicorn main:app --reload`)
    }
  }

  return (
    <div
      className="flex items-center gap-1 px-3 h-12 flex-shrink-0 select-none"
      style={{
        background: '#1a1714',
        borderBottom: '1px solid #2e2a26',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <a
          href="#"
          title="Home"
          style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5 L17.5 9 V17.5 H13 V13 H7 V17.5 H2.5 V9 Z" fill="#40916c" opacity="0.85" />
            <path d="M10 2.5 L17.5 9" stroke="#40916c" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2.5 9 L10 2.5" stroke="#40916c" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </a>
        <span className="text-studio-text font-semibold text-xs tracking-wide" style={{ letterSpacing: '0.03em' }}>
          <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600 }}>Stitch</span><span style={{ fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
        </span>
      </div>

      <Separator />

      {/* File actions */}
      <TopBtn label="New"  title="New design"  onClick={() => {}} />
      <TopBtn label="Open" title="Open design" onClick={() => {}} />
      <TopBtn label="Save" title="Save design" onClick={() => {}} />

      <Separator />

      {/* Undo / Redo */}
      <TopBtn label="↩ Undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
      <TopBtn label="↪ Redo" title="Redo (Ctrl+Y)"  onClick={redo} disabled={!canRedo} />

      <Separator />

      {/* Demo loader */}
      <TopBtn label="Load Demo" title="Load demo embroidery design" onClick={loadDemo} />

      <Separator />

      {/* View toggles */}
      <TopBtn label="Grid"    title="Toggle grid"          onClick={toggleGrid}          active={showGrid} />
      <TopBtn label="Rulers"  title="Toggle rulers"        onClick={toggleRulers}        active={showRulers} />
      <TopBtn label="Hoop"    title="Toggle hoop display"  onClick={toggleHoop}          active={showHoop} />
      <TopBtn label="Pts"     title="Toggle stitch points" onClick={toggleStitchPoints}  active={showStitchPoints} />

      <Separator />

      {/* Hoop size picker */}
      <div className="flex items-center gap-2">
        <span className="text-studio-muted text-xs">Hoop</span>
        <select
          value={hoopSize}
          onChange={(e) => setHoopSize(e.target.value as HoopSize)}
          className="prop-input text-xs"
          style={{ width: 120 }}
        >
          {Object.entries(HOOP_SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project name */}
      {projectName && (
        <span style={{ fontSize: 12, color: '#4a4540', letterSpacing: '-0.01em', fontFamily: 'inherit' }}>
          {projectName}
        </span>
      )}

      {/* Stitch count */}
      <div className="flex items-center gap-1.5">
        <span className="text-studio-muted text-xs">Stitches</span>
        <span className="font-mono text-xs text-studio-text">
          {stitchCount.toLocaleString()}
        </span>
      </div>

      <Separator />

      {/* Export */}
      <TopBtn label="Export DST" title="Export as DST (requires backend)" onClick={() => handleExport('dst')} />
      <TopBtn label="Export PES" title="Export as PES (requires backend)" onClick={() => handleExport('pes')} />
    </div>
  )
}
