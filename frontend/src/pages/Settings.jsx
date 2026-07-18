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

  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)



  const handleSave = async (e) => {

    e.preventDefault()

    setError('')

    setLoading(true)

    try {

      const { user: updated } = await api.updateMe({

        name: form.name,

        skills_teach: form.skills_teach.split(',').map((s) => s.trim()).filter(Boolean),

        skills_learn: form.skills_learn.split(',').map((s) => s.trim()).filter(Boolean),

      })

      setUser(updated)

      setForm({

        name: updated.name || '',

        skills_teach: updated.skills_teach?.join(', ') || '',

        skills_learn: updated.skills_learn?.join(', ') || '',

      })

      setSaved(true)

      setTimeout(() => setSaved(false), 2000)

    } catch (err) {

      setError(err.response?.data?.error || err.message || 'Could not save settings.')

    } finally {

      setLoading(false)

    }

  }



  return (

    <AppShell title="Settings" subtitle="Update your profile and preferences">

      <div className="grid gap-8 lg:grid-cols-2">

        <form onSubmit={handleSave} className="card space-y-6">

          <h2 className="font-display text-xl font-semibold text-foreground">Edit profile</h2>

          <div>

            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mutedForeground">Name</label>

            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          </div>

          <div>

            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mutedForeground">Skills I teach</label>

            <input className="input-field" value={form.skills_teach} onChange={(e) => setForm({ ...form, skills_teach: e.target.value })} />

          </div>

          <div>

            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mutedForeground">Skills I want to learn</label>

            <input className="input-field" value={form.skills_learn} onChange={(e) => setForm({ ...form, skills_learn: e.target.value })} />

          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">{loading ? 'Saving…' : 'Save changes →'}</button>

          {saved && <p className="font-mono text-xs uppercase tracking-widest text-accent">Saved</p>}

        </form>

        <div className="card">

          <h2 className="font-display text-xl font-semibold text-foreground">Account</h2>

          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-mutedForeground">Email</p>

          <p className="mt-1 text-sm text-foreground">{user?.email}</p>

          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-mutedForeground">Skill points</p>

          <p className="mt-1 font-display text-4xl font-bold text-accent">{user?.points_balance ?? 0} SP</p>

        </div>

      </div>

    </AppShell>

  )

}


