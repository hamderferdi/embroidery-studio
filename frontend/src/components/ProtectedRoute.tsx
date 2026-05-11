import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Wraps a route that requires authentication.
 * While the session is still being resolved, shows a minimal loading screen.
 * Once resolved, redirects unauthenticated users to /login.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f5f2ed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 20 20" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
            <path d="M10 2.5 L17.5 9 V17.5 H13 V13 H7 V17.5 H2.5 V9 Z" fill="#2d6a4f" opacity="0.7" />
          </svg>
          <p style={{ fontSize: 13, color: '#9c9590' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
