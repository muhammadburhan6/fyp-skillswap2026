import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import { useAuthStore } from '../../store/useAuthStore'

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false })
  })

  it('redirects unauthenticated users to /auth', () => {
    renderAt('/secret', <ProtectedRoute><div>Secret</div></ProtectedRoute>)
    expect(screen.getByText('Auth Page')).toBeInTheDocument()
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })

  it('renders children for an authenticated, onboarded user', () => {
    useAuthStore.setState({ user: { role: 'user', onboarding_complete: true }, loading: false })
    renderAt('/secret', <ProtectedRoute><div>Secret</div></ProtectedRoute>)
    expect(screen.getByText('Secret')).toBeInTheDocument()
  })

  it('redirects non-admins away from admin-only routes', () => {
    useAuthStore.setState({ user: { role: 'user', onboarding_complete: true }, loading: false })
    renderAt('/secret', <ProtectedRoute adminOnly><div>Admin Secret</div></ProtectedRoute>)
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument()
  })

  it('redirects users who have not completed onboarding', () => {
    useAuthStore.setState({ user: { role: 'user', onboarding_complete: false }, loading: false })
    renderAt('/secret', <ProtectedRoute><div>Secret</div></ProtectedRoute>)
    expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
  })
})
