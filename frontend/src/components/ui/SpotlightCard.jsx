import { useRef } from 'react'
import useMousePosition from '../../hooks/useMousePosition'
import useReducedMotion from '../../hooks/useReducedMotion'

export default function SpotlightCard({ children, className = '', as: Tag = 'div', ...props }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { pos, active, onMouseMove, onMouseEnter, onMouseLeave } = useMousePosition(ref)

  return (
    <Tag
      ref={ref}
      className={`card relative overflow-hidden ${className}`}
      onMouseMove={reduced ? undefined : onMouseMove}
      onMouseEnter={reduced ? undefined : onMouseEnter}
      onMouseLeave={reduced ? undefined : onMouseLeave}
      {...props}
    >
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: active ? 1 : 0,
            background: `radial-gradient(300px circle at ${pos.x}px ${pos.y}px, rgba(94,106,210,0.15), transparent 60%)`,
          }}
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </Tag>
  )
}
