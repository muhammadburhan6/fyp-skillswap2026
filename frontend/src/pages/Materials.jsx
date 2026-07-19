import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import CollectionList from '../components/lms/CollectionList'
import CollectionDetail from '../components/lms/CollectionDetail'
import PartnerMaterials from '../components/lms/PartnerMaterials'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'

export default function Materials() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const partnerParam = searchParams.get('partner')

  const [tab, setTab] = useState(partnerParam ? 'partners' : 'mine')
  const [collections, setCollections] = useState([])
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ skill: '', title: '', description: '' })
  const [creating, setCreating] = useState(false)

  const teachSkills = useMemo(() => user?.skills_teach || [], [user])

  const loadMine = () => {
    setLoading(true)
    api.getMyCollections()
      .then((d) => setCollections(d.collections || []))
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load collections'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tab === 'mine') loadMine()
  }, [tab])

  useEffect(() => {
    if (partnerParam) setTab('partners')
  }, [partnerParam])

  const createCollection = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await api.createCollection({
        skill: createForm.skill,
        title: createForm.title.trim() || undefined,
        description: createForm.description.trim() || undefined,
      })
      setShowCreate(false)
      setCreateForm({ skill: '', title: '', description: '' })
      loadMine()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not create collection')
    } finally {
      setCreating(false)
    }
  }

  const deleteCollection = async (col) => {
    if (!window.confirm(`Delete “${col.title}” and all its materials?`)) return
    try {
      await api.deleteCollection(col.id)
      if (active?.id === col.id) setActive(null)
      loadMine()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not delete collection')
    }
  }

  const usedSkills = new Set(collections.map((c) => c.skill))
  const availableSkills = teachSkills.filter((s) => !usedSkills.has(s))

  return (
    <AppShell title="Materials" subtitle="Upload teaching content and browse materials from your swap partners">
      <div className="mb-6 flex gap-2 border-b border-white/[0.06] pb-3">
        {[
          { id: 'mine', label: 'My library' },
          { id: 'partners', label: 'From partners' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setActive(null)
              setError('')
            }}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === t.id
                ? 'bg-accent/20 text-accent'
                : 'text-mutedForeground hover:bg-white/[0.05] hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      {tab === 'partners' ? (
        <PartnerMaterials initialPartnerId={partnerParam ? Number(partnerParam) : null} />
      ) : active ? (
        <CollectionDetail
          collection={active}
          isOwner
          onBack={() => setActive(null)}
          onChanged={loadMine}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-mutedForeground">
              One collection per skill you teach. Publish items so partners can open them.
            </p>
            {!showCreate && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowCreate(true)}
                disabled={!availableSkills.length && !teachSkills.length}
              >
                New collection
              </button>
            )}
          </div>

          {showCreate && (
            <form onSubmit={createCollection} className="card space-y-3">
              <h3 className="font-display font-semibold text-foreground">New collection</h3>
              {!teachSkills.length ? (
                <p className="text-sm text-mutedForeground">
                  Add skills you teach in your profile before creating a collection.
                </p>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-mutedForeground">Skill</label>
                    <select
                      className="input-field"
                      value={createForm.skill}
                      onChange={(e) => setCreateForm((f) => ({ ...f, skill: e.target.value }))}
                      required
                    >
                      <option value="">Select a skill…</option>
                      {availableSkills.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {!availableSkills.length && (
                      <p className="mt-1 text-xs text-mutedForeground">
                        You already have a collection for every skill you teach.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-mutedForeground">Title (optional)</label>
                    <input
                      className="input-field"
                      value={createForm.title}
                      onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Defaults to “Skill materials”"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-mutedForeground">Description (optional)</label>
                    <textarea
                      className="input-field min-h-[80px]"
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What will partners find here?"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={creating || !createForm.skill}
                    >
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline px-4 py-2 text-sm"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {loading ? (
            <p className="text-sm text-mutedForeground">Loading your library…</p>
          ) : (
            <CollectionList
              collections={collections}
              onSelect={setActive}
              onDelete={deleteCollection}
              emptyLabel="No collections yet — create one for a skill you teach."
            />
          )}
        </div>
      )}
    </AppShell>
  )
}
