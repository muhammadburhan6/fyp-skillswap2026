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

    skills_teach: user?.skills_teach?.join(', ') || '',

    skills_learn: user?.skills_learn?.join(', ') || '',

  })

  const [saved, setSaved] = useState(false)

  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)



  const save = async (e) => {

    e.preventDefault()

    setError('')

    setLoading(true)

    try {

      const { user: updated } = await api.updateMe({

        name: form.name.trim(),

        bio: form.bio,

        availability: form.availability,

        skills_teach: form.skills_teach.split(',').map((s) => s.trim()).filter(Boolean),

        skills_learn: form.skills_learn.split(',').map((s) => s.trim()).filter(Boolean),

      })

      setUser(updated)

      setForm({

        name: updated.name || '',

        bio: updated.bio || '',

        availability: updated.availability || 'flexible',

        skills_teach: updated.skills_teach?.join(', ') || '',

        skills_learn: updated.skills_learn?.join(', ') || '',

      })

      setSaved(true)

      setTimeout(() => setSaved(false), 2000)

    } catch (err) {

      setError(err.response?.data?.error || err.message || 'Could not save profile.')

    } finally {

      setLoading(false)

    }

  }



  return (

    <AppShell title="Profile" subtitle="Manage your public profile and availability">

      <div className="grid gap-8 lg:grid-cols-2">

        <form onSubmit={save} className="card space-y-6">

          <h2 className="font-display text-xl font-semibold text-foreground">Edit profile</h2>

          {[

            { id: 'name', label: 'Name', el: <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /> },

            { id: 'bio', label: 'Bio', el: <textarea className="input-field" rows={3} placeholder="Tell others about yourself" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /> },

            { id: 'teach', label: 'Skills I teach', el: <input className="input-field" placeholder="e.g. Python, React" value={form.skills_teach} onChange={(e) => setForm({ ...form, skills_teach: e.target.value })} /> },

            { id: 'learn', label: 'Skills I want to learn', el: <input className="input-field" placeholder="e.g. UI Design, Spanish" value={form.skills_learn} onChange={(e) => setForm({ ...form, skills_learn: e.target.value })} /> },

          ].map(({ id, label, el }) => (

            <div key={id}>

              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mutedForeground">{label}</label>

              {el}

            </div>

          ))}

          <div>

            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-mutedForeground">Availability</label>

            <select className="input-field" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>

              <option value="flexible">Flexible</option>

              <option value="weekdays">Weekdays</option>

              <option value="weekends">Weekends</option>

            </select>

          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">{loading ? 'Saving…' : 'Save changes →'}</button>

          {saved && <p className="font-mono text-xs uppercase tracking-widest text-accent">Saved</p>}

        </form>

        <div className="card">

          <h2 className="font-display text-xl font-semibold text-foreground">Public preview</h2>

          <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-display text-2xl text-accent">

            {user?.name?.[0]}

          </div>

          <p className="mt-4 font-display text-2xl text-foreground">{user?.name}</p>

          <p className="mt-2 text-sm text-mutedForeground">{user?.bio || 'No bio yet'}</p>

          <p className="mt-6 text-sm text-foreground"><span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Teaches</span> — {user?.skills_teach?.join(', ') || '—'}</p>

          <p className="mt-2 text-sm text-foreground"><span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Learning</span> — {user?.skills_learn?.join(', ') || '—'}</p>

        </div>

      </div>

    </AppShell>

  )

}


