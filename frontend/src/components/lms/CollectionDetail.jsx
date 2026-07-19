import { useEffect, useState } from 'react'
import api from '../../lib/api'
import MaterialForm from './MaterialForm'
import MaterialItemRow from './MaterialItemRow'

export default function CollectionDetail({ collection, isOwner, onBack, onChanged }) {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(collection)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    api.getCollectionItems(collection.id)
      .then((d) => {
        setItems(d.items || [])
        setMeta(d.collection || collection)
      })
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load materials'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [collection.id])

  const refresh = () => {
    load()
    onChanged?.()
    setShowForm(false)
    setEditing(null)
  }

  const toggleVisibility = async (item) => {
    const next = item.visibility === 'published' ? 'draft' : 'published'
    try {
      await api.updateMaterialItem(item.id, { visibility: next })
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update visibility')
    }
  }

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return
    try {
      await api.deleteMaterialItem(item.id)
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not delete item')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="btn-outline px-3 py-1.5 text-sm">
          ← Back
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-semibold text-foreground">{meta.title}</h2>
          <p className="text-sm text-mutedForeground">
            {meta.skill}
            {meta.description ? ` · ${meta.description}` : ''}
          </p>
        </div>
        {isOwner && !showForm && !editing && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
            Add material
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {showForm && (
        <MaterialForm
          collectionId={collection.id}
          onSaved={refresh}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editing && (
        <MaterialForm
          collectionId={collection.id}
          initial={editing}
          onSaved={refresh}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p className="text-sm text-mutedForeground">Loading materials…</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MaterialItemRow
              key={item.id}
              item={item}
              isOwner={isOwner}
              onEdit={isOwner ? setEditing : undefined}
              onDelete={isOwner ? deleteItem : undefined}
              onToggleVisibility={isOwner ? toggleVisibility : undefined}
            />
          ))}
          {!items.length && (
            <p className="text-sm text-mutedForeground">
              {isOwner ? 'No materials yet — add a note, link, or file.' : 'No published materials yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
