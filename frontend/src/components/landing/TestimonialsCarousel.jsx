import { useState, useEffect, useCallback } from 'react'

const testimonials = [
  {
    name: 'Sarah K.',
    role: 'Designer & Python Learner',
    avatar: 'SK',
    rating: 5,
    text: 'I learned UI design while teaching Python — zero money spent. Skillswap matched me with someone who needed exactly what I could offer.',
  },
  {
    name: 'James L.',
    role: 'Developer & Guitar Enthusiast',
    avatar: 'JL',
    rating: 5,
    text: "The matching is scary accurate. Found my perfect swap in two days. I teach JavaScript and learn guitar in return — it's a win-win.",
  },
  {
    name: 'Maria R.',
    role: 'Language Tutor & Fitness Coach',
    avatar: 'MR',
    rating: 4,
    text: 'Best way to pick up Spanish while sharing my fitness knowledge. The points system keeps everything fair and balanced.',
  },
  {
    name: 'Alex T.',
    role: 'Music Producer & Chef',
    avatar: 'AT',
    rating: 5,
    text: "I never thought I'd learn Thai cooking by teaching music production. The community here is incredibly supportive.",
  },
  {
    name: 'Priya S.',
    role: 'Data Scientist & Yoga Instructor',
    avatar: 'PS',
    rating: 5,
    text: 'Teaching data analysis and learning yoga transformed my routine. Skillswap makes skill exchange effortless.',
  },
  {
    name: 'Omar H.',
    role: 'Photographer & Writer',
    avatar: 'OH',
    rating: 4,
    text: 'Swapped portrait tips for storytelling workshops. The points system kept everything fair — no awkward money talk.',
  },
]

function Stars({ count }) {
  return (
    <span className="ls-stars" aria-label={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill={i <= count ? '#F59E0B' : 'none'}
          stroke={i <= count ? '#F59E0B' : 'rgba(255,255,255,0.25)'}
          strokeWidth="1.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

function usePerView() {
  const [perView, setPerView] = useState(1)

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPerView(1)
      else if (window.innerWidth < 1024) setPerView(2)
      else setPerView(3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return perView
}

export default function TestimonialsCarousel() {
  const perView = usePerView()
  const total = testimonials.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const pageCount = total
  const goTo = useCallback(
    (i) => setIndex(((i % total) + total) % total),
    [total],
  )
  const prev = () => goTo(index - 1)
  const next = () => goTo(index + 1)

  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => goTo(index + 1), 4500)
    return () => clearInterval(id)
  }, [index, paused, goTo])

  // Build a window of slides long enough for seamless wrap
  const visible = Array.from({ length: perView }, (_, i) => {
    const t = testimonials[(index + i) % total]
    return { ...t, key: `${t.name}-${index}-${i}` }
  })

  return (
    <div
      className="ls-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
      }}
    >
      <div className="ls-carousel-viewport">
        <div
          className="ls-carousel-track ls-carousel-track-fade"
          key={index}
          style={{ ['--per-view']: String(perView) }}
        >
          {visible.map((t) => (
            <div key={t.key} className="ls-carousel-slide">
              <article className="ls-testimonial-card">
                <Stars count={t.rating} />
                <p className="ls-testimonial-text">&ldquo;{t.text}&rdquo;</p>
                <div className="ls-testimonial-author">
                  <div className="ls-avatar" aria-hidden>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="ls-author-name">{t.name}</p>
                    <p className="ls-author-role">{t.role}</p>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="ls-carousel-controls">
        <button type="button" onClick={prev} className="ls-carousel-btn" aria-label="Previous testimonial">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="ls-carousel-dots">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`ls-carousel-dot ${i === index ? 'active' : ''}`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={next} className="ls-carousel-btn" aria-label="Next testimonial">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
