import React, { useEffect, useState } from 'react'

const SHORTCUTS: { category: string; items: { keys: string[]; label: string }[] }[] = [
  {
    category: 'Tools',
    items: [
      { keys: ['V'],       label: 'Select tool' },
      { keys: ['A'],       label: 'Direct select' },
      { keys: ['P'],       label: 'Pen tool' },
      { keys: ['X'],       label: 'Text tool' },
      { keys: ['H'],       label: 'Pan tool' },
      { keys: ['Z'],       label: 'Zoom in' },
    ],
  },
  {
    category: 'Viewport',
    items: [
      { keys: ['Space', 'Drag'], label: 'Pan canvas' },
      { keys: ['⌘', '+'],        label: 'Zoom in' },
      { keys: ['⌘', '-'],        label: 'Zoom out' },
      { keys: ['⌘', '0'],        label: 'Zoom to fit' },
      { keys: ['⌘', '1'],        label: 'Zoom to 100%' },
      { keys: ['Scroll'],        label: 'Zoom in/out' },
    ],
  },
  {
    category: 'Editing',
    items: [
      { keys: ['⌘', 'Z'],        label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'],   label: 'Redo' },
      { keys: ['⌘', 'C'],        label: 'Copy' },
      { keys: ['⌘', 'V'],        label: 'Paste' },
      { keys: ['⌘', 'D'],        label: 'Duplicate' },
      { keys: ['⌫'],             label: 'Delete selected' },
      { keys: ['Esc'],           label: 'Deselect / cancel' },
    ],
  },
  {
    category: 'Node Editing',
    items: [
      { keys: ['Click'],         label: 'Select node' },
      { keys: ['⌥', 'Click'],    label: 'Delete node' },
      { keys: ['⇧', 'Click'],    label: 'Add to selection' },
      { keys: ['Enter'],         label: 'Commit node edit' },
    ],
  },
  {
    category: 'Pen Tool',
    items: [
      { keys: ['Click'],         label: 'Place anchor' },
      { keys: ['Click', 'Drag'], label: 'Place anchor + handles' },
      { keys: ['Right-click'],   label: 'Finish path' },
      { keys: ['Click start'],   label: 'Close path' },
    ],
  },
  {
    category: 'Drawing',
    items: [
      { keys: ['Click'],         label: 'Place point' },
      { keys: ['Dbl-click'],     label: 'Complete shape' },
      { keys: ['Right-click'],   label: 'Complete shape' },
    ],
  },
]

function Key({ k }: { k: string }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 22, padding: '0 6px',
      borderRadius: 5,
      background: '#f0ede8',
      border: '1px solid rgba(26,23,20,0.15)',
      borderBottom: '2px solid rgba(26,23,20,0.2)',
      fontSize: 11, fontWeight: 600,
      color: '#1a1714',
      fontFamily: '"Inter", system-ui, sans-serif',
      letterSpacing: 0,
    }}>
      {k}
    </kbd>
  )
}

interface Props {
  onClose: () => void
}

export default function KeyboardShortcutsModal({ onClose }: Props) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = SHORTCUTS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      cat.category.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(26,23,20,0.09)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 640,
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '"Inter", system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(26,23,20,0.07)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1714', marginBottom: 2 }}>
              Keyboard shortcuts
            </h2>
            <p style={{ fontSize: 12, color: '#9c9590' }}>StitchLab editor reference</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9c9590', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(26,23,20,0.07)' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shortcuts…"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid rgba(26,23,20,0.14)',
              fontSize: 13, color: '#1a1714', background: '#fafaf9',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Shortcuts list */}
        <div style={{ overflowY: 'auto', padding: '8px 24px 24px' }}>
          {filtered.map(cat => (
            <div key={cat.category} style={{ marginTop: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#9c9590',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>{cat.category}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {cat.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: 7,
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ed')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 13, color: '#4a4540', letterSpacing: '-0.01em' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {item.keys.map((k, ki) => <Key key={ki} k={k} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9c9590', fontSize: 13 }}>
              No shortcuts match "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
