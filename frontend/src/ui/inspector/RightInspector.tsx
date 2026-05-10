import React from 'react'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { useCanvasStore } from '../../store/canvasStore'
import { THREAD_PALETTE, type ThreadColor } from '../../embroidery/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-section">
      <div className="panel-label">{title}</div>
      {children}
    </div>
  )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  )
}

function NumInput({
  value, onChange, min, max, step, unit,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string
}) {
  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        type="number"
        className="prop-input flex-1"
        value={value}
        min={min}
        max={max}
        step={step ?? 0.1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {unit && <span className="text-studio-muted text-xs">{unit}</span>}
    </div>
  )
}

// ── Thread palette swatches ────────────────────────────────────────────────────

function ThreadSwatch({ color, active, onClick }: {
  color: ThreadColor; active: boolean; onClick: () => void
}) {
  return (
    <button
      title={`${color.name} (${color.hex})`}
      onClick={onClick}
      style={{
        width: 18, height: 18,
        background: color.hex,
        borderRadius: 3,
        border: active ? '2px solid #40916c' : '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: active ? '0 0 0 1px #40916c' : 'none',
      }}
    />
  )
}

// ── Object property inspector ──────────────────────────────────────────────────

function ObjectInspector() {
  const { objects, selectedIds, updateObject } = useEmbroideryStore()
  const selected = objects.filter(o => selectedIds.includes(o.id))

  if (selected.length === 0) {
    return (
      <div className="panel-section text-center" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="text-studio-muted text-xs">No object selected</div>
        <div className="text-studio-faint text-xs mt-1">Click an object to inspect</div>
      </div>
    )
  }

  const obj = selected[0]

  return (
    <>
      <Section title="Object">
        <PropRow label="Type">
          <span className="text-studio-text text-xs font-mono">{obj.type}</span>
        </PropRow>
        <PropRow label="Name">
          <input
            className="prop-input flex-1"
            value={obj.name}
            onChange={(e) => updateObject(obj.id, { name: e.target.value } as never)}
          />
        </PropRow>
        <PropRow label="Stitches">
          <span className="text-studio-text text-xs font-mono">
            {obj.stitches?.length.toLocaleString() ?? '–'}
          </span>
        </PropRow>
      </Section>

      <Section title="Stitch">
        <PropRow label="Angle">
          <NumInput
            value={obj.stitchAngle}
            onChange={(v) => updateObject(obj.id, { stitchAngle: v } as never)}
            min={0} max={180} step={1} unit="°"
          />
        </PropRow>
        <PropRow label="Density">
          <NumInput
            value={obj.density}
            onChange={(v) => updateObject(obj.id, { density: v } as never)}
            min={0.1} max={2} step={0.05} unit="mm"
          />
        </PropRow>
        <PropRow label="Length">
          <NumInput
            value={obj.stitchLength}
            onChange={(v) => updateObject(obj.id, { stitchLength: v } as never)}
            min={0.5} max={12} step={0.1} unit="mm"
          />
        </PropRow>
        <PropRow label="Pull comp.">
          <NumInput
            value={obj.pullCompensation}
            onChange={(v) => updateObject(obj.id, { pullCompensation: v } as never)}
            min={0} max={2} step={0.05} unit="mm"
          />
        </PropRow>
      </Section>

      <Section title="Color">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {THREAD_PALETTE.map((c) => (
            <ThreadSwatch
              key={c.id}
              color={c}
              active={obj.color.id === c.id}
              onClick={() => updateObject(obj.id, { color: c } as never)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div
            style={{
              width: 28, height: 28, background: obj.color.hex,
              borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          />
          <div>
            <div className="text-studio-text text-xs font-medium">{obj.color.name}</div>
            <div className="text-studio-muted text-xs font-mono">{obj.color.hex.toUpperCase()}</div>
          </div>
        </div>
      </Section>

      <Section title="Underlay">
        <PropRow label="Type">
          <select
            className="prop-input flex-1"
            value={obj.underlay.type}
            onChange={(e) => updateObject(obj.id, {
              underlay: { ...obj.underlay, type: e.target.value as never }
            } as never)}
          >
            <option value="none">None</option>
            <option value="center-run">Center Run</option>
            <option value="zig-zag">Zig-Zag</option>
            <option value="edge-run">Edge Run</option>
            <option value="double-edge">Double Edge</option>
          </select>
        </PropRow>
      </Section>

      <Section title="Options">
        <div className="flex items-center justify-between mb-2">
          <span className="prop-label">Tie-in</span>
          <input
            type="checkbox" checked={obj.tieIn}
            onChange={(e) => updateObject(obj.id, { tieIn: e.target.checked } as never)}
            className="accent-studio-accent"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="prop-label">Tie-off</span>
          <input
            type="checkbox" checked={obj.tieOff}
            onChange={(e) => updateObject(obj.id, { tieOff: e.target.checked } as never)}
            className="accent-studio-accent"
          />
        </div>
      </Section>
    </>
  )
}

// ── Thread palette panel ───────────────────────────────────────────────────────

function ThreadPanel() {
  const { activeColor, setActiveColor } = useEmbroideryStore()
  return (
    <Section title="Thread Palette">
      <div className="flex flex-wrap gap-1.5 mt-1">
        {THREAD_PALETTE.map((c) => (
          <ThreadSwatch
            key={c.id}
            color={c}
            active={activeColor.id === c.id}
            onClick={() => setActiveColor(c)}
          />
        ))}
      </div>
    </Section>
  )
}

// ── Canvas settings ────────────────────────────────────────────────────────────

function CanvasPanel() {
  const { fabricColor, setFabricColor, gridSpacing } = useCanvasStore()
  return (
    <Section title="Canvas">
      <PropRow label="Fabric">
        <input
          type="color"
          value={fabricColor}
          onChange={(e) => setFabricColor(e.target.value)}
          className="h-7 w-full rounded cursor-pointer"
          style={{ background: 'transparent', border: '1px solid #332f2a', padding: '2px' }}
        />
      </PropRow>
      <PropRow label="Grid">
        <span className="text-studio-text text-xs font-mono">{gridSpacing} mm</span>
      </PropRow>
    </Section>
  )
}

// ── Objects list ───────────────────────────────────────────────────────────────

function ObjectsList() {
  const { objects, selectedIds, selectObject, removeObject } = useEmbroideryStore()

  return (
    <Section title={`Objects (${objects.length})`}>
      {objects.length === 0 && (
        <div className="text-studio-faint text-xs text-center py-3">No objects yet</div>
      )}
      {[...objects].reverse().map((obj) => (
        <div
          key={obj.id}
          onClick={() => selectObject(obj.id)}
          className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer"
          style={{
            background: selectedIds.includes(obj.id) ? '#2e2a26' : 'transparent',
            marginBottom: 1,
          }}
        >
          <div
            style={{
              width: 10, height: 10, borderRadius: 2,
              background: obj.color.hex, flexShrink: 0,
            }}
          />
          <span className="text-studio-text text-xs flex-1 truncate">{obj.name}</span>
          <span className="text-studio-muted text-xs font-mono">
            {obj.stitches?.length ?? 0}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeObject(obj.id) }}
            className="text-studio-faint hover:text-red-400 text-xs ml-1"
            title="Delete"
          >
            ×
          </button>
        </div>
      ))}
    </Section>
  )
}

// ── Main inspector ─────────────────────────────────────────────────────────────

export default function RightInspector() {
  return (
    <div
      className="flex flex-col overflow-y-auto flex-shrink-0"
      style={{
        width: 220,
        background: '#1a1714',
        borderLeft: '1px solid #2e2a26',
        zIndex: 5,
      }}
    >
      <ObjectInspector />
      <div className="divider" />
      <ThreadPanel />
      <div className="divider" />
      <ObjectsList />
      <div className="divider" />
      <CanvasPanel />
    </div>
  )
}
