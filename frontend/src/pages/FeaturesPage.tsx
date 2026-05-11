import React from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingNav    from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'

// ── Inline SVG illustrations ───────────────────────────────────────────────────

function StitchPreviewSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 420 260" style={{ background: '#1a1714', borderRadius: 12 }}>
      <defs>
        <radialGradient id="fp-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#40916c" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#40916c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="420" height="260" fill="#1a1714" />
      <ellipse cx="210" cy="130" rx="140" ry="100" fill="url(#fp-glow)" />
      {/* Satin stitches */}
      {[...Array(36)].map((_, i) => (
        <line key={`s${i}`}
          x1={90 + i * 6.5} y1={80 + Math.sin(i * 0.35) * 18}
          x2={92 + i * 6.5} y2={155 + Math.sin(i * 0.35 + 1.2) * 18}
          stroke="#40916c" strokeWidth="1.4" strokeLinecap="round" opacity={0.7 + Math.sin(i) * 0.25}
        />
      ))}
      {/* Run stitch dots */}
      {[...Array(22)].map((_, i) => (
        <circle key={`r${i}`}
          cx={90 + i * 11 + Math.sin(i * 0.7) * 3}
          cy={180 + Math.cos(i * 0.5) * 7}
          r="2" fill="#d4a853" opacity="0.9"
        />
      ))}
      {/* Label */}
      <text x="210" y="230" textAnchor="middle" fontSize="10" fill="#4a4540" fontFamily="monospace">
        satin fill · run stitch · 2 154 stitches
      </text>
    </svg>
  )
}

function NodeEditSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 420 260" style={{ background: '#1e1b18', borderRadius: 12 }}>
      {/* Bezier curve */}
      <path d="M 60 180 C 120 60 300 60 360 180" fill="none" stroke="#40916c" strokeWidth="2" opacity="0.8" />
      {/* Control handles */}
      <line x1="60" y1="180" x2="120" y2="60" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="360" y1="180" x2="300" y2="60" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="4 3" />
      {/* Anchor points */}
      <rect x="53" y="173" width="14" height="14" rx="3" fill="#1e1b18" stroke="#40916c" strokeWidth="1.5" />
      <rect x="353" y="173" width="14" height="14" rx="3" fill="#1e1b18" stroke="#40916c" strokeWidth="1.5" />
      {/* Handle circles */}
      <circle cx="120" cy="60" r="5" fill="#2d6a4f" />
      <circle cx="300" cy="60" r="5" fill="#2d6a4f" />
      {/* Selected node highlight */}
      <rect x="53" y="173" width="14" height="14" rx="3" fill="#40916c" opacity="0.3" />
      {/* Grid dots */}
      {[...Array(8)].map((_, r) => [...Array(12)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={30 + c * 34} cy={20 + r * 34} r="1" fill="#2e2a26" />
      )))}
      <text x="210" y="235" textAnchor="middle" fontSize="10" fill="#4a4540" fontFamily="monospace">
        Bézier node editing · direct select
      </text>
    </svg>
  )
}

function LetteringSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 420 260" style={{ background: '#141210', borderRadius: 12 }}>
      {/* Glyph outline */}
      <path d="M 100 180 L 130 80 L 160 180 M 110 145 L 150 145" fill="none" stroke="#40916c" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
      {/* Satin fill inside letter */}
      {[...Array(18)].map((_, i) => (
        <line key={i}
          x1={103 + i * 3.2} y1={85 + i * 0.8}
          x2={103 + i * 3.2} y2={175 - i * 0.3}
          stroke="#40916c" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"
        />
      ))}
      {/* Second letter */}
      <path d="M 185 80 L 185 180 M 185 80 C 240 80 245 130 185 130 M 185 130 C 250 130 255 180 185 180"
        fill="none" stroke="#40916c" strokeWidth="1.5" opacity="0.5" />
      {[...Array(16)].map((_, i) => (
        <line key={`b${i}`}
          x1={188 + i * 3.4} y1={83 + i * 0.5}
          x2={188 + i * 3.4} y2={125}
          stroke="#40916c" strokeWidth="1.3" strokeLinecap="round" opacity="0.75"
        />
      ))}
      {/* Font label */}
      <text x="335" y="95" textAnchor="middle" fontSize="9" fill="#4a4540" fontFamily="monospace">Montserrat</text>
      <text x="335" y="108" textAnchor="middle" fontSize="9" fill="#4a4540" fontFamily="monospace">14mm · 45°</text>
      <rect x="290" y="83" width="90" height="32" rx="5" fill="none" stroke="#2e2a26" strokeWidth="1" />
      <text x="210" y="235" textAnchor="middle" fontSize="10" fill="#4a4540" fontFamily="monospace">
        TTF/OTF lettering engine · auto satin fill
      </text>
    </svg>
  )
}

function ExportSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 420 260" style={{ background: '#1a1714', borderRadius: 12 }}>
      {/* File icons */}
      {[
        { x: 80,  label: 'DST', color: '#40916c' },
        { x: 200, label: 'PES', color: '#d4a853' },
        { x: 320, label: 'JEF', color: '#8c857c' },
      ].map(({ x, label, color }) => (
        <g key={label} transform={`translate(${x}, 70)`}>
          <rect x="-28" y="0" width="56" height="72" rx="6" fill="#232019" stroke={color} strokeWidth="1.2" opacity="0.8" />
          <path d={`M 14 0 L 28 14 L 14 14 Z`} fill={color} opacity="0.4" />
          <text x="0" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="monospace">{label}</text>
          <text x="0" y="60" textAnchor="middle" fontSize="8" fill="#4a4540" fontFamily="monospace">export</text>
        </g>
      ))}
      {/* Arrow down */}
      <text x="210" y="185" textAnchor="middle" fontSize="22" fill="#2d6a4f" opacity="0.7">↓</text>
      {/* Machine icon */}
      <rect x="170" y="195" width="80" height="36" rx="8" fill="#232019" stroke="#3a3630" strokeWidth="1" />
      <text x="210" y="217" textAnchor="middle" fontSize="10" fill="#6b6560" fontFamily="monospace">embroidery machine</text>
      <text x="210" y="245" textAnchor="middle" fontSize="10" fill="#4a4540" fontFamily="monospace">
        DST · PES · JEF · VP3 export
      </text>
    </svg>
  )
}

function CloudSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 420 260" style={{ background: '#1e1b18', borderRadius: 12 }}>
      {/* Cloud shape */}
      <path d="M 140 160 Q 100 160 100 130 Q 100 105 125 105 Q 128 80 160 80 Q 185 60 215 75 Q 235 55 265 70 Q 300 60 310 90 Q 335 90 335 115 Q 335 140 305 140 Z"
        fill="#232019" stroke="#3a3630" strokeWidth="1.5" />
      {/* Upload arrow */}
      <line x1="210" y1="165" x2="210" y2="105" stroke="#40916c" strokeWidth="2" strokeLinecap="round" />
      <polyline points="195,118 210,103 225,118" fill="none" stroke="#40916c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Devices */}
      {[
        { x: 75, y: 195, w: 50, h: 32, label: 'desktop' },
        { x: 195, y: 195, w: 30, h: 40, label: 'mobile' },
        { x: 315, y: 195, w: 60, h: 40, label: 'tablet' },
      ].map(d => (
        <g key={d.label}>
          <rect x={d.x - d.w / 2} y={d.y} width={d.w} height={d.h} rx="4" fill="#232019" stroke="#3a3630" strokeWidth="1" />
          <text x={d.x} y={d.y + d.h + 12} textAnchor="middle" fontSize="8" fill="#4a4540" fontFamily="monospace">{d.label}</text>
        </g>
      ))}
      <text x="210" y="253" textAnchor="middle" fontSize="10" fill="#4a4540" fontFamily="monospace">
        autosave · sync · project library
      </text>
    </svg>
  )
}

// ── Page sections data ─────────────────────────────────────────────────────────

const FEATURE_GROUPS = [
  {
    tag: 'Rendering Engine',
    headline: 'Every stitch, rendered with precision',
    body: 'The viewport renders each stitch individually using GPU-accelerated PixiJS. Satin stitches show accurate thread direction, fill stitches tessellate across complex shapes, and run stitches trace any path at any density. What you see is what your machine will sew.',
    extra: [
      { title: 'Satin fill',    desc: 'Scanline algorithm generates parallel stitches at configurable angle and density.' },
      { title: 'Tatami fill',   desc: 'Brick-pattern fill for large areas — adjustable stagger and row offset.' },
      { title: 'Run stitch',    desc: 'Path-following stitches for outlines, underlay, and details.' },
      { title: 'Satin column',  desc: 'Two-rail satin for borders, letters, and narrow shapes.' },
    ],
    visual: <StitchPreviewSVG />,
    flip: false,
  },
  {
    tag: 'Vector Editing',
    headline: 'Professional node editing, built in',
    body: 'A full Bézier editing suite — pen tool, node editor, direct select — gives you the same control as Illustrator or Figma, applied directly to embroidery geometry. Edit anchor points, manipulate handles, and see stitch changes in real time.',
    extra: [
      { title: 'Pen tool',        desc: 'Click and drag to place anchors and handles. Close paths with a single click.' },
      { title: 'Node editor',     desc: 'Move, add, delete, and convert anchor points on any shape.' },
      { title: 'Direct select',   desc: 'Click through to any node across all objects.' },
      { title: 'Stitch angle',    desc: 'Per-object stitch angle control with live canvas preview.' },
    ],
    visual: <NodeEditSVG />,
    flip: true,
  },
  {
    tag: 'Lettering Engine',
    headline: 'Type. Generate. Stitch.',
    body: 'Load any TTF or OTF font from an 8-font built-in library or your own files. Type your text in the inspector panel, hit Apply, and the engine automatically converts each glyph into filled embroidery stitches — satin fill per letter, with a run-stitch outline fallback.',
    extra: [
      { title: 'Font loading',    desc: 'opentype.js parses TTF/OTF — full glyph outline fidelity.' },
      { title: 'Auto satin',      desc: 'Each glyph boundary is satin-filled at the correct angle.' },
      { title: 'Size control',    desc: 'Font size in mm, tracking, and text alignment controls.' },
      { title: 'Live preview',    desc: 'Glyph outlines appear instantly; stitches generate on Apply.' },
    ],
    visual: <LetteringSVG />,
    flip: false,
  },
  {
    tag: 'Export & Compatibility',
    headline: 'Export to any embroidery machine',
    body: 'Generate production-ready machine files via the FastAPI backend. DST and PES are supported today, with JEF and VP3 on the roadmap. All stitch coordinates are converted from world-space pixels to machine units automatically.',
    extra: [
      { title: 'DST export',   desc: 'Tajima DST — the universal machine format.' },
      { title: 'PES export',   desc: 'Brother PES format for home and semi-commercial machines.' },
      { title: 'Stitch count', desc: 'Live stitch counter in the toolbar as you design.' },
      { title: 'Hoop sizes',   desc: '130×180 through 360×360 mm — pick your hoop, design to fit.' },
    ],
    visual: <ExportSVG />,
    flip: true,
  },
  {
    tag: 'Cloud Workflow',
    headline: 'Your projects, everywhere',
    body: 'Every project is saved to Supabase cloud storage automatically. Open your designs on any device, pick up where you left off, and never lose work — autosave runs every 60 seconds in the background.',
    extra: [
      { title: 'Autosave',        desc: 'Silent background save every 60 seconds.' },
      { title: 'Project library', desc: 'Dashboard view with thumbnails, timestamps, and search.' },
      { title: 'Starred projects',desc: 'Pin important designs to the top of your library.' },
      { title: 'Offline fallback',desc: 'localStorage fallback when Supabase is unavailable.' },
    ],
    visual: <CloudSVG />,
    flip: false,
  },
]

// ── Shared primitives ──────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-block',
      padding: '3px 12px', borderRadius: 100,
      background: '#2d6a4f14', border: '1px solid #2d6a4f33',
      fontSize: 11, fontWeight: 600, color: '#2d6a4f',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 18,
    }}>{children}</div>
  )
}

function CtaBanner({ navigate }: { navigate: (to: string) => void }) {
  return (
    <section style={{ background: '#1a1714', padding: '96px 40px', textAlign: 'center' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f2ed', marginBottom: 14, lineHeight: 1.1 }}>
          See every feature in action
        </h2>
        <p style={{ fontSize: 16, color: '#8c857c', lineHeight: 1.65, marginBottom: 32 }}>
          The best way to understand the editor is to use it. Start free — no install, no card.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            padding: '13px 28px', borderRadius: 10, background: '#2d6a4f',
            border: 'none', fontSize: 15, fontWeight: 600, color: '#fff',
            cursor: 'pointer', letterSpacing: '-0.01em',
            boxShadow: '0 4px 20px rgba(45,106,79,0.45)',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
          Open the editor free →
        </button>
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ed', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden' }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '88px 40px 72px', textAlign: 'center' }}>
        <Tag>Features</Tag>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 18, lineHeight: 1.06 }}>
          Built for serious<br />embroidery work
        </h1>
        <p style={{ fontSize: 18, color: '#6b6560', maxWidth: 560, margin: '0 auto', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          Every tool in StitchLab was designed for precision digitizing — not converted from generic design software.
        </p>
      </section>

      {/* Feature groups */}
      {FEATURE_GROUPS.map((group, gi) => (
        <section
          key={gi}
          style={{
            background: gi % 2 === 0 ? '#fff' : '#f5f2ed',
            borderTop: '1px solid rgba(26,23,20,0.07)',
            padding: '88px 40px',
          }}
        >
          <div style={{
            maxWidth: 1140, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 72,
            alignItems: 'center',
            direction: group.flip ? 'rtl' : 'ltr',
          }}>
            {/* Text column */}
            <div style={{ direction: 'ltr' }}>
              <Tag>{group.tag}</Tag>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 16, lineHeight: 1.15 }}>
                {group.headline}
              </h2>
              <p style={{ fontSize: 16, color: '#6b6560', lineHeight: 1.7, letterSpacing: '-0.01em', marginBottom: 32 }}>
                {group.body}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {group.extra.map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1714', letterSpacing: '-0.02em', marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b6560', lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Visual column */}
            <div style={{
              direction: 'ltr',
              borderRadius: 14,
              overflow: 'hidden',
              aspectRatio: '420/260',
              border: '1px solid rgba(26,23,20,0.09)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.1)',
            }}>
              {group.visual}
            </div>
          </div>
        </section>
      ))}

      {/* Specs strip */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(26,23,20,0.07)', padding: '64px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 48 }}>
            Under the hood
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1, background: 'rgba(26,23,20,0.08)', border: '1px solid rgba(26,23,20,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { stat: 'PixiJS 7',   label: 'GPU-accelerated renderer' },
              { stat: 'opentype.js',label: 'Font parsing engine' },
              { stat: 'Zustand',    label: 'State management' },
              { stat: 'FastAPI',    label: 'Export backend' },
              { stat: 'Supabase',   label: 'Auth & cloud storage' },
              { stat: 'React 18',   label: 'UI framework' },
              { stat: 'Vite 5',     label: 'Build tooling' },
              { stat: 'TypeScript', label: 'End-to-end type safety' },
            ].map(({ stat, label }) => (
              <div key={stat} style={{ padding: '24px 20px', background: '#fafaf9', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1714', letterSpacing: '-0.02em', marginBottom: 4 }}>{stat}</div>
                <div style={{ fontSize: 12, color: '#6b6560' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner navigate={navigate} />
      <MarketingFooter />
    </div>
  )
}
