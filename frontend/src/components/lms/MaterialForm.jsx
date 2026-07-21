import { useRef, useState } from 'react'
import api from '../../lib/api'

const EMPTY = {
  title: '',
  item_type: 'file',
  visibility: 'published',
  body: '',
  external_url: '',
}

const ACCEPT =
  '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx,.mp4,.mp3,.webm,.mov,.m4v'

const TYPE_OPTIONS = [
  { id: 'file', label: 'Attachment' },
  { id: 'note', label: 'Note' },
  { id: 'link', label: 'Link' },
]

function formatBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function titleFromFile(name = '') {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || name
}

export default function MaterialForm({
  collectionId,
  initial = null,
  defaultType = 'file',
  onSaved,
  onCancel,
}) {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(() => (
    initial
      ? {
          title: initial.title || '',
          item_type: initial.item_type || 'note',
          visibility: initial.visibility || 'draft',
          body: initial.body || '',
          external_url: initial.external_url || '',
        }
      : { ...EMPTY, item_type: defaultType || 'file' }
  ))
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const pickFile = (next) => {
    if (!next) {
      setFile(null)
      return
    }
    setFile(next)
    setForm((prev) => ({
      ...prev,
      item_type: 'file',
      title: prev.title.trim() ? prev.title : titleFromFile(next.name),
    }))
    setError('')
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) pickFile(dropped)
  }

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
            setError('Please attach a file (PDF, image, slides, zip, etc.)')
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
          <label className="mb-2 block text-xs text-mutedForeground">Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setField('item_type', t.id)
                  if (t.id !== 'file') setFile(null)
                }}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  form.item_type === t.id
                    ? 'bg-accent/20 text-accent'
                    : 'border border-white/[0.08] text-mutedForeground hover:bg-white/[0.05] hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!initial && form.item_type === 'file' && (
        <div>
          <label className="mb-1 block text-xs text-mutedForeground">Attachment</label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-white/15 bg-white/[0.03] text-mutedForeground hover:border-accent/40 hover:bg-accent/5 hover:text-foreground'
            }`}
          >
            {file ? (
              <>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-xs">{formatBytes(file.size)} · click or drop to replace</p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Drop a file here or click to browse</p>
                <p className="mt-1 text-xs">
                  PDF, Word, PowerPoint, images, zip, video — up to 50 MB
                </p>
              </>
            )}
          </button>
          {file && (
            <button
              type="button"
              onClick={() => {
                pickFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="mt-2 text-xs text-red-300 hover:text-red-200"
            >
              Remove attachment
            </button>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">Title</label>
        <input
          className="input-field"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          required
          placeholder={form.item_type === 'file' ? 'e.g. Week 1 slides.pdf' : 'e.g. Week 1 notes'}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">
          {form.item_type === 'note' || initial?.item_type === 'note'
            ? 'Content'
            : 'Description (optional)'}
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

      <div>
        <label className="mb-1 block text-xs text-mutedForeground">Visibility</label>
        <select
          className="input-field"
          value={form.visibility}
          onChange={(e) => setField('visibility', e.target.value)}
        >
          <option value="published">Published (swap partners can open)</option>
          <option value="draft">Draft (only you)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving
            ? form.item_type === 'file' && !initial
              ? 'Uploading…'
              : 'Saving…'
            : initial
              ? 'Save changes'
              : form.item_type === 'file'
                ? 'Upload attachment'
                : 'Add material'}
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
