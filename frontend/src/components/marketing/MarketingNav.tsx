import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ProfileDropdown'

const NAV_LINKS = [
  { label: 'Features',     to: '/features' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Pricing',      to: '/pricing' },
]

export default function MarketingNav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const { user, loading, signOut } = useAuthStore()
  const isLoggedIn = !!user && !loading

  const active = (to: string) => location.pathname === to

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,242,237,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(26,23,20,0.08)',
        padding: '0 40px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#1a1714' }}>
            <span style={{ fontFamily: 'Georgia, serif' }}>Stitch</span>
            <span style={{ fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active(to) ? 500 : 400,
                color: active(to) ? '#1a1714' : '#6b6560',
                textDecoration: 'none',
                background: active(to) ? 'rgba(26,23,20,0.06)' : 'transparent',
                letterSpacing: '-0.01em',
                transition: 'color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => {
                if (!active(to)) {
                  e.currentTarget.style.color = '#1a1714'
                  e.currentTarget.style.background = 'rgba(26,23,20,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!active(to)) {
                  e.currentTarget.style.color = '#6b6560'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side — auth-aware */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading ? (
            /* Prevent layout shift while session hydrates */
            <div style={{ width: 120, height: 32 }} />
          ) : isLoggedIn ? (
            /* ── Logged-in state ───────────────────────────────────────────── */
            <>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(26,23,20,0.16)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  color: '#1a1714', letterSpacing: '-0.01em',
                  transition: 'background 0.12s',
                  }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Dashboard
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={30} />
              </div>
            </>
          ) : (
            /* ── Logged-out state ──────────────────────────────────────────── */
            <>
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(26,23,20,0.16)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  color: '#1a1714', letterSpacing: '-0.01em',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >Log in</button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  background: '#2d6a4f', border: '1px solid #2d6a4f',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: '#fff', letterSpacing: '-0.01em',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#245c43')}
                onMouseLeave={e => (e.currentTarget.style.background = '#2d6a4f')}
              >Start free</button>
            </>
          )}

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: '#1a1714', fontSize: 20,
            }}
            className="mobile-burger"
            aria-label="Menu"
          >☰</button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(245,242,237,0.97)',
          display: 'flex', flexDirection: 'column',
          padding: '80px 32px 32px',
          gap: 8,
          fontFamily: '"Inter", system-ui, sans-serif',
        }}>
          <button onClick={() => setOpen(false)} style={{
            position: 'absolute', top: 16, right: 24,
            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#1a1714',
          }}>×</button>
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} style={{
              fontSize: 24, fontWeight: 600, color: '#1a1714', textDecoration: 'none',
              letterSpacing: '-0.02em', padding: '8px 0',
            }}>{label}</Link>
          ))}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLoggedIn ? (
              <>
                <button onClick={() => { navigate('/dashboard'); setOpen(false) }} style={{ padding: '13px', borderRadius: 10, border: 'none', background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Go to Dashboard</button>
                <button onClick={() => { signOut(); setOpen(false) }} style={{ padding: '13px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.2)', fontSize: 15, background: 'transparent', cursor: 'pointer', color: '#6b6560' }}>Sign out</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate('/login'); setOpen(false) }} style={{ padding: '13px', borderRadius: 10, border: '1px solid rgba(26,23,20,0.2)', fontSize: 15, background: 'transparent', cursor: 'pointer' }}>Log in</button>
                <button onClick={() => { navigate('/register'); setOpen(false) }} style={{ padding: '13px', borderRadius: 10, border: 'none', background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Start free</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
