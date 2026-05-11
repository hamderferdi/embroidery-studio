import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingNav    from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'

// ── Step illustrations ─────────────────────────────────────────────────────────

function Step1SVG() {
  // Vector shapes on canvas
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#1e1b18', borderRadius: 10 }}>
      <rect width="380" height="200" fill="#1e1b18" />
      {/* Grid */}
      {[...Array(6)].map((_, r) => [...Array(9)].map((_, c) => (
        <circle key={`${r}-${c}`} cx={30 + c * 40} cy={25 + r * 34} r="1" fill="#2e2a26" />
      )))}
      {/* Bezier shape */}
      <path d="M 80 140 C 80 60 160 60 190 100 C 220 140 300 60 300 140 Z" fill="#2d6a4f22" stroke="#40916c" strokeWidth="1.5" />
      {/* Anchor points */}
      {[[80,140],[190,100],[300,140]].map(([x,y], i) => (
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="2" fill="#1e1b18" stroke="#40916c" strokeWidth="1.5" />
      ))}
      {/* Handles */}
      <line x1="80" y1="140" x2="80" y2="60" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="80" cy="60" r="4" fill="#2d6a4f" />
      <line x1="300" y1="140" x2="300" y2="60" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="300" cy="60" r="4" fill="#2d6a4f" />
      <text x="190" y="185" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">draw vector shapes with the pen tool</text>
    </svg>
  )
}

function Step2SVG() {
  // Shape → stitches transformation
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#141210', borderRadius: 10 }}>
      {/* Before — outline only */}
      <path d="M 40 150 C 40 70 100 70 130 110 C 160 150 170 70 170 150 Z" fill="none" stroke="#3a3630" strokeWidth="1.5" />
      {/* Arrow */}
      <text x="190" y="110" textAnchor="middle" fontSize="18" fill="#2d6a4f">→</text>
      {/* After — filled stitches */}
      {[...Array(20)].map((_, i) => (
        <line key={i}
          x1={210 + i * 6.5} y1={75 + Math.sin(i * 0.4) * 14}
          x2={210 + i * 6.5} y2={148 - Math.sin(i * 0.4) * 8}
          stroke="#40916c" strokeWidth="1.3" strokeLinecap="round" opacity="0.85"
        />
      ))}
      <path d="M 210 150 C 210 70 270 70 300 110 C 330 150 340 70 340 150 Z" fill="none" stroke="#40916c" strokeWidth="1" opacity="0.4" />
      <text x="190" y="185" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">shape boundary → stitch generation</text>
    </svg>
  )
}

function Step3SVG() {
  // Settings panel
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#1a1714', borderRadius: 10 }}>
      {/* Panel bg */}
      <rect x="100" y="20" width="180" height="160" rx="8" fill="#232019" stroke="#2e2a26" strokeWidth="1" />
      {/* Title */}
      <text x="190" y="44" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e7e3dc" fontFamily="monospace">Stitch Settings</text>
      <line x1="112" y1="52" x2="268" y2="52" stroke="#2e2a26" strokeWidth="1" />
      {/* Rows */}
      {[
        { label: 'Density',   value: '0.42 mm', y: 72 },
        { label: 'Angle',     value: '45°',     y: 96 },
        { label: 'Length',    value: '3.5 mm',  y: 120 },
        { label: 'Pull comp', value: '0.1 mm',  y: 144 },
      ].map(({ label, value, y }) => (
        <g key={label}>
          <text x="120" y={y} fontSize="10" fill="#6b6560" fontFamily="monospace">{label}</text>
          <rect x="220" y={y - 12} width="60" height="16" rx="3" fill="#1a1714" stroke="#3a3630" strokeWidth="1" />
          <text x="250" y={y} textAnchor="middle" fontSize="10" fill="#e7e3dc" fontFamily="monospace">{value}</text>
        </g>
      ))}
      {/* Apply button */}
      <rect x="130" y="156" width="120" height="18" rx="4" fill="#2d6a4f" />
      <text x="190" y="168" textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff" fontFamily="monospace">▶  Apply</text>
      <text x="190" y="193" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">adjust density, angle, pull compensation</text>
    </svg>
  )
}

function Step4SVG() {
  // Realistic preview
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#232019', borderRadius: 10 }}>
      <defs>
        <radialGradient id="hoop-grad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#e8e0d0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#e8e0d0" stopOpacity="0.02" />
        </radialGradient>
      </defs>
      {/* Hoop */}
      <ellipse cx="190" cy="100" rx="130" ry="80" fill="url(#hoop-grad)" stroke="#3a3630" strokeWidth="1.5" />
      {/* Dense satin stitches */}
      {[...Array(42)].map((_, i) => (
        <line key={i}
          x1={100 + i * 4.2} y1={65 + Math.sin(i * 0.3) * 16}
          x2={101 + i * 4.2} y2={120 + Math.sin(i * 0.3 + 1) * 16}
          stroke="#40916c" strokeWidth={1 + Math.sin(i * 0.7) * 0.3}
          strokeLinecap="round"
          opacity={0.75 + Math.sin(i * 0.5) * 0.2}
        />
      ))}
      {/* Thread shimmer effect */}
      {[...Array(8)].map((_, i) => (
        <line key={`sh${i}`}
          x1={110 + i * 18} y1={67 + Math.sin(i * 0.4) * 16}
          x2={111 + i * 18} y2={68 + Math.sin(i * 0.4) * 16}
          stroke="#fff" strokeWidth="0.8" opacity="0.3"
        />
      ))}
      <text x="190" y="190" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">GPU-rendered per-stitch preview</text>
    </svg>
  )
}

function Step5SVG() {
  // Export flow
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#1e1b18', borderRadius: 10 }}>
      {/* Download arrow */}
      <line x1="190" y1="30" x2="190" y2="100" stroke="#40916c" strokeWidth="2" strokeLinecap="round" />
      <polyline points="174,86 190,104 206,86" fill="none" stroke="#40916c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* File cards */}
      {[
        { x: 100, label: '.DST', sub: 'Tajima', color: '#40916c' },
        { x: 280, label: '.PES', sub: 'Brother', color: '#d4a853' },
      ].map(({ x, label, sub, color }) => (
        <g key={label}>
          <rect x={x - 40} y="115" width="80" height="54" rx="6" fill="#232019" stroke={color} strokeWidth="1.2" />
          <text x={x} y="142" textAnchor="middle" fontSize="16" fontWeight="700" fill={color} fontFamily="monospace">{label}</text>
          <text x={x} y="158" textAnchor="middle" fontSize="9" fill="#4a4540" fontFamily="monospace">{sub} format</text>
        </g>
      ))}
      <text x="190" y="106" textAnchor="middle" fontSize="9" fill="#4a4540" fontFamily="monospace">choose format</text>
      <text x="190" y="188" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">export production-ready machine files</text>
    </svg>
  )
}

function Step6SVG() {
  // Machine sewing
  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ background: '#141210', borderRadius: 10 }}>
      {/* Machine silhouette (simplified) */}
      <rect x="110" y="50" width="160" height="100" rx="12" fill="#1e1b18" stroke="#2e2a26" strokeWidth="1.5" />
      <rect x="150" y="30" width="80" height="30" rx="6" fill="#232019" stroke="#2e2a26" strokeWidth="1" />
      {/* Needle area */}
      <rect x="178" y="80" width="24" height="50" rx="4" fill="#141210" stroke="#3a3630" strokeWidth="1" />
      {/* Needle */}
      <line x1="190" y1="85" x2="190" y2="128" stroke="#8c857c" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="190" cy="128" r="2" fill="#40916c" />
      {/* Thread lines */}
      <path d="M 190 40 Q 200 60 190 85" fill="none" stroke="#40916c" strokeWidth="1" opacity="0.6" />
      {/* Fabric */}
      <rect x="110" y="148" width="160" height="12" rx="2" fill="#3a2e20" opacity="0.8" />
      {/* Stitches on fabric */}
      {[...Array(12)].map((_, i) => (
        <line key={i} x1={120 + i * 12} y1="148" x2={120 + i * 12 + 10} y2="148" stroke="#40916c" strokeWidth="1.5" opacity="0.7" />
      ))}
      <text x="190" y="185" textAnchor="middle" fontSize="11" fill="#4a4540" fontFamily="monospace">load file · press start · stitch</text>
    </svg>
  )
}

// ── Steps data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Create vector artwork',
    body: 'Use the pen tool or polygon/polyline drawing tools to lay out your design. Place shapes, draw paths, and build your composition — all in world coordinates mapped directly to your hoop dimensions.',
    visual: <Step1SVG />,
    tip: 'Pro tip: Start with your largest fills first, then add outlines and details on top.',
  },
  {
    n: '02',
    title: 'Convert shapes to embroidery',
    body: 'Assign a stitch type to each shape: satin fill for solid areas, run stitch for outlines and paths, satin column for borders. The engine generates all stitch coordinates automatically from your vector geometry.',
    visual: <Step2SVG />,
    tip: 'The scanline algorithm handles complex shapes, concavities, and multi-contour paths.',
  },
  {
    n: '03',
    title: 'Tune stitch settings',
    body: 'Fine-tune density, stitch angle, length, and pull compensation per object in the right inspector. Changes generate new stitches instantly — you see the result before you export.',
    visual: <Step3SVG />,
    tip: 'Pull compensation adds width to counteract fabric distortion under the needle.',
  },
  {
    n: '04',
    title: 'Preview realistic rendering',
    body: 'The PixiJS viewport renders every stitch individually at full resolution. Zoom in to see individual thread angles. Zoom out to see the full design in context. The hoop outline shows exactly what will fit.',
    visual: <Step4SVG />,
    tip: 'Toggle stitch points in the toolbar to see every needle entry and exit.',
  },
  {
    n: '05',
    title: 'Export machine files',
    body: 'Hit Export DST or Export PES in the toolbar. The FastAPI backend converts your stitch coordinates to the target format and returns a download. Load the file onto a USB drive or send it directly to your machine software.',
    visual: <Step5SVG />,
    tip: 'All coordinates are converted from mm to machine units automatically.',
  },
  {
    n: '06',
    title: 'Load and stitch',
    body: 'Transfer the file to your embroidery machine, hoop your fabric, and press start. What you designed in StitchLab is exactly what gets sewn — no guesswork, no surprises.',
    visual: <Step6SVG />,
    tip: 'Always do a test stitch on scrap fabric before production pieces.',
  },
]

// ── Stitch type glossary ───────────────────────────────────────────────────────

const STITCH_TYPES = [
  {
    name: 'Satin Stitch',
    color: '#40916c',
    desc: 'Parallel stitches that run edge-to-edge across a shape. Best for solid fills, letters, and areas up to ~12mm wide.',
    svg: (
      <svg width="80" height="50" viewBox="0 0 80 50">
        {[...Array(12)].map((_, i) => (
          <line key={i} x1={8 + i * 6} y1="5" x2={8 + i * 6} y2="45" stroke="#40916c" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
        ))}
      </svg>
    ),
  },
  {
    name: 'Tatami Fill',
    color: '#6ab0e8',
    desc: 'Brick-pattern rows of stitches. Ideal for large areas where satin would be too long and loose.',
    svg: (
      <svg width="80" height="50" viewBox="0 0 80 50">
        {[...Array(5)].map((_, r) => [...Array(7)].map((_, c) => (
          <line key={`${r}-${c}`}
            x1={5 + c * 11 + (r % 2) * 5.5} y1={5 + r * 9}
            x2={14 + c * 11 + (r % 2) * 5.5} y2={5 + r * 9}
            stroke="#6ab0e8" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"
          />
        )))}
      </svg>
    ),
  },
  {
    name: 'Run Stitch',
    color: '#d4a853',
    desc: 'A single line of stitches that follows a path. Used for outlines, detail work, and underlay stitching.',
    svg: (
      <svg width="80" height="50" viewBox="0 0 80 50">
        {[...Array(10)].map((_, i) => (
          <circle key={i} cx={8 + i * 7 + Math.sin(i * 0.8) * 3} cy={25 + Math.cos(i * 0.6) * 8} r="2.5" fill="#d4a853" opacity="0.9" />
        ))}
        <path d={`M 8 25 ${[...Array(10)].map((_, i) => `L ${8 + i * 7 + Math.sin(i * 0.8) * 3} ${25 + Math.cos(i * 0.6) * 8}`).join(' ')}`}
          fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Satin Column',
    color: '#c9b28a',
    desc: 'Two-rail satin — stitches bridge from one path to another. Used for borders, stems, and narrow curved shapes.',
    svg: (
      <svg width="80" height="50" viewBox="0 0 80 50">
        <path d="M 8 10 Q 40 5 72 15" fill="none" stroke="#c9b28a" strokeWidth="1" opacity="0.5" />
        <path d="M 8 38 Q 40 43 72 35" fill="none" stroke="#c9b28a" strokeWidth="1" opacity="0.5" />
        {[...Array(10)].map((_, i) => {
          const t = i / 9
          const x1 = 8 + t * 64, y1 = 10 + Math.sin(t * Math.PI) * (-5)
          const x2 = 8 + t * 64, y2 = 38 + Math.sin(t * Math.PI) * 5
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9b28a" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
        })}
      </svg>
    ),
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ed', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden' }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '88px 40px 72px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: 100,
          background: '#2d6a4f14', border: '1px solid #2d6a4f33',
          fontSize: 11, fontWeight: 600, color: '#2d6a4f', letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 18,
        }}>How it works</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 18, lineHeight: 1.06 }}>
          From idea to finished<br />embroidery in 6 steps
        </h1>
        <p style={{ fontSize: 18, color: '#6b6560', maxWidth: 520, margin: '0 auto', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          Embroidery digitizing used to require specialist software costing thousands. Here's how StitchLab makes it modern and accessible.
        </p>
      </section>

      {/* Step navigator */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(26,23,20,0.07)', borderBottom: '1px solid rgba(26,23,20,0.07)', padding: '0 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
          {STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              style={{
                flex: '0 0 auto',
                padding: '20px 24px',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeStep === i ? '#2d6a4f' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, color: activeStep === i ? '#2d6a4f' : '#9c9590',
                letterSpacing: '0.04em', fontFamily: 'monospace',
              }}>{step.n}</span>
              <span style={{
                fontSize: 13, fontWeight: activeStep === i ? 500 : 400,
                color: activeStep === i ? '#1a1714' : '#6b6560',
                whiteSpace: 'nowrap', letterSpacing: '-0.01em',
              }}>{step.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Active step detail */}
      <section style={{ padding: '72px 40px', background: '#f5f2ed' }}>
        <div style={{
          maxWidth: 1140, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 64, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6a4f', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'monospace' }}>
              STEP {STEPS[activeStep].n}
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 16, lineHeight: 1.15 }}>
              {STEPS[activeStep].title}
            </h2>
            <p style={{ fontSize: 16, color: '#6b6560', lineHeight: 1.7, letterSpacing: '-0.01em', marginBottom: 24 }}>
              {STEPS[activeStep].body}
            </p>
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#2d6a4f0a', border: '1px solid #2d6a4f22',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2d6a4f' }}>💡 </span>
              <span style={{ fontSize: 13, color: '#4a4540', lineHeight: 1.55 }}>{STEPS[activeStep].tip}</span>
            </div>
            {/* Step nav */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button
                onClick={() => setActiveStep(s => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
                  fontSize: 13, color: '#4a4540', cursor: activeStep === 0 ? 'default' : 'pointer',
                  opacity: activeStep === 0 ? 0.4 : 1,
                }}
              >← Previous</button>
              <button
                onClick={() => setActiveStep(s => Math.min(STEPS.length - 1, s + 1))}
                disabled={activeStep === STEPS.length - 1}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  background: activeStep < STEPS.length - 1 ? '#2d6a4f' : 'transparent',
                  border: '1px solid #2d6a4f',
                  fontSize: 13, fontWeight: 600,
                  color: activeStep < STEPS.length - 1 ? '#fff' : '#4a4540',
                  cursor: activeStep === STEPS.length - 1 ? 'default' : 'pointer',
                  opacity: activeStep === STEPS.length - 1 ? 0.4 : 1,
                }}
              >Next →</button>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(26,23,20,0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
            {STEPS[activeStep].visual}
          </div>
        </div>
      </section>

      {/* Stitch type glossary */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(26,23,20,0.07)', padding: '88px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 12 }}>
              The four stitch types
            </h2>
            <p style={{ fontSize: 16, color: '#6b6560', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Every embroidery design is a combination of these fundamental stitch patterns. Understanding them is the foundation of good digitizing.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {STITCH_TYPES.map((type, i) => (
              <div key={i} style={{
                padding: '28px 24px',
                borderRadius: 14, background: '#fafaf9',
                border: '1px solid rgba(26,23,20,0.07)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.07)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ''; el.style.boxShadow = '' }}
              >
                <div style={{ marginBottom: 16 }}>{type.svg}</div>
                <h3 style={{ fontSize: 15, fontWeight: 650, color: type.color, letterSpacing: '-0.02em', marginBottom: 8 }}>{type.name}</h3>
                <p style={{ fontSize: 13, color: '#6b6560', lineHeight: 1.6 }}>{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full workflow strip */}
      <section style={{ background: '#1a1714', padding: '88px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f2ed', marginBottom: 48 }}>
            The complete workflow
          </h2>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                flex: '1 1 0', minWidth: 140, padding: '20px 16px',
                borderRight: i < STEPS.length - 1 ? '1px solid #2e2a26' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2d6a4f', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'monospace' }}>{step.n}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e7e3dc', letterSpacing: '-0.01em', lineHeight: 1.4 }}>{step.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#f5f2ed', padding: '88px 40px', textAlign: 'center', borderTop: '1px solid rgba(26,23,20,0.07)' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 14, lineHeight: 1.1 }}>
            Ready to try it?
          </h2>
          <p style={{ fontSize: 16, color: '#6b6560', lineHeight: 1.65, marginBottom: 32 }}>
            Open the editor now — no install, no credit card. Your first project takes minutes to set up.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '12px 26px', borderRadius: 10, background: '#2d6a4f',
                border: 'none', fontSize: 15, fontWeight: 600, color: '#fff',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(45,106,79,0.35)',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
            >Start designing free →</button>
            <button
              onClick={() => navigate('/features')}
              style={{
                padding: '12px 26px', borderRadius: 10,
                background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
                fontSize: 15, color: '#1a1714', cursor: 'pointer',
              }}
            >Explore all features</button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
