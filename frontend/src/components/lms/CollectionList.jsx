export default function CollectionList({ collections, onSelect, onDelete, emptyLabel }) {
  if (!collections?.length) {
    return <p className="text-sm text-mutedForeground">{emptyLabel || 'No collections yet'}</p>
  }

  return (
    <div className="space-y-3">
      {collections.map((c) => (
        <div key={c.id} className="card flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onSelect(c)} className="min-w-0 flex-1 text-left">
            <p className="font-medium text-foreground">{c.title}</p>
            <p className="mt-0.5 text-sm text-mutedForeground">
              {c.skill || 'Skill'} · {c.item_count} item{c.item_count === 1 ? '' : 's'}
            </p>
            {c.description && (
              <p className="mt-1 line-clamp-2 text-sm text-mutedForeground">{c.description}</p>
            )}
          </button>
          <button type="button" onClick={() => onSelect(c)} className="btn-outline px-3 py-1.5 text-xs">
            Open
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(c)}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
