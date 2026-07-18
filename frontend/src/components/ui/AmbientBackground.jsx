import useReducedMotion from '../../hooks/useReducedMotion'

/**
 * Four-layer ambient background: radial base, noise, floating blobs, grid.
 * Fixed behind content; pointer-events none.
 */
export default function AmbientBackground() {
  const reduced = useReducedMotion()

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Layer 1 — base radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a0a0f_0%,#050506_50%,#020203_100%)]" />

      {/* Layer 2 — noise */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Layer 3 — ambient blobs */}
      <div
        className={`absolute left-1/2 top-[-10%] h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[#5E6AD2]/25 blur-[150px] ${
          reduced ? '' : 'animate-float'
        }`}
      />
      <div
        className={`absolute left-[-10%] top-[20%] h-[800px] w-[600px] rounded-full bg-purple-500/15 blur-[120px] ${
          reduced ? '' : 'animate-float-slow'
        }`}
      />
      <div
        className={`absolute bottom-[10%] right-[-5%] h-[700px] w-[500px] rounded-full bg-indigo-400/12 blur-[100px] ${
          reduced ? '' : 'animate-float-slower'
        }`}
      />
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[600px] rounded-full bg-[#5E6AD2]/10 blur-[100px]" />

      {/* Layer 4 — grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
