import { lazy, Suspense } from 'react'
import ErrorBoundary from '../ErrorBoundary'

const Scene3D = lazy(() => import('./Scene3D'))

function FallbackBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/15 blur-[100px]" />
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
