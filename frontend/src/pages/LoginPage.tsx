import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate   = useNavigate()
  const { signIn } = useAuthStore()

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
