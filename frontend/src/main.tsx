import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { useAuthStore }  from './store/authStore'
import ProtectedRoute    from './components/ProtectedRoute'
import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import DashboardPage     from './pages/DashboardPage'
import EditorPage        from './pages/EditorPage'
import FeaturesPage      from './pages/FeaturesPage'
import HowItWorksPage    from './pages/HowItWorksPage'
import PricingPage       from './pages/PricingPage'

function Root() {
  const { init } = useAuthStore()

  // Initialise auth once on mount — resolves session from Supabase cookie/storage
  useEffect(() => { init() }, [init])

  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<LandingPage />} />
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/register"      element={<RegisterPage />} />
      <Route path="/features"      element={<FeaturesPage />} />
      <Route path="/how-it-works"  element={<HowItWorksPage />} />
      <Route path="/pricing"       element={<PricingPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/editor/:projectId" element={
        <ProtectedRoute><EditorPage /></ProtectedRoute>
      } />

      {/* Legacy — direct editor access without a project (dev convenience) */}
      <Route path="/editor" element={<EditorPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
