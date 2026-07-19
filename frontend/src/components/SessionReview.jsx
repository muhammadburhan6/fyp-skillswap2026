import { useState } from 'react'
import api from '../lib/api'

export default function SessionReview({ session, onSubmitted }) {
  const alreadyReviewed = Boolean(session.reviewed_by_me)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState(alreadyReviewed ? 'done' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedRating, setSavedRating] = useState(session.my_rating || null)

  if (status === 'done' || alreadyReviewed) {
    const stars = savedRating || session.my_rating
    return (
      <p className="mt-3 text-sm text-mutedForeground">
        {stars
          ? <>You rated this teacher <span className="text-accent">{'★'.repeat(stars)}</span> ({stars}/5)</>
          : 'Thanks for your feedback!'}
      </p>
    )
  }

  const submit = async () => {
    if (!rating) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      await api.submitReview(session.id, rating, comment)
      setSavedRating(rating)
      setStatus('done')
      onSubmitted?.()
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not submit review'
      if (err?.response?.status === 409) {
        setSavedRating(rating)
        setStatus('done')
        onSubmitted?.()
        return
      }
      setStatus('error')
      setErrorMsg(msg)
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
      <p className="text-sm text-foreground">
        Rate {session.teacher_name || 'your teacher'} for this session
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`text-lg ${n <= rating ? 'text-accent' : 'text-mutedForeground'}`}
          >
            ★
          </button>
        ))}
      </div>
      <input
        className="input-field"
        placeholder="Optional feedback (what went well?)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!rating || status === 'submitting'}
        className="btn-outline px-4 py-2 text-sm disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit review'}
      </button>
      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}
    </div>
  )
}
