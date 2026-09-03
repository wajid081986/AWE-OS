import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AWE-OS',
  url: 'https://www.awe-os.com',
  description: 'Free browser-based online tools for everyone — PDF tools, calculators, converters, and AI tools. No signup required.',
}

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AWE-OS',
  url: 'https://www.awe-os.com',
  description: 'Free browser-based online tools for everyone — PDF tools, calculators, converters, and AI tools. No signup required.',
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://www.awe-os.com' },
    { '@type': 'ListItem', position: 2, name: 'About' },
  ],
}

const VALUES = [
  { icon: '🆓', title: 'Always Free',       desc: 'Core tools are free forever. No hidden fees, no paywalls on essential features. We believe utility should not be gated by your budget.' },
  { icon: '⚡', title: 'Fast & Simple',     desc: 'Every tool is designed to deliver results in seconds. Most need no sign-up and no bloated interfaces — just paste, click, done.' },
  { icon: '🔒', title: 'Private & Safe',    desc: 'We never sell your data. Files you process in our PDF tools are never stored on our servers. Your inputs stay yours.' },
  { icon: '🤖', title: 'AI-Powered',        desc: 'Cutting-edge language models and machine learning algorithms work behind every AI tool to deliver smarter, more accurate results.' },
  { icon: '📱', title: 'Mobile First',      desc: 'Every tool works perfectly on your phone, tablet or desktop. No app download needed — just open your browser and start.' },
  { icon: '🌍', title: 'Built for Everyone', desc: 'From students in Hyderabad to freelancers in Delhi, AWE-OS is designed to be useful regardless of your device, language, or technical skill.' },
]

const CATEGORIES = [
  {
    icon: '📄',
    title: 'PDF Tools',
    count: '21 tools',
    href: '/tools/pdf',
    desc: 'Merge, split, compress, rotate, protect, unlock, watermark and convert PDF files — all without uploading to a third-party server. Our browser-based PDF engine processes everything locally for maximum privacy.',
    tools: ['Merge PDF', 'Compress PDF', 'PDF to Word', 'Word to PDF', 'Split PDF', 'Protect PDF'],
  },
  {
    icon: '🧮',
    title: 'Calculators',
    count: '13 tools',
    href: '/tools/calculators',
    desc: 'From BMI and loan repayments to GPA and compound interest, our calculators cover the everyday maths that matters. Each one is built with verified formulas from authoritative sources like WHO, RBI, and standard financial principles.',
    tools: ['BMI Calculator', 'Loan Calculator', 'Age Calculator', 'GPA Calculator', 'SIP Calculator', 'GST Calculator'],
  },
  {
    icon: '🔄',
    title: 'Converters & Generators',
    count: '10 tools',
    href: '/tools/converters',
    desc: 'Instantly convert between units, file formats, colour spaces, and data formats. Whether you need to convert kilometres to miles or CSV to JSON, our converters are accurate, fast and completely free.',
    tools: ['Unit Converter', 'CSV to JSON', 'Color Picker', 'Image Compressor', 'QR Code Generator'],
  },
  {
    icon: '✨',
    title: 'Productivity & AI Tools',
    count: '',
    href: '/tools/productivity',
    desc: 'Our AI-powered tools tap into state-of-the-art language models to help you write, create and produce better content faster. Build a polished resume in minutes, write content with AI, or create invoices and contracts.',
    tools: ['AI Resume Builder', 'AI Content Writer', 'Invoice Generator', 'Contract Generator'],
  },
]

const STATS = [
  { value: '49+',    label: 'Tools' },
  { value: '47+',    label: 'No-Signup Tools' },
  { value: '0',      label: 'Files Stored' },
  { value: '0',      label: 'Cost for Core Tools' },
]

const FOUNDER = { name: 'Wajid', role: 'Founder & Builder', avatar: '👨‍💼', bio: 'Independent creator based in Hyderabad, India. Passionate about democratising AI and making powerful software tools accessible to people who need them most.' }

const HOW_ITS_BUILT = [
  { icon: '🤖', title: 'AI-Assisted Development', desc: 'New tools and content are built with AI-assisted tools — but every feature is personally planned, reviewed, tested, and approved before it goes live. See the Editorial Policy for details.' },
  { icon: '💬', title: 'Community Feedback',      desc: 'Tool requests and bug reports from real users directly shape what gets built next. Spotted something broken or missing? Get in touch.' },
]

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — AWE-OS | Free Online Tools</title>
        <meta name="description"         content="Learn about AWE-OS — who we are, why we built free browser-based tools, and our commitment to privacy-first, no-signup tools for everyone." />
        <link rel="canonical"            href="https://www.awe-os.com/about" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="About Us — AWE-OS | Free Online Tools" />
        <meta property="og:description"  content="Learn about AWE-OS — who we are, why we built free browser-based tools, and our commitment to privacy-first, no-signup tools for everyone." />
        <meta property="og:url"          content="https://www.awe-os.com/about" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.png" />
        <meta property="og:image:type"   content="image/png" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="About AWE-OS — Free Online Tools for Everyone" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="About Us — AWE-OS | Free Online Tools" />
        <meta name="twitter:description" content="Learn about AWE-OS — who we are, why we built free browser-based tools, and our commitment to privacy-first, no-signup tools for everyone." />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.png" />
        <meta name="twitter:image:alt"   content="About AWE-OS — Free Online Tools for Everyone" />
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(BREADCRUMB_SCHEMA)}</script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-5xl mb-4 block">🤖</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            About AWE-OS
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
            We build free, fast, browser-based tools for everyone.
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
              AWE-OS was built to give everyone access to tools that usually cost money or require accounts.
              PDF tools, financial calculators, and converters are free and run entirely in your browser — no
              account needed. Whether you&apos;re a student in Hyderabad, a freelancer in Delhi, or a small
              business owner anywhere in India, you deserve the same powerful tools as any Fortune 500 company.
            </p>
            <p>
              <strong>Privacy is not an afterthought — it&apos;s our foundation.</strong> No data is sent to any
              server. Everything runs locally in your browser. When you compress a PDF, calculate your BMI, or
              generate a QR code, your data never leaves your device. We have no access to it, and we never will.
            </p>
            <p>
              We live in an era where browser technology is powerful enough to run sophisticated tools entirely on
              your device — with zero uploads, zero accounts, and zero cost. Most of AWE-OS works exactly that way.
              A small number of advanced AI tools run on server-side models and require a free account, with an
              optional paid plan for heavy use. AWE-OS is our commitment to keeping as much as possible free, fast,
              and open.
            </p>
            <p>
              Today, AWE-OS offers 49+ tools — from PDF converters and financial calculators to an AI resume
              builder and AI content writer. Every tool is built with the same philosophy: make it fast, make it
              accurate, and keep as much of it free as possible.
            </p>
            <p>
              Curious who's behind this site and how we write and test what's published here? Read our{' '}
              <Link to="/editorial-policy" className="text-blue-600 hover:underline font-medium">
                Editorial Policy
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">What You Can Do on AWE-OS</h2>
          <p className="text-gray-500 text-center text-sm mb-10 max-w-2xl mx-auto">
            Four powerful categories covering the tools you reach for every day — mostly free, mostly browser-based.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CATEGORIES.map(({ icon, title, count, href, desc, tools }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-6">
                <span className="text-3xl block mb-3">{icon}</span>
                <div className="flex items-center gap-2 mb-2">
                  <Link to={href} className="text-gray-900 font-semibold text-base hover:text-blue-600 transition-colors">
                    {title}
                  </Link>
                  {count && (
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map(t => (
                    <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                <Link to={href} className="inline-block mt-4 text-xs text-blue-600 hover:underline font-medium">
                  Browse {title} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we built it */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why We Built This</h2>
          <div className="text-gray-600 leading-relaxed space-y-4">
            <p>
              Most online tool sites are cluttered with ads, require sign-ups, or upload your files to foreign
              servers. A simple PDF compression sends your private documents to a server you know nothing about.
              A basic calculator is buried under pop-ups asking you to subscribe. We built AWE-OS to fix that.
            </p>
            <p>
              The goal was simple: <strong>clean UI, no signup, browser-only processing wherever possible.</strong>{' '}
              Most tools on AWE-OS — PDF tools, calculators, and converters — run entirely inside your browser.
              Your files never travel over the network. Your calculations are never logged. You never have to
              create an account just to convert a PDF or check your BMI.
            </p>
            <p>
              We also believe the internet should be more equitable. Students in India should have the same
              access to professional-grade tools as knowledge workers in Silicon Valley. AWE-OS is our
              commitment to that principle — free, fast, and available to anyone with a browser.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
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
              { step: '01', title: 'Open Any Tool', desc: 'Browse 49+ tools by category or use the search bar. No sign-up required for most tools.' },
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

      {/* Who's behind this + how it's built */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Who's Behind AWE-OS</h2>
          <p className="text-gray-500 text-center text-sm mb-10 max-w-2xl mx-auto">
            AWE-OS is built and maintained by one independent creator, using AI-assisted development tools —
            every feature is planned, reviewed, and personally approved before it ships. Read the full{' '}
            <Link to="/editorial-policy" className="text-blue-600 hover:underline font-medium">Editorial Policy</Link>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <span className="text-5xl block mb-3">{FOUNDER.avatar}</span>
              <h3 className="text-gray-900 font-semibold">{FOUNDER.name}</h3>
              <p className="text-blue-600 text-sm mb-2">{FOUNDER.role}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{FOUNDER.bio}</p>
            </div>
            {HOW_ITS_BUILT.map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-6 bg-white rounded-xl border border-gray-200">
                <span className="text-5xl block mb-3">{icon}</span>
                <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
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
