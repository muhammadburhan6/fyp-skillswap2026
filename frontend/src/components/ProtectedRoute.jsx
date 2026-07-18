import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '../store/useAuthStore'



export default function ProtectedRoute({ children, adminOnly = false }) {

  const { user, loading } = useAuthStore()

  const location = useLocation()



  if (loading) {

    return (

      <div className="auth-shell flex min-h-screen items-center justify-center text-sm text-mutedForeground">

        <div className="flex items-center gap-3">

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/[0.06] border-t-accent" />

          Loading…

        </div>

      </div>

    )

  }

  if (!user) return <Navigate to="/auth" replace />

  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (!user.onboarding_complete && location.pathname !== '/onboarding') {

    return <Navigate to="/onboarding" replace />

  }

  return children

}


