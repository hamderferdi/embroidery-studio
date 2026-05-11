import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import SettingsLayout, {
  SettingsSection, SettingsRow, SettingsInput, SaveButton,
} from './SettingsLayout'

export default function AccountPage() {
  const { user, init } = useAuthStore()

  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? ''
  const email       = user?.email ?? ''
  const avatarUrl   = (user?.user_metadata?.avatar_url as string | undefined) ?? ''
  const provider    = user?.app_metadata?.provider ?? 'email'

  const [name,       setName]       = useState(displayName)
  const [avatar,     setAvatar]     = useState(avatarUrl)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [oldPw,      setOldPw]      = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwSaved,    setPwSaved]    = useState(false)
  const [pwError,    setPwError]    = useState<string | null>(null)

  const saveProfile = async () => {
    setSaving(true); setError(null); setSaved(false)
    const { error: err } = await supabase.auth.updateUser({
      data: { display_name: name, avatar_url: avatar },
    })
    if (err) { setError(err.message) }
    else     { setSaved(true); await init(); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const savePassword = async () => {
    setPwError(null)
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    if (newPw.length < 8)    { setPwError('Password must be at least 8 characters.'); return }
    setPwSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPw })
    if (err) { setPwError(err.message) }
    else     { setPwSaved(true); setOldPw(''); setNewPw(''); setConfirmPw(''); setTimeout(() => setPwSaved(false), 3000) }
    setPwSaving(false)
  }

  return (
    <SettingsLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 24 }}>Account</h1>

      {/* Profile */}
      <SettingsSection title="Profile" description="Your public identity in StitchLab.">
        <SettingsRow label="Display name" description="Shown on your dashboard and projects.">
          <SettingsInput value={name} onChange={setName} placeholder="Your name" />
        </SettingsRow>
        <SettingsRow label="Email address" description="Used to sign in. Contact support to change.">
          <input
            value={email} disabled
            style={{
              padding: '8px 12px', borderRadius: 8, width: 240,
              border: '1px solid rgba(26,23,20,0.1)',
              fontSize: 13, color: '#9c9590', background: '#f5f2ed',
              boxSizing: 'border-box',
            }}
          />
        </SettingsRow>
        <SettingsRow label="Avatar URL" description="Link to a profile image (HTTPS).">
          <SettingsInput value={avatar} onChange={setAvatar} placeholder="https://..." />
        </SettingsRow>
        {error && (
          <div style={{ padding: '9px 13px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: 'none', paddingTop: 4 }}>
          <SaveButton loading={saving} saved={saved} onClick={saveProfile} />
        </div>
      </SettingsSection>

      {/* Password — only show for email accounts */}
      {provider === 'email' && (
        <SettingsSection title="Password" description="Change the password used to sign in.">
          <SettingsRow label="New password">
            <SettingsInput value={newPw} onChange={setNewPw} type="password" placeholder="New password" />
          </SettingsRow>
          <SettingsRow label="Confirm password">
            <SettingsInput value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Repeat new password" />
          </SettingsRow>
          {pwError && (
            <div style={{ padding: '9px 13px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
              {pwError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveButton loading={pwSaving} saved={pwSaved} onClick={savePassword} />
          </div>
        </SettingsSection>
      )}

      {/* Connected accounts */}
      <SettingsSection title="Connected accounts" description="Third-party sign-in methods linked to your account.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1714' }}>Google</div>
              <div style={{ fontSize: 11, color: '#9c9590' }}>{provider === 'google' ? `Connected · ${email}` : 'Not connected'}</div>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
            background: provider === 'google' ? '#f0fdf4' : '#f5f2ed',
            color: provider === 'google' ? '#16a34a' : '#9c9590',
            border: `1px solid ${provider === 'google' ? '#86efac' : 'rgba(26,23,20,0.1)'}`,
          }}>
            {provider === 'google' ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection title="Danger zone">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1714', marginBottom: 3 }}>Delete account</div>
            <div style={{ fontSize: 12, color: '#6b6560' }}>Permanently delete your account and all project data.</div>
          </div>
          <button style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'transparent', border: '1px solid #fecaca',
            color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Delete account
          </button>
        </div>
      </SettingsSection>
    </SettingsLayout>
  )
}
