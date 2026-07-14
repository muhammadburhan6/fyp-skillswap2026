export default function SkillSwapLogo({ size = 'md' }) {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const small = size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5'

  return (
    <span className={`relative flex ${box} items-center justify-center`}>
      <span className={`absolute ${dot} rounded-full bg-white`} />
      <span className={`absolute -left-0.5 ${small} rounded-full bg-brand-400`} />
      <span className={`absolute -right-0.5 ${small} rounded-full bg-brand-400`} />
      <span className={`absolute -top-0.5 ${small} rounded-full bg-brand-300`} />
      <span className={`absolute -bottom-0.5 ${small} rounded-full bg-brand-300`} />
    </span>
  )
}
