export default function GradientText({ children, accent = false, className = '', as: Tag = 'span' }) {
  return (
    <Tag className={`${accent ? 'text-gradient-accent animate-shimmer' : 'text-gradient'} ${className}`}>
      {children}
    </Tag>
  )
}
