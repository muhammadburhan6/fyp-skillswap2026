import { useEffect, useState } from 'react'
import api from '../../lib/api'
import CollectionList from './CollectionList'
import CollectionDetail from './CollectionDetail'

export default function PartnerMaterials({ initialPartnerId = null }) {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState(initialPartnerId)
  const [collections, setCollections] = useState([])
  const [partnerMeta, setPartnerMeta] = useState(null)
  const [activeCollection, setActiveCollection] = useState(null)

  const loadPartners = () => {
    setLoading(true)
    api.getLmsPartners()
      .then((d) => {
        const list = d.partners || []
        setPartners(list)
        if (initialPartnerId) {
          const found = list.find((p) => p.user?.id === Number(initialPartnerId))
          if (found) setSelectedPartnerId(found.user.id)
        }
      })
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load partners'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPartners()
  }, [])

  useEffect(() => {
    if (!selectedPartnerId) {
      setCollections([])
      setPartnerMeta(null)
      setActiveCollection(null)
      return
    }
    setActiveCollection(null)
    api.getPartnerCollections(selectedPartnerId)
      .then((d) => {
        setCollections(d.collections || [])
        setPartnerMeta(d.partner || null)
      })
      .catch((err) => setError(err?.response?.data?.error || 'Cannot view this partner’s materials'))
  }, [selectedPartnerId])

  if (activeCollection) {
    return (
      <CollectionDetail
        collection={activeCollection}
        isOwner={false}
        onBack={() => setActiveCollection(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-mutedForeground">Loading partners…</p>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs text-mutedForeground">Swap partner</label>
            <select
              className="input-field"
              value={selectedPartnerId || ''}
              onChange={(e) => setSelectedPartnerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select a partner…</option>
              {partners.map((p) => (
                <option key={p.user.id} value={p.user.id}>
                  {p.user.name}
                  {p.published_item_count ? ` (${p.published_item_count} items)` : ''}
                </option>
              ))}
            </select>
          </div>

          {!partners.length && (
            <p className="text-sm text-mutedForeground">
              Accept a match or book a session to unlock partner materials.
            </p>
          )}

          {selectedPartnerId && (
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-foreground">
                {partnerMeta?.name || 'Partner'}’s materials
              </h3>
              <CollectionList
                collections={collections}
                onSelect={setActiveCollection}
                emptyLabel="This partner has no published materials yet."
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
