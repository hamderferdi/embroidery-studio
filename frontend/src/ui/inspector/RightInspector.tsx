import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { useCanvasStore, PX_PER_MM } from '../../store/canvasStore'
import { THREAD_PALETTE, type ThreadColor, type LetteringObject } from '../../embroidery/types'
import { BUILTIN_FONTS, FontManager } from '../../embroidery/text/FontManager'
import { layoutText } from '../../embroidery/text/TextLayout'

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
        onKeyDown={(e) => e.stopPropagation()}
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

// ── Lettering inspector ────────────────────────────────────────────────────────

const DEBOUNCE_MS = 450

function LetteringInspector({ obj }: { obj: LetteringObject }) {
  const { updateObject } = useEmbroideryStore()

  // Local draft state — edits live here until applied
  const [text,       setText]       = useState(obj.text)
  const [fontFamily, setFontFamily] = useState(obj.fontFamily)
  const [fontSizeMm, setFontSizeMm] = useState(obj.fontSizeMm)
  const [tracking,   setTracking]   = useState(obj.tracking)
  const [alignment,  setAlignment]  = useState(obj.alignment)
  const [loading,    setLoading]    = useState(false)
  const [dirty,      setDirty]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Sync local state when the selected object changes from outside (undo/redo etc.)
  useEffect(() => {
    setText(obj.text)
    setFontFamily(obj.fontFamily)
    setFontSizeMm(obj.fontSizeMm)
    setTracking(obj.tracking)
    setAlignment(obj.alignment)
    setDirty(false)
    setError(null)
  }, [obj.id])  // only reset when the selected object itself changes

  // ── Apply: load font → layout → update object ─────────────────────────────
  const apply = useCallback(async (
    t = text, ff = fontFamily, sz = fontSizeMm,
    tr = tracking, al = alignment,
  ) => {
    if (!t.trim()) {
      // Empty text: just update metadata, no boundaries
      updateObject(obj.id, { text: t, fontFamily: ff, fontSizeMm: sz, tracking: tr, alignment: al, letterBoundaries: [] } as never)
      setDirty(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const font      = await FontManager.load(ff)
      const sizePx    = FontManager.fontSizePxForMm(ff, sz, PX_PER_MM)
      const layout    = layoutText(
        t, font,
        { fontSizePx: sizePx, trackingPx: tr * PX_PER_MM, alignment: al, lineHeightMultiplier: 1.3 },
        obj.x, obj.y,
      )
      const boundaries = layout.chars.map(lc => lc.contours)
      updateObject(obj.id, {
        text: t, fontFamily: ff, fontSizeMm: sz, tracking: tr, alignment: al,
        letterBoundaries: boundaries,
      } as never)
      setDirty(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[TEXT] Apply failed:', msg)
      setError(`Font failed to load. Check your network connection and try again.`)
    } finally {
      setLoading(false)
    }
  }, [obj.id, obj.x, obj.y, text, fontFamily, fontSizeMm, tracking, alignment, updateObject])

  // Debounce: auto-apply after typing stops (font/size/tracking controls fire immediately via apply())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleApply = useCallback((t: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => apply(t), DEBOUNCE_MS)
  }, [apply])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  return (
    <>
      {/* ── Text content ─────────────────────────────────────────── */}
      <Section title="Lettering">
        <div className="panel-section" style={{ paddingTop: 0 }}>
          <textarea
            value={text}
            placeholder="Type your text here…"
            rows={3}
            onChange={(e) => {
              setText(e.target.value)
              setDirty(true)
              scheduleApply(e.target.value)
            }}
            onKeyDown={(e) => {
              // Prevent ALL canvas hotkeys while this field is focused
              e.stopPropagation()
            }}
            style={{
              width: '100%',
              background: '#111',
              color: '#e8e4de',
              border: '1px solid #3a3630',
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 12,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => apply()}
            disabled={loading}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '5px 0',
              background: dirty ? '#40916c' : '#2a2724',
              color: dirty ? '#fff' : '#888',
              border: `1px solid ${dirty ? '#40916c' : '#3a3630'}`,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              letterSpacing: '0.05em',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Generating…' : dirty ? '▶  Apply' : '✓  Up to date'}
          </button>

          {error && (
            <div style={{
              marginTop: 6,
              padding: '5px 8px',
              background: '#2d1a1a',
              border: '1px solid #7f1d1d',
              borderRadius: 4,
              color: '#fca5a5',
              fontSize: 11,
              lineHeight: 1.4,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* ── Typography controls ─────────────────────────────────── */}
        <PropRow label="Font">
          <select
            className="prop-input flex-1"
            value={fontFamily}
            disabled={loading}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              setFontFamily(e.target.value)
              setDirty(true)
              apply(text, e.target.value, fontSizeMm, tracking, alignment)
            }}
          >
            {BUILTIN_FONTS.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </PropRow>

        <PropRow label="Size">
          <NumInput
            value={fontSizeMm} min={2} max={100} step={0.5} unit="mm"
            onChange={(v) => {
              setFontSizeMm(v)
              setDirty(true)
              apply(text, fontFamily, v, tracking, alignment)
            }}
          />
        </PropRow>

        <PropRow label="Tracking">
          <NumInput
            value={tracking} min={-5} max={20} step={0.1} unit="mm"
            onChange={(v) => {
              setTracking(v)
              setDirty(true)
              apply(text, fontFamily, fontSizeMm, v, alignment)
            }}
          />
        </PropRow>

        <PropRow label="Align">
          <div className="flex gap-1 flex-1">
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                title={a}
                onClick={() => {
                  setAlignment(a)
                  setDirty(true)
                  apply(text, fontFamily, fontSizeMm, tracking, a)
                }}
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '3px 0',
                  borderRadius: 3,
                  border: '1px solid',
                  cursor: 'pointer',
                  background: alignment === a ? '#40916c22' : 'transparent',
                  borderColor: alignment === a ? '#40916c' : '#3a3630',
                  color: alignment === a ? '#40916c' : '#888',
                }}
              >
                {a === 'left' ? '⬤ ·' : a === 'center' ? '· ⬤ ·' : '· ⬤'}
              </button>
            ))}
          </div>
        </PropRow>

        <PropRow label="Stitches">
          <span className="text-studio-text text-xs font-mono">
            {obj.stitches?.length.toLocaleString() ?? '–'}
          </span>
        </PropRow>
      </Section>

      {/* ── Stitch quality ─────────────────────────────────────────── */}
      <Section title="Stitch">
        <PropRow label="Density">
          <NumInput
            value={obj.density}
            onChange={(v) => updateObject(obj.id, { density: v } as never)}
            min={0.1} max={2} step={0.05} unit="mm"
          />
        </PropRow>
      </Section>

      {/* ── Thread color ───────────────────────────────────────────── */}
      <Section title="Color">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {THREAD_PALETTE.map((c) => (
            <ThreadSwatch
              key={c.id} color={c} active={obj.color.id === c.id}
              onClick={() => updateObject(obj.id, { color: c } as never)}
            />
          ))}
        </div>
      </Section>
    </>
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

  // Lettering gets its own inspector
  if (obj.type === 'lettering') {
    return (
      <>
        <Section title="Object">
          <PropRow label="Name">
            <input
              className="prop-input flex-1"
              value={obj.name}
              onChange={(e) => updateObject(obj.id, { name: e.target.value } as never)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </PropRow>
        </Section>
        <LetteringInspector obj={obj as LetteringObject} />
      </>
    )
  }

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
            onKeyDown={(e) => e.stopPropagation()}
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
            onKeyDown={(e) => e.stopPropagation()}
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
