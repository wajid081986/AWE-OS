import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const VALUES = [
  { icon: '🆓', title: 'Always Free',       desc: 'Core tools are free forever. No hidden fees, no paywalls on essential features. We believe utility should not be gated by your budget.' },
  { icon: '⚡', title: 'Fast & Simple',     desc: 'Every tool is designed to deliver results in seconds. No sign-ups, no bloated interfaces — just paste, click, done.' },
  { icon: '🔒', title: 'Private & Safe',    desc: 'We never sell your data. Files you process in our PDF tools are never stored on our servers. Your inputs stay yours.' },
  { icon: '🤖', title: 'AI-Powered',        desc: 'Cutting-edge language models and machine learning algorithms work behind every AI tool to deliver smarter, more accurate results.' },
  { icon: '📱', title: 'Mobile First',      desc: 'Every tool works perfectly on your phone, tablet or desktop. No app download needed — just open your browser and start.' },
  { icon: '🌍', title: 'Built for Everyone', desc: 'From students in Lagos to freelancers in London, AWE-OS is designed to be useful regardless of your device, language, or technical skill.' },
]

const CATEGORIES = [
  {
    icon: '📄',
    title: 'PDF Tools',
    desc: 'Merge, split, compress, rotate, protect, unlock, watermark and convert PDF files — all without uploading to a third-party server. Our browser-based PDF engine processes everything locally for maximum privacy.',
    tools: ['Merge PDF', 'Compress PDF', 'PDF to Word', 'Word to PDF', 'Split PDF', 'Protect PDF'],
  },
  {
    icon: '🧮',
    title: 'Calculators',
    desc: 'From BMI and loan repayments to GPA and compound interest, our calculators cover the everyday maths that matters. Each one is built with verified formulas from authoritative sources like WHO, RBI, and standard financial principles.',
    tools: ['BMI Calculator', 'Loan Calculator', 'Age Calculator', 'GPA Calculator', 'Percentage Calculator', 'Compound Interest'],
  },
  {
    icon: '🔄',
    title: 'Converters',
    desc: 'Instantly convert between units, file formats, colour spaces, and data formats. Whether you need to convert kilometres to miles or CSV to JSON, our converters are accurate, fast and completely free.',
    tools: ['Unit Converter', 'CSV to JSON', 'Color Picker', 'Image Compressor', 'QR Code Generator'],
  },
  {
    icon: '✨',
    title: 'AI Tools',
    desc: 'Our AI-powered tools tap into state-of-the-art language models to help you write, create and produce better content faster. Build a polished resume in minutes, generate marketing copy, or let AI rewrite your text in a new tone.',
    tools: ['AI Resume Builder', 'AI Content Writer', 'Cover Letter Generator', 'Text Summariser'],
  },
]

const STATS = [
  { value: '100+',   label: 'Free Tools' },
  { value: '50K+',   label: 'Monthly Users' },
  { value: '99.9%',  label: 'Uptime' },
  { value: '0',      label: 'Cost to You' },
]

const TEAM = [
  { name: 'Wajid',      role: 'Founder & CEO',        avatar: '👨‍💼', bio: 'Passionate about democratising AI and making powerful software tools accessible to people who need them most.' },
  { name: 'AI Team',    role: 'Engineering & Models',  avatar: '👩‍💻', bio: 'Our AI agents continuously discover, design and deploy new tools based on real user needs.' },
  { name: 'Community',  role: 'Users & Contributors',  avatar: '🌍', bio: 'Over 50,000 users across 120+ countries who shape what we build next.' },
]

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — AWE-OS | Free AI-Powered Tools for Everyone</title>
        <meta name="description"         content="Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone. PDF tools, calculators, converters and AI writers, all at no cost." />
        <link rel="canonical"            href="https://awe-os.com/about" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="About Us — AWE-OS | Free AI-Powered Tools for Everyone" />
        <meta property="og:description"  content="Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone. PDF tools, calculators, converters and AI writers, all at no cost." />
        <meta property="og:url"          content="https://awe-os.com/about" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://awe-os.com/og-image.svg" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="About AWE-OS — Free AI-Powered Tools for Everyone" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="About Us — AWE-OS | Free AI-Powered Tools for Everyone" />
        <meta name="twitter:description" content="Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone. PDF tools, calculators, converters and AI writers, all at no cost." />
        <meta name="twitter:image"       content="https://awe-os.com/og-image.svg" />
        <meta name="twitter:image:alt"   content="About AWE-OS — Free AI-Powered Tools for Everyone" />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-5xl mb-4 block">🤖</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Free AI-Powered Tools for Everyone
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
            AWE-OS is an open-access platform delivering 100+ free tools — from PDF editors and financial
            calculators to AI content writers — to students, freelancers and businesses worldwide.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-blue-100 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <div className="text-gray-600 leading-relaxed space-y-4">
            <p>
              AWE-OS started with a simple but powerful idea: <strong>what if every person — a student, a
              freelancer, a small business owner — had access to the same AI tools as a Fortune 500 company?</strong>
            </p>
            <p>
              We live in an era where artificial intelligence is reshaping how we work, write, calculate and create.
              Yet most AI tools are locked behind expensive subscriptions, requiring technical expertise to set up
              or limited to users in wealthy countries. We think that&apos;s wrong — and AWE-OS is our answer.
            </p>
            <p>
              We&apos;re an AI-first platform that uses autonomous agents to continuously discover, build, test and
              deploy new tools based on what people actually need. Our AI factory analyses trending searches,
              user feedback and productivity gaps to ship new tools weekly. Our community decides which ones
              are worth keeping and improving.
            </p>
            <p>
              Today, AWE-OS serves over 50,000 users every month across 100+ free tools — from resume builders
              and PDF converters to AI content writers and financial calculators. Every tool is built with the
              same philosophy: make it fast, make it accurate, and keep it free.
            </p>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">What AWE-OS Offers</h2>
          <p className="text-gray-500 text-center text-sm mb-10 max-w-2xl mx-auto">
            Four powerful categories covering the tools you reach for every day — all free, all browser-based.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CATEGORIES.map(({ icon, title, desc, tools }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-6">
                <span className="text-3xl block mb-3">{icon}</span>
                <h3 className="text-gray-900 font-semibold text-base mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map(t => (
                    <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we built it */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why We Built AWE-OS</h2>
          <div className="text-gray-600 leading-relaxed space-y-4">
            <p>
              Before AWE-OS, the tools people needed were scattered across dozens of websites. PDF editing
              required a desktop app or a paid subscription. AI writing tools were gated by usage limits.
              Calculators had ads that obscured results on mobile. Freelancers spent more time hunting for
              tools than actually working.
            </p>
            <p>
              We wanted to build one platform where you could handle your entire digital workflow: prepare
              your CV with an AI resume builder, calculate loan payments before signing a contract, compress
              a PDF for email, convert units for an international client, and generate marketing copy for a
              new product — all without switching tabs, creating accounts on five different sites, or paying
              a monthly fee.
            </p>
            <p>
              We also believe the internet should be more equitable. Students in developing countries should
              have the same access to productivity tools as knowledge workers in Silicon Valley. AWE-OS is
              our commitment to that principle — free, fast, and available to anyone with a browser.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-5">
                <span className="text-3xl block mb-3">{icon}</span>
                <h3 className="text-gray-900 font-semibold mb-2 text-sm">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How AWE-OS Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Open Any Tool', desc: 'Browse 100+ tools by category or use the search bar. No sign-up required for most tools.' },
              { step: '02', title: 'Add Your Input',  desc: 'Upload a file, enter your data, or type your text. Our tools are designed to be self-explanatory.' },
              { step: '03', title: 'Get Your Result', desc: 'Download your output, copy text, or share a link in seconds. No waiting, no queues.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs font-bold">
                  {step}
                </span>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1 text-sm">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">The Team Behind AWE-OS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TEAM.map(({ name, role, avatar, bio }) => (
              <div key={name} className="text-center p-6 bg-white rounded-xl border border-gray-200">
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
          <p className="text-blue-100 mb-6">
            Have a question, tool request, partnership idea or feedback? We&apos;d love to hear from you.
            We respond within 24 hours on weekdays.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contact"
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
            >
              Contact Us →
            </Link>
            <Link
              to="/tools"
              className="inline-block px-6 py-3 bg-blue-700 text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors"
            >
              Explore Tools
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
