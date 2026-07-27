import { useEffect, useRef, useState } from 'react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'

export function ReportModal({ targetUser, onClose, onSuccess }) {
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetUser?.id) return
    setLoading(true)
    setError('')
    try {
      await api.reportUser({
        reported_user_id: targetUser.id,
        reason,
        details,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-backgroundElevated p-6 shadow-card-hover">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Report {targetUser?.name || 'User'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-mutedForeground hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-mutedForeground">
              Reason for report
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field w-full"
            >
              <option value="spam">Spam or Advertising</option>
              <option value="harassment">Harassment or Hate Speech</option>
              <option value="scam">Scam or Fraud</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-mutedForeground">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="input-field w-full resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1 text-xs"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 text-xs"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserReportMenu({ targetUser, onReportSubmitted }) {
  const { user: currentUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!targetUser || targetUser.id === currentUser?.id) {
    return null
  }

  const handleSuccess = () => {
    setToast(true)
    setTimeout(() => setToast(false), 4000)
    onReportSubmitted?.()
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-mutedForeground transition hover:bg-white/[0.08] hover:text-foreground"
        title="More options"
        aria-label="More options"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-xl border border-white/10 bg-backgroundElevated shadow-card-hover backdrop-blur-xl">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              setShowModal(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-white/[0.06]"
          >
            <span>🚩</span> Report / Spam
          </button>
        </div>
      )}

      {showModal && (
        <ReportModal
          targetUser={targetUser}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-xs font-medium text-emerald-200 shadow-card backdrop-blur-md">
          Report submitted successfully. Thank you!
        </div>
      )}
    </div>
  )
}
