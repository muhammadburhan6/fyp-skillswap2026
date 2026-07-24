import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState(currentUser?.name || '')
  const [teach, setTeach] = useState('Python, React')
  const [learn, setLearn] = useState('UI Design, Video Editing')
  const [bio, setBio] = useState(currentUser?.bio || '')
  const [availability, setAvailability] = useState(currentUser?.availability || 'flexible')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await api.onboarding({
        display_name: name.trim(),
        bio,
        availability,
        skills_teach: teach.split(',').map((s) => s.trim()).filter(Boolean),
        skills_learn: learn.split(',').map((s) => s.trim()).filter(Boolean),
      })
      setUser(user)
      const pending = sessionStorage.getItem('skillswap_next')
      if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
        sessionStorage.removeItem('skillswap_next')
        navigate(pending, { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not save profile. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <SkillSwapLogo size="sm" />
            <span className="text-2xl font-semibold tracking-tight">Skillswap</span>
          </Link>
        </div>
        <form onSubmit={submit} className="card space-y-5 p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Set up your profile</h1>
          <p className="text-mutedForeground">Tell us about your skills to get matched. You only need to do this once.</p>
          <input className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          <textarea className="input-field" placeholder="Short bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
          <input className="input-field" placeholder="Skills I can teach (comma separated)" value={teach} onChange={(e) => setTeach(e.target.value)} />
          <input className="input-field" placeholder="Skills I want to learn (comma separated)" value={learn} onChange={(e) => setLearn(e.target.value)} />
          <select className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="flexible">Flexible availability</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekends">Weekends only</option>
          </select>
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Saving…' : 'Complete setup →'}
          </button>
        </form>
      </div>
    </div>
  )
}
