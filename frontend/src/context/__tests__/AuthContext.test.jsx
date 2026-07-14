import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'

vi.mock('../../services/api', () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}))

vi.mock('../../lib/authToken', () => ({
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}))

import { api } from '../../services/api'
import { setToken, clearToken } from '../../lib/authToken'

function Harness() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <p data-testid="user">{user ? user.email : 'anon'}</p>
      <button type="button" onClick={() => login('a@b.com', 'pw')}>login</button>
      <button type="button" onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores the JWT and user on login', async () => {
    api.login.mockResolvedValue({ user: { email: 'a@b.com' }, token: 'jwt.token.value' })
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )
    expect(screen.getByTestId('user')).toHaveTextContent('anon')

    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'))
    expect(setToken).toHaveBeenCalledWith('jwt.token.value')
  })

  it('clears the token on logout', async () => {
    api.login.mockResolvedValue({ user: { email: 'a@b.com' }, token: 'jwt.token.value' })
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'))

    await userEvent.click(screen.getByText('logout'))
    expect(clearToken).toHaveBeenCalled()
    expect(screen.getByTestId('user')).toHaveTextContent('anon')
  })
})
