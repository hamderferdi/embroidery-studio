import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AuthLayout, Field, ErrorBanner, SubmitButton, inputStyle } from './LoginPage'

export default function RegisterPage() {
  const navigate   = useNavigate()
  const { signUp } = useAuthStore()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const err = await signUp(email, password, name)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start digitizing for free — no credit card required"
      footer={<>Already have an account? <Link to="/login" style={{ color: '#2d6a4f', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Display name">
          <input
            type="text" value={name} required autoFocus
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input
            type="email" value={email} required
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </Field>
        <Field label="Password">
          <input
            type="password" value={password} required
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            style={inputStyle}
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password" value={confirm} required
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password"
            style={inputStyle}
          />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <SubmitButton loading={loading}>Create account</SubmitButton>
        <p style={{ fontSize: 11, color: '#9c9590', textAlign: 'center', lineHeight: 1.5 }}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  )
}
