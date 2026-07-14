import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Settings() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    skills_teach: user?.skills_teach?.join(', ') || '',
    skills_learn: user?.skills_learn?.join(', ') || '',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    const { user: updated } = await api.updateMe({
      name: form.name,
      skills_teach: form.skills_teach.split(',').map((s) => s.trim()).filter(Boolean),
      skills_learn: form.skills_learn.split(',').map((s) => s.trim()).filter(Boolean),
    })
    setUser(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell title="Settings" subtitle="Update your profile and preferences">
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={handleSave} className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Edit profile</h2>
          <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field" placeholder="Skills to teach" value={form.skills_teach} onChange={(e) => setForm({ ...form, skills_teach: e.target.value })} />
          <input className="input-field" placeholder="Skills to learn" value={form.skills_learn} onChange={(e) => setForm({ ...form, skills_learn: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Save changes</button>
          {saved && <p className="text-sm text-sky-300">Saved!</p>}
        </form>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Account</h2>
          <p className="text-sm text-slate-400">Email</p>
          <p className="mt-1 text-white">{user?.email}</p>
          <p className="mt-6 text-sm text-slate-400">Skill points</p>
          <p className="mt-1 text-3xl font-bold text-sky-300">{user?.points_balance ?? 0} SP</p>
        </div>
      </div>
    </AppShell>
  )
}
