import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState('')
  const [teach, setTeach] = useState('Python, React')
  const [learn, setLearn] = useState('UI Design, Video Editing')
  const [bio, setBio] = useState('')
  const [availability, setAvailability] = useState('flexible')

  const submit = async (e) => {
    e.preventDefault()
    const { user } = await api.onboarding({
      display_name: name,
      bio,
      availability,
      skills_teach: teach.split(',').map((s) => s.trim()).filter(Boolean),
      skills_learn: learn.split(',').map((s) => s.trim()).filter(Boolean),
    })
    setUser(user)
    navigate('/dashboard')
  }

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">Set up your profile</h1>
        <p className="text-sm text-slate-400">Tell us about your skills to get matched</p>
        <input className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <textarea className="input-field" placeholder="Short bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
        <input className="input-field" placeholder="Skills I can teach" value={teach} onChange={(e) => setTeach(e.target.value)} />
        <input className="input-field" placeholder="Skills I want to learn" value={learn} onChange={(e) => setLearn(e.target.value)} />
        <select className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="flexible">Flexible availability</option>
          <option value="weekdays">Weekdays only</option>
          <option value="weekends">Weekends only</option>
        </select>
        <button type="submit" className="btn-primary w-full">Complete setup →</button>
      </form>
    </div>
  )
}
