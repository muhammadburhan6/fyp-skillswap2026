import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    availability: user?.availability || 'flexible',
  })
  const [saved, setSaved] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const { user: updated } = await api.updateMe(form)
    setUser(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell title="Profile" subtitle="Manage your public profile and availability">
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-white">Edit profile</h2>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="input-field" rows={3} placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <select className="input-field" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
            <option value="flexible">Flexible</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
          </select>
          <button type="submit" className="btn-primary">Save changes</button>
          {saved && <p className="text-sm text-sky-300">Saved!</p>}
        </form>
        <div className="card">
          <h2 className="font-semibold text-white">Public profile preview</h2>
          <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-2xl font-bold text-sky-200">
            {user?.name?.[0]}
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{user?.name}</p>
          <p className="text-sm text-slate-400">{user?.bio || 'No bio yet'}</p>
          <p className="mt-3 text-sm text-slate-300"><strong className="text-white">Teaches:</strong> {user?.skills_teach?.join(', ') || '—'}</p>
          <p className="text-sm text-slate-300"><strong className="text-white">Learning:</strong> {user?.skills_learn?.join(', ') || '—'}</p>
        </div>
      </div>
    </AppShell>
  )
}
