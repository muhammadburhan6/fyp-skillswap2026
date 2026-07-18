export default function SkillSwapLogo({ size = 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const inner = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <span
      className={`relative flex ${box} items-center justify-center rounded-xl border border-accent/40 bg-accent/15 shadow-[0_0_20px_rgba(94,106,210,0.25)]`}
    >
      <span className={`${inner} rounded-sm bg-accent`} />
    </span>
  )
}
