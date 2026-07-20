import { useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

const SATISFACTION = {
  1: 'Very dissatisfied',
  2: 'Dissatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very satisfied',
}

export default function SessionReview({ session, onSubmitted }) {
  const user = useAuthStore((s) => s.user)
  const alreadyReviewed = Boolean(session.reviewed_by_me)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState(alreadyReviewed ? 'done' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedRating, setSavedRating] = useState(session.my_rating || null)

  const isLearner = user?.id === session.learner_id
  const partnerName = isLearner
    ? (session.teacher_name || 'your teacher')
    : (session.learner_name || 'your learner')

  if (status === 'done' || alreadyReviewed) {
    const stars = savedRating || session.my_rating
    return (
      <div className="mt-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
        <p className="text-xs font-mono uppercase tracking-widest text-mutedForeground">User satisfaction</p>
        <p className="mt-1 text-sm text-foreground">
          {stars ? (
            <>
              You rated {partnerName}{' '}
              <span className="text-accent">{'★'.repeat(stars)}</span>
              <span className="text-mutedForeground"> ({stars}/5 · {SATISFACTION[stars]})</span>
            </>
          ) : (
            'Thanks for your feedback!'
          )}
        </p>
      </div>
    )
  }

  const active = hover || rating

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
    <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-mutedForeground">
            User satisfaction
          </p>
          <p className="mt-1 text-sm text-foreground">
            How satisfied were you with {partnerName}?
          </p>
        </div>
        {active > 0 && (
          <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent">
            {SATISFACTION[active]}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star — ${SATISFACTION[n]}`}
            className={`text-2xl transition ${
              n <= active ? 'text-accent scale-110' : 'text-mutedForeground/50'
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 font-mono text-xs text-mutedForeground">
          {active ? `${active}/5` : 'Tap a star'}
        </span>
      </div>

      <label className="mt-4 block text-xs font-medium text-mutedForeground" htmlFor={`feedback-${session.id}`}>
        Feedback
      </label>
      <textarea
        id={`feedback-${session.id}`}
        className="input-field mt-1 min-h-[72px] resize-y"
        placeholder="What went well? What could improve?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />

      <button
        type="button"
        onClick={submit}
        disabled={!rating || status === 'submitting'}
        className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit satisfaction rating'}
      </button>
      {status === 'error' && <p className="mt-2 text-sm text-red-400">{errorMsg}</p>}
    </div>
  )
}
