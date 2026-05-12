import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCanvasStore, HOOP_SIZES, type HoopSize } from '../../store/canvasStore'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { useProjectStore } from '../../store/projectStore'
import { compileMachineStitches, flattenForExport } from '../../embroidery/MachineCompiler'
import { exportDST } from '../../embroidery/export/DSTExporter'
import { exportPES } from '../../embroidery/export/PESExporter'

const Separator = () => (
  <div className="w-px h-6 bg-studio-border mx-1.5 flex-shrink-0" />
)

const TopBtn = ({
  label, title, onClick, active, disabled,
}: { label: string; title: string; onClick: () => void; active?: boolean; disabled?: boolean }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`icon-btn px-3 font-medium tracking-wide ${active ? 'active' : ''} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    style={{ width: 'auto', minWidth: 36, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
  >
    {label}
  </button>
)

/** Trigger a browser download of a Uint8Array as a file. */
function downloadBytes(bytes: Uint8Array, filename: string, mime = 'application/octet-stream') {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function TopToolbar({ projectName, onSave }: { projectName?: string; onSave?: () => void }) {
  const navigate = useNavigate()
  const { saving } = useProjectStore()

  const {
    hoopSize, setHoopSize, showGrid, toggleGrid,
    showRulers, toggleRulers, showHoop, toggleHoop, showStitchPoints, toggleStitchPoints,
  } = useCanvasStore()

  const { stitchCount, loadDemo, objects, undo, redo, canUndo, canRedo } = useEmbroideryStore()

  const handleExport = (format: string) => {
    try {
      const compiled   = compileMachineStitches(objects)
      const flatStitches = flattenForExport(compiled)
      if (flatStitches.length === 0) { alert('No stitches to export.'); return }

      if (format === 'dst') {
        const bytes = exportDST(flatStitches)
        downloadBytes(bytes, 'embroidery.dst')
        return
      }

      if (format === 'pes') {
        const bytes = exportPES(flatStitches, projectName ?? 'Design')
        downloadBytes(bytes, 'embroidery.pes')
        return
      }

      // Other formats (vp3, jef…) still route to the Python backend
      const BACKEND = 'http://localhost:8000'
      fetch(`${BACKEND}/export`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stitches: flatStitches, format }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
          return res.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href     = url
          a.download = `embroidery.${format}`
          a.click()
          URL.revokeObjectURL(url)
        })
        .catch(err => alert(
          `Export error: ${err instanceof Error ? err.message : err}\n\nMake sure the backend is running:\n  cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
        ))
    } catch (err) {
      alert(`Export error: ${err instanceof Error ? err.message : err}`)
    }
  }

  return (
    <div
      className="flex items-center gap-1 px-4 flex-shrink-0 select-none"
      style={{
        height: 56,
        background: '#1a1714',
        borderBottom: '1px solid #2e2a26',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <span style={{ fontSize: 17, letterSpacing: '-0.01em' }}>
          <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 600, color: 'var(--studio-text)' }}>Stitch</span><span style={{ fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
        </span>
      </div>

      <Separator />

      {/* Dashboard back */}
      <TopBtn
        label="← Back"
        title="Back to dashboard"
        onClick={() => navigate('/dashboard')}
      />

      <Separator />

      {/* File actions */}
      <TopBtn label="New"  title="New design"  onClick={() => {}} />
      <TopBtn
        label={saving === 'saving' ? 'Saving…' : saving === 'saved' ? '✓ Saved' : 'Save'}
        title="Save (⌘S)"
        onClick={() => onSave?.()}
        active={saving === 'saved'}
      />

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
      <TopBtn label="Export DST" title="Export as DST (Tajima)" onClick={() => handleExport('dst')} />
      <TopBtn label="Export PES" title="Export as PES (Brother)" onClick={() => handleExport('pes')} />
    </div>
  )
}
