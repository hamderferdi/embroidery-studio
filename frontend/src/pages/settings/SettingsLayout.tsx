import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ProfileDropdown'
import { useAuthStore } from '../../store/authStore'

const NAV = [
  { to: '/settings/account',     icon: '◎', label: 'Account' },
  { to: '/settings/preferences', icon: '◈', label: 'Preferences' },
  { to: '/settings/billing',     icon: '◇', label: 'Billing' },
  { to: '/settings/security',    icon: '⬡', label: 'Security' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const displayName = (user?.user_metadata?.display_name as string | undefined)
    ?? user?.email?.split('@')[0] ?? 'User'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f2ed',
      fontFamily: '"Inter", system-ui, sans-serif',
      color: '#1a1714',
    }}>
      {/* Top bar */}
      <nav style={{
        height: 52,
        background: '#fff',
        borderBottom: '1px solid rgba(26,23,20,0.08)',
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 16,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            color: '#6b6560', fontSize: 13, letterSpacing: '-0.01em',
            padding: '4px 8px', borderRadius: 6,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,23,20,0.05)'; e.currentTarget.style.color = '#1a1714' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6560' }}
        >
          Dashboard
        </button>
        <span style={{ color: 'rgba(26,23,20,0.2)', fontSize: 14 }}>/</span>
        <span style={{ fontSize: 13, color: '#1a1714', fontWeight: 500 }}>Settings</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={28} />
          <span style={{ fontSize: 13, color: '#4a4540' }}>{displayName}</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 28px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <aside style={{ width: 200, flexShrink: 0, position: 'sticky', top: 76 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9590', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 10 }}>
            Settings
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    background: active ? '#2d6a4f14' : 'transparent',
                    color: active ? '#2d6a4f' : '#4a4540',
                    fontSize: 13, fontWeight: active ? 500 : 400,
                    letterSpacing: '-0.01em',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(26,23,20,0.05)'; e.currentTarget.style.color = '#1a1714' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a4540' } }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Shared settings primitives ─────────────────────────────────────────────────

export function SettingsSection({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(26,23,20,0.08)',
      overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(26,23,20,0.06)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 650, letterSpacing: '-0.02em', color: '#1a1714', marginBottom: description ? 4 : 0 }}>
          {title}
        </h2>
        {description && <p style={{ fontSize: 13, color: '#6b6560', lineHeight: 1.5 }}>{description}</p>}
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

export function SettingsRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 24, paddingBottom: 18, marginBottom: 18,
      borderBottom: '1px solid rgba(26,23,20,0.05)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1714', letterSpacing: '-0.01em', marginBottom: description ? 3 : 0 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: '#6b6560', lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

export function SettingsInput({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px', borderRadius: 8, width: 240,
        border: '1px solid rgba(26,23,20,0.16)',
        fontSize: 13, color: '#1a1714', background: '#fafaf9',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => (e.target.style.borderColor = '#2d6a4f')}
      onBlur={e  => (e.target.style.borderColor = 'rgba(26,23,20,0.16)')}
    />
  )
}

export function SettingsSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px', borderRadius: 8, width: 200,
        border: '1px solid rgba(26,23,20,0.16)',
        fontSize: 13, color: '#1a1714', background: '#fafaf9',
        outline: 'none', cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function SaveButton({ loading, saved, onClick }: {
  loading: boolean; saved: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '8px 20px', borderRadius: 8,
        background: saved ? '#f0fdf4' : '#2d6a4f',
        border: `1px solid ${saved ? '#86efac' : '#2d6a4f'}`,
        color: saved ? '#16a34a' : '#fff',
        fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
        letterSpacing: '-0.01em', transition: 'all 0.2s',
      }}
    >
      {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
    </button>
  )
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 100, border: 'none',
        background: value ? '#2d6a4f' : '#d4d0cb',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
        display: 'block',
      }} />
    </button>
  )
}
