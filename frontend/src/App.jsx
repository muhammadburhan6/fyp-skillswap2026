import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { applyThemeForRoute } from './lib/theme'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AmbientBackground from './components/ui/AmbientBackground'
import Landing from './pages/Landing'
import ExploreFeatures from './pages/ExploreFeatures'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import Messenger from './pages/Messenger'
import Calendar from './pages/Calendar'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import Materials from './pages/Materials'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import SkillAI from './pages/SkillAI'

function AuthLoader({ children }) {
  const loadUser = useAuthStore((s) => s.loadUser)
  useEffect(() => { loadUser() }, [loadUser])
  return children
}

// Applies the saved light/dark theme on app pages, forces dark on public pages.
function ThemeManager() {
  const location = useLocation()
  useEffect(() => { applyThemeForRoute(location.pathname) }, [location.pathname])
  return null
}

export default function App() {
  return (
    <ErrorBoundary fallback={
      <div className="auth-shell flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Something went wrong. <a href="/" className="text-accent underline underline-offset-4">Reload</a></p>
      </div>
    }>
      <AmbientBackground />
      <AuthLoader>
        <BrowserRouter>
          <ThemeManager />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<ExploreFeatures />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/admin/:section?" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="/skill-ai" element={<ProtectedRoute><SkillAI /></ProtectedRoute>} />
            {/* legacy redirects */}
            <Route path="/matches" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
            <Route path="/exchange" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthLoader>
    </ErrorBoundary>
  )
}
