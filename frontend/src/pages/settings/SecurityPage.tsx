import React, { useState } from 'react'
import SettingsLayout, { SettingsSection, SettingsRow, Toggle, SaveButton } from './SettingsLayout'

const SESSIONS = [
  { id: 1, device: 'MacBook Pro', browser: 'Chrome 124', location: 'Copenhagen, DK', lastActive: 'Now', current: true },
  { id: 2, device: 'iPhone 15',   browser: 'Safari 17',  location: 'Copenhagen, DK', lastActive: '2 hours ago', current: false },
  { id: 3, device: 'Windows PC',  browser: 'Firefox 125',location: 'Aarhus, DK',     lastActive: '3 days ago',  current: false },
]

function DeviceIcon({ type }: { type: string }) {
  if (type.toLowerCase().includes('iphone') || type.toLowerCase().includes('ipad')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6560" strokeWidth="1.6" strokeLinecap="round">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <circle cx="12" cy="18" r="1" fill="#6b6560" stroke="none"/>
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6560" strokeWidth="1.6" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 20h8M12 18v2" />
    </svg>
  )
}

export default function SecurityPage() {
  const [twoFactor,     setTwoFactor]     = useState(false)
  const [loginAlerts,   setLoginAlerts]   = useState(true)
  const [sessionAlert,  setSessionAlert]  = useState(false)
  const [sessions,      setSessions]      = useState(SESSIONS)
  const [saved,         setSaved]         = useState(false)

  const revokeSession = (id: number) => {
    setSessions(s => s.filter(sess => sess.id !== id))
  }

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SettingsLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 24 }}>Security</h1>

      {/* Two-factor authentication */}
      <SettingsSection title="Two-factor authentication" description="Add an extra layer of security to your account.">
        <SettingsRow label="Enable 2FA" description="Require a verification code when signing in.">
          <Toggle value={twoFactor} onChange={setTwoFactor} />
        </SettingsRow>
        {twoFactor && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: '#fffbeb', border: '1px solid #fde68a',
            fontSize: 13, color: '#92400e', lineHeight: 1.5,
          }}>
            <strong>Setup required.</strong> To finish enabling 2FA, scan the QR code in an authenticator app like Google Authenticator or Authy.
            <br />
            <button style={{
              marginTop: 10, padding: '7px 14px', borderRadius: 7,
              background: '#92400e', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Set up authenticator app
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Login notifications */}
      <SettingsSection title="Login notifications" description="Get alerted when your account is accessed.">
        <SettingsRow label="Email on new sign-in" description="Receive an email when a new device signs in to your account.">
          <Toggle value={loginAlerts} onChange={setLoginAlerts} />
        </SettingsRow>
        <SettingsRow label="Notify on new session">
          <Toggle value={sessionAlert} onChange={setSessionAlert} />
        </SettingsRow>
      </SettingsSection>

      {/* Active sessions */}
      <SettingsSection title="Active sessions" description="Devices currently signed in to your account.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sessions.map((sess, i) => (
            <div key={sess.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: i < sessions.length - 1 ? '1px solid rgba(26,23,20,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: '#f5f2ed', border: '1px solid rgba(26,23,20,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <DeviceIcon type={sess.device} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1714' }}>{sess.device}</span>
                    {sess.current && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 100,
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac',
                      }}>This device</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#9c9590' }}>
                    {sess.browser} · {sess.location} · {sess.lastActive}
                  </div>
                </div>
              </div>
              {!sess.current && (
                <button
                  onClick={() => revokeSession(sess.id)}
                  style={{
                    padding: '6px 13px', borderRadius: 7,
                    background: 'transparent', border: '1px solid rgba(220,38,38,0.3)',
                    color: '#dc2626', fontSize: 12, cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {sessions.filter(s => !s.current).length > 0 && (
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(26,23,20,0.05)', marginTop: 4 }}>
            <button
              onClick={() => setSessions(s => s.filter(sess => sess.current))}
              style={{
                padding: '7px 14px', borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(220,38,38,0.3)',
                color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Revoke all other sessions
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Login history */}
      <SettingsSection title="Recent sign-ins" description="The last few times your account was accessed.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { date: 'Today, 09:14',     location: 'Copenhagen, DK', device: 'Chrome on macOS', ok: true },
            { date: 'Yesterday, 20:51', location: 'Copenhagen, DK', device: 'Safari on iOS',   ok: true },
            { date: 'May 8, 14:03',     location: 'Aarhus, DK',     device: 'Firefox on Windows', ok: true },
            { date: 'May 6, 11:22',     location: 'Copenhagen, DK', device: 'Chrome on macOS', ok: true },
          ].map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid rgba(26,23,20,0.05)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#1a1714', fontWeight: 500 }}>{entry.date}</div>
                <div style={{ fontSize: 12, color: '#9c9590' }}>{entry.device} · {entry.location}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                background: entry.ok ? '#f0fdf4' : '#fef2f2',
                color: entry.ok ? '#16a34a' : '#dc2626',
                border: `1px solid ${entry.ok ? '#86efac' : '#fecaca'}`,
              }}>
                {entry.ok ? 'Success' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton loading={false} saved={saved} onClick={save} />
      </div>
    </SettingsLayout>
  )
}
