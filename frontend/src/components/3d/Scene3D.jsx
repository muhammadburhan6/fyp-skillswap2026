import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Float,
  MeshDistortMaterial,
  OrbitControls,
  Sphere,
  Stars,
  Torus,
  Box,
} from '@react-three/drei'

function FloatingOrb({ position, color, speed = 1, distort = 0.4, scale = 0.8 }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.2 * speed
      ref.current.rotation.y = state.clock.elapsedTime * 0.3 * speed
    }
  })
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={2}>
      <Sphere ref={ref} args={[1, 48, 48]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={2}
          roughness={0.15}
          metalness={0.85}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </Sphere>
    </Float>
  )
}

function FloatingRing({ position, scale = 1 }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.3
      ref.current.rotation.z = state.clock.elapsedTime * 0.2
    }
  })
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
      <Torus
        ref={ref}
        args={[1.2, 0.08, 16, 64]}
        position={position}
        scale={scale}
      >
        <meshStandardMaterial color="#3b82f6" metalness={0.9} roughness={0.1} emissive="#2563eb" emissiveIntensity={0.3} />
      </Torus>
    </Float>
  )
}

function FloatingCube({ position }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.4
      ref.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })
  return (
    <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.2}>
      <Box ref={ref} args={[0.6, 0.6, 0.6]} position={position}>
        <meshStandardMaterial
          color="#60a5fa"
          metalness={0.7}
          roughness={0.2}
          transparent
          opacity={0.85}
          emissive="#1d4ed8"
          emissiveIntensity={0.2}
        />
      </Box>
    </Float>
  )
}

function Scene({ interactive = true }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#3b82f6" />
      <pointLight position={[-10, -5, -5]} intensity={1} color="#ffffff" />
      <pointLight position={[0, -8, 4]} intensity={0.6} color="#2563eb" />

      <Stars radius={80} depth={50} count={1500} factor={3} saturation={0} fade speed={0.5} />

      <FloatingOrb position={[-3.5, 1, -1]} color="#2563eb" speed={0.8} scale={1.1} />
      <FloatingOrb position={[3.8, -0.8, -2]} color="#60a5fa" speed={1.2} distort={0.55} scale={0.9} />
      <FloatingOrb position={[0.5, 2.2, -3]} color="#1e40af" speed={0.6} scale={0.55} />
      <FloatingOrb position={[-1.5, -2, -2.5]} color="#3b82f6" speed={0.9} distort={0.35} scale={0.45} />
      <FloatingOrb position={[2, 1.8, -4]} color="#93c5fd" speed={1.1} scale={0.35} />

      <FloatingRing position={[-2.5, -1.5, -3]} scale={0.7} />
      <FloatingRing position={[2.8, 1.2, -4]} scale={0.5} />
      <FloatingCube position={[-3, 0, -2]} />
      <FloatingCube position={[1.5, -1.8, -3.5]} />

      {interactive && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.35}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 3}
        />
      )}
    </>
  )
}

export default function Scene3D({
  className = '',
  interactive = true,
  fullPage = false,
  fixed = false,
}) {
  const positionClass = fixed ? 'fixed inset-0' : 'absolute inset-0'
  const heightClass = fullPage ? 'h-full min-h-screen' : 'h-full'

  return (
    <div
      className={`${positionClass} ${heightClass} pointer-events-none -z-10 ${className}`}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene interactive={interactive} />
        </Suspense>
      </Canvas>
    </div>
  )
}
