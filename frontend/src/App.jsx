import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
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
import Settings from './pages/Settings'
import Admin from './pages/Admin'

function AuthLoader({ children }) {
  const loadUser = useAuthStore((s) => s.loadUser)
  useEffect(() => { loadUser() }, [loadUser])
  return children
}

export default function App() {
  return (
    <ErrorBoundary fallback={
      <div className="auth-shell flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-white">Something went wrong. <a href="/" className="text-sky-400 underline">Reload</a></p>
      </div>
    }>
      <AuthLoader>
        <BrowserRouter>
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
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
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
