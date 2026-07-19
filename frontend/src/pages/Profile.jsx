import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

function TeachingRates({ teachSkills }) {
  const [pricing, setPricing] = useState([])
  const [editSkill, setEditSkill] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    // Build a local map from current user's pricing (fetched via my earnings context)
    // We can use getTeacherPricing by passing current user id — but we don't have it here.
    // Instead, we import useAuthStore.
  }

  useEffect(() => {
    // pricing is loaded by parent via user.id
  }, [])

  const savePrice = async (skill) => {
    const price = parseFloat(editPrice)
    if (!price || price < 1) {
      setError('Minimum price is $1.00')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { pricing: p } = await api.setMyPricing({ skill, price_usd: price })
      setPricing((prev) => {
        const filtered = prev.filter((x) => x.skill !== skill)
        return [...filtered, p]
      })
      setEditSkill(null)
      setEditPrice('')
      setSuccess(`Rate for ${skill} saved!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save rate')
    } finally {
      setSaving(false)
    }
  }

  const removePrice = async (p) => {
    try {
      await api.deleteMyPricing(p.skill_id)
      setPricing((prev) => prev.filter((x) => x.skill_id !== p.skill_id))
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not remove rate')
    }
  }

  const startEdit = (skill, currentPrice) => {
    setEditSkill(skill)
    setEditPrice(currentPrice ? String(currentPrice) : '')
    setError('')
  }

  return { pricing, setPricing, editSkill, editPrice, setEditPrice, saving, error, success, savePrice, removePrice, startEdit }
}

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

  // Teaching rates state
  const [pricing, setPricing] = useState([])
  const [editSkill, setEditSkill] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [rateSaving, setRateSaving] = useState(false)
  const [rateError, setRateError] = useState('')
  const [rateSuccess, setRateSuccess] = useState('')
  const [ratings, setRatings] = useState({ average_rating: null, review_count: 0, reviews: [] })

  const teachSkills = user?.skills_teach || []

  useEffect(() => {
    if (!user?.id) return
    api.getTeacherPricing(user.id)
      .then((d) => setPricing(d.pricing || []))
      .catch(() => {})
    api.getReviewsForUser(user.id)
      .then((d) => setRatings({
        average_rating: d.average_rating ?? null,
        review_count: d.review_count || 0,
        reviews: d.reviews || [],
      }))
      .catch(() => {})
  }, [user?.id])

  const getPriceForSkill = (skill) => pricing.find((p) => p.skill === skill)

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

  const saveRate = async (skill) => {
    const price = parseFloat(editPrice)
    if (!price || price < 1) {
      setRateError('Minimum price is $1.00')
      return
    }
    setRateSaving(true)
    setRateError('')
    try {
      const { pricing: p } = await api.setMyPricing({ skill, price_usd: price })
      setPricing((prev) => {
        const filtered = prev.filter((x) => x.skill !== skill)
        return [...filtered, p]
      })
      setEditSkill(null)
      setEditPrice('')
      setRateSuccess(`Rate for ${skill} saved!`)
      setTimeout(() => setRateSuccess(''), 3000)
    } catch (err) {
      setRateError(err?.response?.data?.error || 'Could not save rate')
    } finally {
      setRateSaving(false)
    }
  }

  const removeRate = async (p) => {
    try {
      await api.deleteMyPricing(p.skill_id)
      setPricing((prev) => prev.filter((x) => x.skill_id !== p.skill_id))
    } catch (err) {
      setRateError(err?.response?.data?.error || 'Could not remove rate')
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

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Saving…' : 'Save changes →'}
          </button>

          {saved && <p className="font-mono text-xs uppercase tracking-widest text-accent">Saved</p>}
        </form>

        <div className="card">
          <h2 className="font-display text-xl font-semibold text-foreground">Public preview</h2>
          <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-display text-2xl text-accent">
            {user?.name?.[0]}
          </div>
          <p className="mt-4 font-display text-2xl text-foreground">{user?.name}</p>
          <p className="mt-2 text-sm text-mutedForeground">{user?.bio || 'No bio yet'}</p>
          <p className="mt-6 text-sm text-foreground">
            <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Teaches</span> — {user?.skills_teach?.join(', ') || '—'}
          </p>
          <p className="mt-2 text-sm text-foreground">
            <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Learning</span> — {user?.skills_learn?.join(', ') || '—'}
          </p>
          {ratings.review_count > 0 && (
            <p className="mt-4 text-sm text-foreground">
              <span className="text-accent">★ {ratings.average_rating}</span>
              <span className="ml-2 text-mutedForeground">({ratings.review_count} review{ratings.review_count === 1 ? '' : 's'})</span>
            </p>
          )}
        </div>
      </div>

      <div className="card mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Ratings</h2>
            <p className="mt-1 text-sm text-mutedForeground">
              Feedback from learners after completed sessions
            </p>
          </div>
          {ratings.review_count > 0 ? (
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-accent">★ {ratings.average_rating}</p>
              <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">
                {ratings.review_count} review{ratings.review_count === 1 ? '' : 's'}
              </p>
            </div>
          ) : null}
        </div>

        {ratings.reviews.length === 0 ? (
          <p className="text-sm text-mutedForeground">No reviews yet — complete teaching sessions to earn ratings.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
            {ratings.reviews.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {r.reviewer_name || 'Learner'}
                    {r.skill ? <span className="text-mutedForeground"> · {r.skill}</span> : null}
                  </p>
                  <span className="text-accent">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                {r.comment ? (
                  <p className="mt-1 text-sm text-mutedForeground">{r.comment}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {teachSkills.length > 0 && (
        <div className="card mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Teaching Rates</h2>
              <p className="mt-1 text-sm text-mutedForeground">
                Set a USD price per skill so learners can book paid sessions directly.
                Leave blank to keep a skill swap-only.
              </p>
            </div>
          </div>

          {rateError && (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{rateError}</p>
          )}
          {rateSuccess && (
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent">{rateSuccess}</p>
          )}

          <div className="space-y-3">
            {teachSkills.map((skill) => {
              const existing = getPriceForSkill(skill)
              const isEditing = editSkill === skill

              return (
                <div key={skill} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{skill}</p>
                    {!isEditing && (
                      <p className="mt-0.5 text-sm text-mutedForeground">
                        {existing ? (
                          <span className="text-emerald-300">${existing.price_usd.toFixed(2)} / session</span>
                        ) : (
                          'Swap only — no paid booking'
                        )}
                      </p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mutedForeground">$</span>
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          step="0.01"
                          className="input-field w-32 pl-6"
                          placeholder="15.00"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => saveRate(skill)}
                        disabled={rateSaving}
                        className="btn-primary px-3 py-2 text-xs"
                      >
                        {rateSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditSkill(null); setEditPrice('') }}
                        className="btn-outline px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditSkill(skill); setEditPrice(existing ? String(existing.price_usd) : '') }}
                        className="btn-outline px-3 py-1.5 text-xs"
                      >
                        {existing ? 'Edit rate' : 'Set rate'}
                      </button>
                      {existing && (
                        <button
                          type="button"
                          onClick={() => removeRate(existing)}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>
  )
}
