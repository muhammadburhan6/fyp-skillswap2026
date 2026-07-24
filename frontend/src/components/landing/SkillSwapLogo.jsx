export default function SkillSwapLogo({ size = 'md' }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center drop-shadow-[0_0_12px_rgba(94,106,210,0.35)]"
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <svg width={dim} height={dim} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="11" fill="url(#ss-bg)" />
        <rect
          x="0.75"
          y="0.75"
          width="38.5"
          height="38.5"
          rx="10.25"
          stroke="rgba(165,180,252,0.4)"
          strokeWidth="1.5"
        />
        {/* Top arrow → (teach) */}
        <path
          d="M11 15h14.5"
          stroke="#EEF2FF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M22.5 10.5L28 15l-5.5 4.5"
          stroke="#EEF2FF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom arrow ← (learn) */}
        <path
          d="M29 25H14.5"
          stroke="#A5B4FC"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M17.5 29.5L12 25l5.5-4.5"
          stroke="#A5B4FC"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="ss-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6872D9" />
            <stop offset="1" stopColor="#3F46A8" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  )
}
