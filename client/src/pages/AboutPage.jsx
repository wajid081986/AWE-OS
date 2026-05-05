import { Helmet } from 'react-helmet-async'
import PublicLayout from '../components/PublicLayout'

const TEAM = [
  { name: 'Wajid',      role: 'Founder & CEO',        avatar: '👨‍💼', bio: 'Passionate about making AI accessible to everyone.' },
  { name: 'AI Team',    role: 'Engineering',           avatar: '👩‍💻', bio: 'Building the tools that power AWE-OS.' },
  { name: 'Community',  role: 'Users & Contributors',  avatar: '🌍', bio: 'Over 50,000 users who inspire us every day.' },
]

const VALUES = [
  { icon: '🆓', title: 'Always Free',     desc: 'Core tools are free forever. No hidden fees, no paywalls on essential features.' },
  { icon: '⚡', title: 'Fast & Simple',   desc: 'Every tool is designed to give you results in seconds, not minutes.' },
  { icon: '🔒', title: 'Private & Safe',  desc: 'We never sell your data. Your inputs stay yours.' },
  { icon: '🤖', title: 'AI-Powered',      desc: 'Cutting-edge AI models deliver smarter, better results every day.' },
]

export default function AboutPage() {
  return (
    <PublicLayout>
      <Helmet>
        <title>About Us — AWE-OS AI Tools Platform</title>
        <meta name="description" content="Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone." />
        <link rel="canonical" href="https://awe-os.com/about" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-5xl mb-4 block">🤖</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About AWE-OS</h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            We believe powerful AI tools should be free and accessible to everyone — not just big companies.
            AWE-OS is building the world&apos;s largest collection of free AI-powered tools.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              AWE-OS started with a simple idea: what if every person — a student, a freelancer, a small business owner — had access to the same AI tools as a Fortune 500 company?
            </p>
            <p>
              We&apos;re an AI-first platform that uses autonomous agents to continuously discover, build, test and deploy new tools based on what people actually need. Our AI factory generates new tools every day, and our community decides which ones are worth keeping.
            </p>
            <p>
              Today, AWE-OS serves over 50,000 users across 100+ free tools — from resume builders and PDF converters to AI content writers and financial calculators. Every tool is built with the same philosophy: make it fast, make it accurate, and keep it free.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-6">
                <span className="text-3xl block mb-3">{icon}</span>
                <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">The Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TEAM.map(({ name, role, avatar, bio }) => (
              <div key={name} className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-5xl block mb-3">{avatar}</span>
                <h3 className="text-gray-900 font-semibold">{name}</h3>
                <p className="text-blue-600 text-sm mb-2">{role}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 px-4 bg-blue-600 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Get in Touch</h2>
          <p className="text-blue-100 mb-6">Have a question, partnership idea or feedback? We&apos;d love to hear from you.</p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
          >
            Contact Us →
          </a>
        </div>
      </section>
    </PublicLayout>
  )
}
