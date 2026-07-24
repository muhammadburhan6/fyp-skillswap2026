import { Link } from 'react-router-dom'
import FeaturesNavbar from '../components/landing/FeaturesNavbar'
import LandingFooter from '../components/landing/LandingFooter'
import FeatureCard, { features } from '../components/landing/FeatureCard'
import GradientText from '../components/ui/GradientText'
import SectionDivider from '../components/ui/SectionDivider'

export default function ExploreFeatures() {
  return (
    <div className="marketing-shell relative min-h-screen">
      <FeaturesNavbar />

      <section className="section-wrap py-16 md:py-24 lg:py-28">
        <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Platform features</p>
        <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.03em] md:text-6xl lg:text-7xl">
          <GradientText as="span">Everything Skillswap can do for you</GradientText>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-mutedForeground">
          Powerful tools to learn, teach, and grow — all in one platform.
        </p>
      </section>

      <SectionDivider />

      <section className="section-wrap py-16 md:py-24">
        <div className="grid auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-6 md:gap-5">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <SectionDivider />

      <section className="section-wrap py-16 text-center md:py-28">
        <div className="card-inverted mx-auto max-w-xl p-10 md:p-12">
          <p className="text-2xl font-semibold tracking-tight md:text-3xl">
            Start learning and teaching today — your skills can take you anywhere.
          </p>
          <Link to="/auth?mode=signup" className="btn-primary mt-8 inline-flex">
            Get Started →
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
