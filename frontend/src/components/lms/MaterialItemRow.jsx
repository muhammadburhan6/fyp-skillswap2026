import { useState } from 'react'

function typeLabel(type) {
  if (type === 'file') return 'File'
  if (type === 'link') return 'Link'
  return 'Note'
}

export default function MaterialItemRow({ item, isOwner, onEdit, onDelete, onToggleVisibility }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-mutedForeground">
              {typeLabel(item.item_type)}
            </span>
            {isOwner && (
              <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                item.visibility === 'published'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-white/10 bg-white/[0.05] text-mutedForeground'
              }`}>
                {item.visibility}
              </span>
            )}
          </div>
          <p className="mt-1.5 font-medium text-foreground">{item.title}</p>
          {item.item_type === 'file' && item.file_name && (
            <p className="mt-0.5 text-xs text-mutedForeground">{item.file_name}</p>
          )}
          {item.item_type === 'link' && item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-sm text-accent hover:text-accentBright"
            >
              {item.external_url}
            </a>
          )}
          {item.item_type === 'note' && item.body && (
            <>
              <p className={`mt-1 whitespace-pre-wrap text-sm text-mutedForeground ${expanded ? '' : 'line-clamp-2'}`}>
                {item.body}
              </p>
              {item.body.length > 120 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs text-accent hover:text-accentBright"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </>
          )}
          {item.body && item.item_type !== 'note' && (
            <p className="mt-1 text-sm text-mutedForeground">{item.body}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.item_type === 'file' && item.file_url && (
            <a href={item.file_url} target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">
              Open
            </a>
          )}
          {item.item_type === 'link' && item.external_url && (
            <a href={item.external_url} target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">
              Visit
            </a>
          )}
          {isOwner && onToggleVisibility && (
            <button
              type="button"
              onClick={() => onToggleVisibility(item)}
              className="btn-outline px-3 py-1.5 text-xs"
            >
              {item.visibility === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          )}
          {isOwner && onEdit && (
            <button type="button" onClick={() => onEdit(item)} className="btn-outline px-3 py-1.5 text-xs">
              Edit
            </button>
          )}
          {isOwner && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
