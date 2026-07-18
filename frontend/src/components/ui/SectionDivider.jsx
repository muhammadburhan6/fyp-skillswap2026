export default function SectionDivider({ className = '', gradient = true }) {
  return (
    <div className={`relative border-t border-white/[0.06] ${className}`} aria-hidden>
      {gradient && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
    </div>
  )
}
