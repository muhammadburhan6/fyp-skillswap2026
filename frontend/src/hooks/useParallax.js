import { useEffect, useState } from 'react'
import useReducedMotion from './useReducedMotion'

/** Scroll-linked hero parallax: opacity, scale, and y translation. */
export default function useParallax(maxScroll = 400) {
  const reduced = useReducedMotion()
  const [style, setStyle] = useState({ opacity: 1, scale: 1, y: 0 })

  useEffect(() => {
    if (reduced) {
      setStyle({ opacity: 1, scale: 1, y: 0 })
      return undefined
    }

    const onScroll = () => {
      const p = Math.min(1, window.scrollY / maxScroll)
      setStyle({
        opacity: 1 - p * 0.85,
        scale: 1 - p * 0.05,
        y: p * 100,
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [maxScroll, reduced])

  return style
}
