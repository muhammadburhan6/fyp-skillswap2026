import { useState } from 'react'
import api from '../../lib/api'

const EMPTY = {
  title: '',
  item_type: 'note',
  visibility: 'draft',
  body: '',
  external_url: '',
}

export default function MaterialForm({ collectionId, initial = null, onSaved, onCancel }) {
  const [form, setForm] = useState(() => (
    initial
      ? {
          title: initial.title || '',
          item_type: initial.item_type || 'note',
          visibility: initial.visibility || 'draft',
          body: initial.body || '',
          external_url: initial.external_url || '',
        }
      : { ...EMPTY }
  ))
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        item_type: form.item_type,
        visibility: form.visibility,
        body: form.body.trim(),
        external_url: form.external_url.trim() || undefined,
      }

      if (initial) {
        await api.updateMaterialItem(initial.id, {
          title: payload.title,
          body: payload.body,
          external_url: payload.external_url,
          visibility: payload.visibility,
        })
      } else {
        if (form.item_type === 'file') {
          if (!file) {
            setError('Choose a file to upload')
            setSaving(false)
            return
          }
          const uploaded = await api.uploadLmsFile(file)
          payload.file_url = uploaded.url
          payload.file_name = uploaded.name
          payload.file_size = uploaded.size
          payload.mime_hint = uploaded.type
        }
        await api.createMaterialItem(collectionId, payload)
      }
      onSaved?.()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save material')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h3 className="font-display font-semibold text-foreground">
        {initial ? 'Edit material' : 'Add material'}
      </h3>

      {!initial && (
        <div>
          <label className="mb-1 block text-xs text-mutedForeground">Type</label>
          <select
            className="input-field"
            value={form.item_type}
            onChange={(e) => setField('item_type', e.target.value)}
          >
            <option value="note">Note</option>
            <option value="link">Link</option>
            <option value="file">File</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">Title</label>
        <input
          className="input-field"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          required
          placeholder="e.g. Week 1 slides"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">
          {form.item_type === 'note' || initial?.item_type === 'note' ? 'Content' : 'Description (optional)'}
        </label>
        <textarea
          className="input-field min-h-[100px]"
          value={form.body}
          onChange={(e) => setField('body', e.target.value)}
          required={(form.item_type === 'note' || initial?.item_type === 'note') && !initial}
          placeholder={
            form.item_type === 'note' || initial?.item_type === 'note'
              ? 'Write your notes'
              : 'Short description for partners'
          }
        />
      </div>

      {(form.item_type === 'link' || initial?.item_type === 'link') && (
        <div>
          <label className="mb-1 block text-xs text-mutedForeground">URL</label>
          <input
            className="input-field"
            type="url"
            value={form.external_url}
            onChange={(e) => setField('external_url', e.target.value)}
            required={!initial || initial.item_type === 'link'}
            placeholder="https://..."
          />
        </div>
      )}

      {!initial && form.item_type === 'file' && (
        <div>
          <label className="mb-1 block text-xs text-mutedForeground">File</label>
          <input
            type="file"
            className="block w-full text-sm text-mutedForeground file:mr-3 file:rounded-lg file:border-0 file:bg-accent/20 file:px-3 file:py-2 file:text-sm file:text-accent"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">Visibility</label>
        <select
          className="input-field"
          value={form.visibility}
          onChange={(e) => setField('visibility', e.target.value)}
        >
          <option value="draft">Draft (only you)</option>
          <option value="published">Published (swap partners)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add material'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline px-4 py-2 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
