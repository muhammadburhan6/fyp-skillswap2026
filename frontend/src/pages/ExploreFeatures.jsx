import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FeaturesNavbar from '../components/landing/FeaturesNavbar'
import LandingFooter from '../components/landing/LandingFooter'
import FeatureCard, { features } from '../components/landing/FeatureCard'
import SafeScene3D from '../components/3d/SafeScene3D'

export default function ExploreFeatures() {
  return (
    <div className="relative isolate min-h-screen bg-black">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <SafeScene3D interactive={false} className="opacity-25" />
      </div>

      <div className="relative z-10">
        <FeaturesNavbar />

        {/* Hero */}
        <section className="px-6 pb-16 pt-16 text-center sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl"
          >
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Discover Everything SkillSwap
              <br />
              Can Do for You
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
              Powerful tools to learn, teach, and grow — all in one platform.
            </p>
          </motion.div>
        </section>

        {/* Feature cards */}
        <section className="mx-auto max-w-lg px-6 pb-20 sm:max-w-xl">
          <div className="flex flex-col gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <FeatureCard {...feature} index={i} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-white/5 px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-xl"
          >
            <p className="text-lg font-medium text-white sm:text-xl">
              Start learning and teaching today — your skills can take you anywhere.
            </p>
            <Link to="/auth" className="btn-primary mt-8 inline-flex px-10 py-3.5">
              Get started
            </Link>
          </motion.div>
        </section>

        <LandingFooter />
      </div>
    </div>
  )
}
