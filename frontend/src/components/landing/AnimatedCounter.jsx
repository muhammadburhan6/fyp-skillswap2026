import useCountUp from '../../hooks/useCountUp'
import useInView from '../../hooks/useInView'

export default function AnimatedCounter({ end, decimals = 0, suffix = '', label, prefix = '' }) {
  const [ref, inView] = useInView({ threshold: 0.35 })
  const scale = 10 ** decimals
  const value = useCountUp(Math.round(end * scale), 2200, 0, inView)
  const shown = decimals > 0 ? (value / scale).toFixed(decimals) : value.toLocaleString()

  return (
    <div ref={ref} className="ls-stat-card">
      <p className="ls-stat-value">
        {prefix}
        {shown}
        {suffix}
      </p>
      <p className="ls-stat-label">{label}</p>
    </div>
  )
}
