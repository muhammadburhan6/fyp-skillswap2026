import { useCallback, useState } from 'react'

export default function useMousePosition(ref) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  const onMouseMove = useCallback(
    (e) => {
      const el = ref?.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    },
    [ref],
  )

  const onMouseEnter = useCallback(() => setActive(true), [])
  const onMouseLeave = useCallback(() => setActive(false), [])

  return { pos, active, onMouseMove, onMouseEnter, onMouseLeave }
}
