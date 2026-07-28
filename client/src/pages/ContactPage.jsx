import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../services/api.service'

const CONTACT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact AWE-OS',
  url: 'https://www.awe-os.com/contact',
  description: 'Contact the AWE-OS team for support, bug reports, or feature requests.',
  author: { '@type': 'Organization', name: 'AWE-OS', url: 'https://www.awe-os.com' },
  publisher: { '@type': 'Organization', name: 'AWE-OS', url: 'https://www.awe-os.com' },
  dateModified: '2026-07-28',
}

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AWE-OS',
  url: 'https://www.awe-os.com',
  description: 'Free browser-based online tools for everyone — PDF tools, calculators, converters, and AI tools. No signup required.',
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AWE-OS',
  url: 'https://www.awe-os.com',
  logo: 'https://www.awe-os.com/logo.png',
}

const SUBJECTS = [
  'General Question',
  'Bug Report',
  'Feature Request',
  'Partnership',
  'Other',
]

const HELP_LINKS = [
  { q: 'How do I merge PDF files?',   to: '/tools/merge-pdf' },
  { q: 'Is my data safe?',            to: '/about'           },
  { q: 'Are all tools really free?',  to: '/about'           },
]

const CONTACT_FAQS = [
  { q: 'What is your response time?',       a: 'We aim to reply within 24 hours on weekdays (Monday–Friday, IST). Messages sent over the weekend are typically answered by Monday morning.' },
  { q: 'How do I report a bug?',            a: "Use the contact form below and select 'Bug Report' as the subject. Include the tool name, what you were trying to do, and what happened instead. Screenshots help a lot." },
  { q: 'Can I request a new tool?',         a: "Absolutely. We add new tools every few weeks based on user demand. Select 'Feature Request' in the form and describe the tool you need and your specific use case." },
  { q: 'Are all AWE-OS tools really free?', a: 'Yes — every tool is free with no usage limits, no watermarks, and no hidden fees. No credit card or subscription required. We earn through advertising and our own digital products in the Store — the free tools stay free.' },
]

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.awe-os.com' },
    { '@type': 'ListItem', position: 2, name: 'Contact' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: CONTACT_FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState(null) // 'sending' | 'success' | 'error'

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.message.length < 20) return
    setStatus('sending')
    try {
      await api.post('/api/contact', form)
      setStatus('success')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      window.location.href = `mailto:support@awe-os.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.message)}`
      setStatus(null)
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <>
      <Helmet>
        <title>Contact Us — AWE-OS | Free Online Tools</title>
        <meta name="description"         content="Get in touch with the AWE-OS team. Report bugs, request features, or ask questions about our free online tools." />
        <link rel="canonical"            href="https://www.awe-os.com/contact" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="Contact Us — AWE-OS | Free Online Tools" />
        <meta property="og:description"  content="Get in touch with the AWE-OS team. Report bugs, request features, or ask questions about our free online tools." />
        <meta property="og:url"          content="https://www.awe-os.com/contact" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.png" />
        <meta property="og:image:type"   content="image/png" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="Contact AWE-OS" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="Contact Us — AWE-OS | Free Online Tools" />
        <meta name="twitter:description" content="Get in touch with the AWE-OS team. Report bugs, request features, or ask questions about our free online tools." />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.png" />
        <meta name="twitter:image:alt"   content="Contact AWE-OS" />
        <script type="application/ld+json">{JSON.stringify(CONTACT_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(BREADCRUMB_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA)}</script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500 text-lg">
            Have a question, suggestion, or found a bug? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* About + FAQ */}
      <section className="py-12 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">About AWE-OS</h2>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>AWE-OS is a free online tools platform built for Indian students, professionals, and small businesses. We offer 49+ tools across PDF processing, financial calculators, format converters, and AI-powered productivity — all free, all browser-based, and all completely private.</p>
                <p>Your files never leave your device. All PDF processing, calculations, and conversions happen locally in your browser. No server uploads mean zero privacy risk — your documents, financial details, and personal data stay entirely on your machine and are discarded when you close the tab.</p>
                <p>We're a small team passionate about making professional tools accessible to everyone in India. Whether you're a student merging assignment PDFs, a freelancer generating GST invoices, or a professional calculating SIP returns for retirement planning — AWE-OS has a free tool for you.</p>
              </div>
              <div className="flex flex-wrap gap-4 mt-5">
                <Link to="/tools"      className="text-sm text-blue-600 hover:underline font-medium">Browse all tools →</Link>
                <Link to="/blog"       className="text-sm text-blue-600 hover:underline font-medium">Read our blog →</Link>
                <Link to="/about"      className="text-sm text-blue-600 hover:underline font-medium">About us →</Link>
                <Link to="/tools/free" className="text-sm text-blue-600 hover:underline font-medium">Free tools list →</Link>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Support FAQ</h2>
              <div className="space-y-4">
                {CONTACT_FAQS.map(({ q, a }) => (
                  <div key={q} className="border border-gray-200 rounded-xl p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-900 mb-1.5">{q}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact form + sidebar */}
      <section id="contact-form" className="py-14 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Info sidebar */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Other Ways to Reach Us</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Email</p>
                    <a
                      href="mailto:support@awe-os.com"
                      className="text-sm text-blue-600 hover:underline mt-0.5 block"
                    >
                      support@awe-os.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Response Time</p>
                    <p className="text-sm text-gray-500 mt-0.5">We typically respond within 24 hours on weekdays.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick help links */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Looking for Help?</h2>
              <ul className="space-y-3">
                {HELP_LINKS.map(({ q, to }) => (
                  <li key={q}>
                    <Link to={to} className="text-sm text-blue-600 hover:underline leading-snug block">
                      {q} →
                    </Link>
                  </li>
                ))}
                <li>
                  <a href="#contact-form" className="text-sm text-blue-600 hover:underline leading-snug block">
                    Report a bug →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send Us a Message</h2>

            {status === 'success' ? (
              <div className="text-center py-16 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-5xl block mb-4">✅</span>
                <h3 className="text-gray-900 font-bold text-xl mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm">Thanks! We&apos;ll reply within 24 hours.</p>
                <button
                  onClick={() => setStatus(null)}
                  className="mt-4 text-blue-600 text-sm hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      placeholder="your@email.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="contact-subject"
                    required
                    value={form.subject}
                    onChange={update('subject')}
                    className={`${inputCls} bg-white cursor-pointer`}
                  >
                    <option value="" disabled>Select a subject…</option>
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    minLength={20}
                    value={form.message}
                    onChange={update('message')}
                    placeholder="Describe your question, bug, or suggestion in detail…"
                    rows={6}
                    className={`${inputCls} resize-none`}
                  />
                  {form.message.length > 0 && form.message.length < 20 && (
                    <p className="text-xs text-red-500 mt-1">
                      Please write at least 20 characters ({form.message.length}/20).
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {status === 'sending' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
