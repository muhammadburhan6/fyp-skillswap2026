import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Auth from '../Auth'
import { useAuthStore } from '../../store/useAuthStore'

describe('Auth page', () => {
  beforeEach(() => {
    useAuthStore.setState({
      login: vi.fn().mockResolvedValue({ onboarding_complete: true }),
      register: vi.fn().mockResolvedValue({ onboarding_complete: false }),
    })
  })

  it('renders the login form by default', () => {
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Auth />
      </MemoryRouter>,
    )
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('calls login with the entered credentials', async () => {
    const login = vi.fn().mockResolvedValue({ onboarding_complete: true })
    useAuthStore.setState({ login })

    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Auth />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    const submit = screen
      .getAllByRole('button', { name: 'Log in' })
      .find((b) => b.getAttribute('type') === 'submit')
    await userEvent.click(submit)

    expect(login).toHaveBeenCalledWith('user@example.com', 'secret123')
  })
})
