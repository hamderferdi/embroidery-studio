import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ size = 30 }: { size?: number }) {
  const { user } = useAuthStore()
  const avatarUrl  = user?.user_metadata?.avatar_url as string | undefined
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? 'U'
  const initials   = displayName.slice(0, 2).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
      letterSpacing: '-0.02em', flexShrink: 0,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {initials}
    </div>
  )
}

// ── Menu item ──────────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, sublabel, onClick, danger = false, dividerAbove = false,
}: {
  icon:         string
  label:        string
  sublabel?:    string
  onClick:      () => void
  danger?:      boolean
  dividerAbove?: boolean
}) {
  return (
    <>
      {dividerAbove && <div style={{ height: 1, background: 'rgba(26,23,20,0.07)', margin: '4px 0' }} />}
      <button
        onClick={onClick}
        style={{
          width: '100%', textAlign: 'left',
          padding: '8px 12px', border: 'none',
          background: 'transparent', cursor: 'pointer',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = danger ? '#fef2f2' : '#f5f2ed')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 400,
            color: danger ? '#dc2626' : '#1a1714',
            letterSpacing: '-0.01em', lineHeight: 1.3,
          }}>{label}</div>
          {sublabel && (
            <div style={{ fontSize: 11, color: '#9c9590', marginTop: 1 }}>{sublabel}</div>
          )}
        </div>
      </button>
    </>
  )
}

// ── Dropdown ───────────────────────────────────────────────────────────────────

export default function ProfileDropdown() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const [open,           setOpen]           = useState(false)
  const [showShortcuts,  setShowShortcuts]  = useState(false)
  const [avatarHover,    setAvatarHover]    = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const displayName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split('@')[0] ?? 'User'
  const email = user?.email ?? ''

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const go = (path: string) => { setOpen(false); navigate(path) }

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <>
      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Avatar trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 2, borderRadius: '50%',
            outline: open ? '2px solid #2d6a4f' : avatarHover ? '2px solid rgba(45,106,79,0.4)' : '2px solid transparent',
            transition: 'outline-color 0.15s',
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Account menu"
          aria-expanded={open}
        >
          <Avatar size={30} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 240,
            background: '#fff',
            borderRadius: 12,
            border: '1px solid rgba(26,23,20,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: 500,
            overflow: 'hidden',
            animation: 'dropdownIn 0.12s ease-out',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}>

            {/* User info header */}
            <div style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid rgba(26,23,20,0.07)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Avatar size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: '#1a1714',
                  letterSpacing: '-0.02em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{displayName}</div>
                <div style={{
                  fontSize: 11, color: '#9c9590',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{email}</div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px 6px' }}>
              <MenuItem icon="⊞"  label="Dashboard"         onClick={() => go('/dashboard')} />
              <MenuItem icon="◎"  label="Account"           sublabel="Profile & email"          onClick={() => go('/settings/account')} />
              <MenuItem icon="◈"  label="Preferences"       sublabel="Editor & viewport"        onClick={() => go('/settings/preferences')} />
              <MenuItem icon="◇"  label="Billing"           sublabel="Plan & invoices"          onClick={() => go('/settings/billing')} />
              <MenuItem icon="⌨"  label="Keyboard shortcuts"                                    onClick={() => { setOpen(false); setShowShortcuts(true) }} />
              <MenuItem icon="?"  label="Help & support"    onClick={() => go('#')} dividerAbove />
              <MenuItem icon="↗"  label="Sign out"          onClick={handleSignOut} danger dividerAbove />
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Dropdown animation */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  )
}

// Export Avatar for reuse elsewhere
export { Avatar }
