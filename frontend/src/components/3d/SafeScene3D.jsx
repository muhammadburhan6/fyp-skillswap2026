import { lazy, Suspense } from 'react'
import ErrorBoundary from '../ErrorBoundary'

const Scene3D = lazy(() => import('./Scene3D'))

function FallbackBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30" aria-hidden>
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,#000_24px)]" />
    </div>
  )
}

export default function SafeScene3D(props) {
  return (
    <ErrorBoundary fallback={<FallbackBg />}>
      <Suspense fallback={<FallbackBg />}>
        <Scene3D {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
