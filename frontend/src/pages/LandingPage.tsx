import React from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingNav    from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'

// ── Shared primitives ──────────────────────────────────────────────────────────

const GreenText = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#2d6a4f' }}>{children}</span>
)

// ── Embroidery visualisation SVG (hero mockup) ────────────────────────────────

function EmbroideryMockup() {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      background: '#1a1714',
      border: '1px solid #2e2a26',
      boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
      aspectRatio: '16/10',
      width: '100%',
    }}>
      {/* Top bar */}
      <div style={{
        height: 36,
        background: '#141210',
        borderBottom: '1px solid #2e2a26',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c940' }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#4a4540', fontFamily: 'monospace' }}>StitchLab — untitled.stl</span>
        <div style={{ flex: 1 }} />
      </div>
      {/* Editor body */}
      <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
        {/* Left toolbar stub */}
        <div style={{
          width: 44,
          background: '#1a1714',
          borderRight: '1px solid #2e2a26',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 8,
        }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 6,
              background: i === 0 ? '#2d6a4f22' : 'transparent',
              border: i === 0 ? '1px solid #2d6a4f' : '1px solid transparent',
            }} />
          ))}
        </div>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#232019', overflow: 'hidden' }}>
          {/* Fabric hoop */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <radialGradient id="fabric" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#e8e0d0" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#e8e0d0" stopOpacity="0.04" />
              </radialGradient>
            </defs>
            {/* Hoop circle */}
            <ellipse cx="50%" cy="52%" rx="34%" ry="38%" fill="url(#fabric)" stroke="#3a3630" strokeWidth="1.5" />
            {/* Satin fill shape */}
            <g transform="translate(28%,22%)">
              {[...Array(28)].map((_, i) => (
                <line
                  key={i}
                  x1={i * 5.5} y1={20 + Math.sin(i * 0.4) * 8}
                  x2={i * 5.5 + 2} y2={60 + Math.sin(i * 0.4 + 1) * 8}
                  stroke="#40916c" strokeWidth="1.2" strokeLinecap="round" opacity="0.85"
                />
              ))}
              {/* Run stitch outline */}
              {[...Array(16)].map((_, i) => (
                <circle
                  key={i}
                  cx={i * 10 + Math.sin(i) * 3}
                  cy={85 + Math.cos(i * 0.7) * 6}
                  r="1.2"
                  fill="#d4a853"
                  opacity="0.9"
                />
              ))}
            </g>
            {/* Tatami fill block */}
            <g transform="translate(50%,35%)">
              {[...Array(12)].map((_, row) =>
                [...Array(18)].map((_, col) => (
                  <line
                    key={`${row}-${col}`}
                    x1={col * 6 + (row % 2) * 3} y1={row * 5}
                    x2={col * 6 + (row % 2) * 3 + 5} y2={row * 5}
                    stroke="#c9b28a" strokeWidth="1" opacity="0.6"
                  />
                ))
              )}
            </g>
            {/* Node handles hint */}
            <circle cx="38%" cy="48%" r="3" fill="none" stroke="#2d6a4f" strokeWidth="1.5" />
            <circle cx="44%" cy="42%" r="3" fill="none" stroke="#2d6a4f" strokeWidth="1.5" />
            <line x1="38%" y1="48%" x2="44%" y2="42%" stroke="#2d6a4f" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
          </svg>
        </div>
        {/* Right panel stub */}
        <div style={{
          width: 200,
          background: '#1a1714',
          borderLeft: '1px solid #2e2a26',
          padding: 12,
        }}>
          {[
            { label: 'Satin Fill', color: '#40916c', stitches: '1 842' },
            { label: 'Run Stitch', color: '#d4a853', stitches: '312' },
            { label: 'Tatami Fill', color: '#c9b28a', stitches: '2 104' },
          ].map((item, i) => (
            <div key={i} style={{
              marginBottom: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: i === 0 ? '#2d6a4f18' : 'transparent',
              border: `1px solid ${i === 0 ? '#2d6a4f' : '#2e2a26'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: '#e7e3dc' }}>{item.label}</div>
                <div style={{ fontSize: 9, color: '#4a4540', fontFamily: 'monospace' }}>{item.stitches} sts</div>
              </div>
            </div>
          ))}
          {/* Property rows */}
          <div style={{ marginTop: 16, borderTop: '1px solid #2e2a26', paddingTop: 12 }}>
            {['Density', 'Angle', 'Length'].map(p => (
              <div key={p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#4a4540' }}>{p}</span>
                <span style={{ fontSize: 10, color: '#e7e3dc', fontFamily: 'monospace' }}>
                  {p === 'Density' ? '0.42 mm' : p === 'Angle' ? '45°' : '3.5 mm'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature cards ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '✦',
    title: 'Realistic Stitch Rendering',
    desc: 'Per-stitch simulation with accurate satin, tatami, and run-stitch rendering at any zoom level.',
  },
  {
    icon: '⬡',
    title: 'Professional Vector Editing',
    desc: 'Bézier node editing, pen tool, direct selection — everything you expect from design software.',
  },
  {
    icon: 'Aa',
    title: 'Embroidery Lettering',
    desc: 'Load any TTF/OTF font, type text, and generate filled embroidery stitches per glyph automatically.',
  },
  {
    icon: '⬤',
    title: 'Satin & Fill Tools',
    desc: 'Satin columns, satin fill, tatami fill — with configurable density, angle, and pull compensation.',
  },
  {
    icon: '↗',
    title: 'DST / PES Export',
    desc: 'Export production-ready embroidery files in DST and PES formats for any commercial machine.',
  },
  {
    icon: '☁',
    title: 'Cloud Projects',
    desc: 'Your designs sync automatically. Access, continue, and share your work from anywhere.',
  },
]

// ── How it works ───────────────────────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Create a project', desc: 'Start from a blank canvas or open an existing design. Your hoop, thread palette, and layers are set up instantly.' },
  { n: '02', title: 'Digitize your design', desc: 'Draw shapes, import artwork, add text, and apply stitch types. The canvas renders every stitch in real time.' },
  { n: '03', title: 'Refine & preview', desc: 'Adjust density, angle, underlay, and pull compensation. Inspect every stitch before you export.' },
  { n: '04', title: 'Export & stitch', desc: 'Download production-ready DST or PES files. Load them on your machine and stitch.' },
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f2ed',
      color: '#1a1714',
      fontFamily: '"Inter", system-ui, sans-serif',
      overflowX: 'hidden',
    }}>
      <MarketingNav />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1140,
        margin: '0 auto',
        padding: '96px 40px 64px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 100,
          background: '#2d6a4f18',
          border: '1px solid #2d6a4f44',
          fontSize: 12,
          fontWeight: 500,
          color: '#2d6a4f',
          letterSpacing: '0.02em',
          marginBottom: 28,
        }}>
          Professional embroidery digitizing software
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: '#1a1714',
          marginBottom: 20,
        }}>
          Modern digitizing<br />
          built for <GreenText>creators</GreenText>
        </h1>

        <p style={{
          fontSize: 18,
          lineHeight: 1.65,
          color: '#6b6560',
          maxWidth: 520,
          margin: '0 auto 40px',
          letterSpacing: '-0.01em',
        }}>
          Satin fills, run stitches, Bézier node editing, embroidery lettering,
          and DST/PES export — in a single, fast, browser-based editor.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 72 }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '13px 28px', borderRadius: 10,
              background: '#2d6a4f',
              border: 'none', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
              color: '#fff', letterSpacing: '-0.01em',
              boxShadow: '0 4px 16px rgba(45,106,79,0.4)',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,106,79,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,106,79,0.4)' }}
          >
            Start designing free →
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '13px 28px', borderRadius: 10,
              background: 'rgba(26,23,20,0.06)',
              border: '1px solid rgba(26,23,20,0.14)',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              color: '#1a1714', letterSpacing: '-0.01em',
            }}
          >
            Log in
          </button>
        </div>

        {/* Editor mockup */}
        <EmbroideryMockup />

        <p style={{ marginTop: 16, fontSize: 12, color: '#9c9590', letterSpacing: '0.01em' }}>
          No install required · Runs in your browser · Export to any embroidery machine
        </p>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section style={{
        background: '#fff',
        borderTop: '1px solid rgba(26,23,20,0.07)',
        borderBottom: '1px solid rgba(26,23,20,0.07)',
        padding: '96px 40px',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 12 }}>
              Everything a digitizer needs
            </h2>
            <p style={{ fontSize: 16, color: '#6b6560', letterSpacing: '-0.01em' }}>
              Professional tools in a modern interface — no plugins, no installs.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '28px 28px 24px',
                borderRadius: 14,
                background: '#f8f6f3',
                border: '1px solid rgba(26,23,20,0.07)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.07)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '' }}
              >
                <div style={{
                  width: 40, height: 40,
                  background: '#2d6a4f14',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, marginBottom: 16,
                  color: '#2d6a4f',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.02em', color: '#1a1714', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b6560', letterSpacing: '-0.005em' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 40px', background: '#f5f2ed' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 12 }}>
              From artwork to machine in minutes
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6a4f', letterSpacing: '0.08em', marginBottom: 12 }}>
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 5, left: 28, right: -32,
                    height: 1, background: 'rgba(45,106,79,0.2)',
                    display: window.innerWidth < 640 ? 'none' : 'block',
                  }} />
                )}
                <h3 style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', color: '#1a1714', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: '#6b6560' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{
        background: '#1a1714',
        padding: '96px 40px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#f5f2ed',
            marginBottom: 16,
            lineHeight: 1.1,
          }}>
            Start digitizing today
          </h2>
          <p style={{ fontSize: 16, color: '#8c857c', lineHeight: 1.65, marginBottom: 36, letterSpacing: '-0.01em' }}>
            No credit card required. Start with a free account
            and open the editor in seconds.
          </p>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '14px 32px', borderRadius: 10,
              background: '#2d6a4f',
              border: 'none', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
              color: '#fff', letterSpacing: '-0.01em',
              boxShadow: '0 4px 24px rgba(45,106,79,0.5)',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            Create free account →
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
