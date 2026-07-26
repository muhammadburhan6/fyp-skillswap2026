function initials(name = '') {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

/**
 * Shows the user's uploaded profile picture when available, otherwise falls
 * back to their initials. Pass the shape/size/border classes via `className`
 * so it drops into the same slots the old initial-circles used.
 */
export default function Avatar({ user, className = '' }) {
  const url = user?.avatar_url
  if (url) {
    return (
      <img
        src={url}
        alt={user?.name || 'User'}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <span className={`flex items-center justify-center ${className}`}>
      {initials(user?.name) || '?'}
    </span>
  )
}
