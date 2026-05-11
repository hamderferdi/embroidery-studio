import React from 'react'
import { Link } from 'react-router-dom'

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features',     to: '/features' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Pricing',      to: '/pricing' },
      { label: 'Changelog',    to: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '#' },
      { label: 'Tutorials',     to: '#' },
      { label: 'Machine guide', to: '#' },
      { label: 'Blog',          to: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',   to: '#' },
      { label: 'Contact', to: '#' },
      { label: 'Privacy', to: '#' },
      { label: 'Terms',   to: '#' },
    ],
  },
]

export default function MarketingFooter() {
  return (
    <footer style={{
      background: '#141210',
      borderTop: '1px solid #2e2a26',
      padding: '64px 40px 40px',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        {/* Top row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr repeat(3, auto)',
          gap: 48,
          marginBottom: 56,
          flexWrap: 'wrap',
        }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 14 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.5 L17.5 9 V17.5 H13 V13 H7 V17.5 H2.5 V9 Z" fill="#2d6a4f" opacity="0.75" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                <span style={{ fontFamily: 'Georgia, serif', color: '#8c857c' }}>Stitch</span>
                <span style={{ fontFamily: 'Palatino, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
              </span>
            </Link>
            <p style={{ fontSize: 13, color: '#4a4540', lineHeight: 1.65, maxWidth: 240, letterSpacing: '-0.01em' }}>
              Professional embroidery digitizing software for modern creators.
            </p>
          </div>
          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4a4540', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <Link key={l.label} to={l.to} style={{ fontSize: 13, color: '#6b6560', textDecoration: 'none', letterSpacing: '-0.01em', transition: 'color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e7e3dc')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6b6560')}
                  >{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #2e2a26',
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <p style={{ fontSize: 12, color: '#4a4540' }}>
            © {new Date().getFullYear()} StitchLab. All rights reserved.
          </p>
          <p style={{ fontSize: 12, color: '#4a4540' }}>
            Professional embroidery digitizing.
          </p>
        </div>
      </div>
    </footer>
  )
}
