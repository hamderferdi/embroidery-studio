import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate   = useNavigate()
  const { signIn, signInWithGoogle } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your StitchLab account"
      footer={<>No account? <Link to="/register" style={{ color: '#2d6a4f', textDecoration: 'none', fontWeight: 500 }}>Create one free</Link></>}
    >
      <GoogleButton onClick={signInWithGoogle} />
      <Divider />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Email">
          <input
            type="email" value={email} required autoFocus
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </Field>
        <Field label="Password">
          <input
            type="password" value={password} required
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
    </AuthLayout>
  )
}

// ── Shared auth UI primitives ──────────────────────────────────────────────────

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string; subtitle: string
  children: React.ReactNode; footer?: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f2ed',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <path d="M10 2.5 L17.5 9 V17.5 H13 V13 H7 V17.5 H2.5 V9 Z" fill="#2d6a4f" opacity="0.9" />
        </svg>
        <span style={{ fontSize: 17, fontWeight: 600 }}>
          <span style={{ fontFamily: 'Georgia, serif' }}>Stitch</span>
          <span style={{ fontFamily: 'Palatino, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
        </span>
      </button>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid rgba(26,23,20,0.09)',
        padding: '36px 36px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 4 }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#6b6560', marginBottom: 28, letterSpacing: '-0.01em' }}>{subtitle}</p>
        {children}
        {footer && (
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b6560' }}>{footer}</p>
        )}
      </div>
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 8,
  border: '1px solid rgba(26,23,20,0.16)',
  fontSize: 14,
  color: '#1a1714',
  background: '#fafaf9',
  outline: 'none',
  letterSpacing: '-0.01em',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#4a4540', marginBottom: 6, letterSpacing: '-0.01em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '9px 13px',
      borderRadius: 8,
      background: '#fef2f2',
      border: '1px solid #fecaca',
      fontSize: 13,
      color: '#991b1b',
      letterSpacing: '-0.01em',
    }}>
      {children}
    </div>
  )
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '11px',
        borderRadius: 9,
        background: loading ? '#6b9e8a' : '#2d6a4f',
        border: 'none',
        fontSize: 14,
        fontWeight: 600,
        color: '#fff',
        cursor: loading ? 'wait' : 'pointer',
        letterSpacing: '-0.01em',
        transition: 'background 0.15s',
        marginTop: 4,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '11px 13px',
        borderRadius: 9,
        background: '#fff',
        border: '1px solid rgba(26,23,20,0.18)',
        fontSize: 14,
        fontWeight: 500,
        color: '#1a1714',
        cursor: 'pointer',
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'background 0.12s, box-shadow 0.12s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#fafaf9'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#fff'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {/* Google G logo */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  )
}

export function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
      <span style={{ fontSize: 12, color: '#9c9590', letterSpacing: '0.02em' }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
    </div>
  )
}
