import { useEffect, useRef, useState } from 'react'

export default function useInView(options = {}) {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (options.once !== false) observer.unobserve(el)
        }
      },
      { threshold: options.threshold ?? 0.3, rootMargin: options.rootMargin ?? '0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options.threshold, options.rootMargin, options.once])

  return [ref, isInView]
}
