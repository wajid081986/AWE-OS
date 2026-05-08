import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import api from '../services/api.service'

export default function ContactPage() {
  const [form, setForm]   = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState(null) // 'sending' | 'success' | 'error'

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await api.post('/api/contact', form)
      setStatus('success')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      // Fallback: open mail client
      window.location.href = `mailto:wajid081986@gmail.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.message)}`
      setStatus(null)
    }
  }

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <>
      <Helmet>
        <title>Contact Us — AWE-OS</title>
        <meta name="description" content="Get in touch with the AWE-OS team. We respond within 24 hours." />
        <link rel="canonical" href="https://awe-os.com/contact" />
      </Helmet>

      <section className="bg-gradient-to-b from-blue-50 to-white py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500">Have a question or feedback? We&apos;d love to hear from you. Typical response time: 24 hours.</p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Info sidebar */}
          <div className="space-y-6">
            {[
              { icon: '📧', title: 'Email',         text: 'wajid081986@gmail.com' },
              { icon: '⏱️', title: 'Response Time',  text: 'Within 24 hours on weekdays' },
              { icon: '🕐', title: 'Support Hours',  text: 'Mon–Fri, 9 AM – 6 PM IST' },
            ].map(({ icon, title, text }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            {status === 'success' ? (
              <div className="text-center py-16 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-5xl block mb-4">✅</span>
                <h3 className="text-gray-900 font-bold text-xl mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm">We&apos;ll get back to you within 24 hours.</p>
                <button onClick={() => setStatus(null)} className="mt-4 text-blue-600 text-sm hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                    <input type="text" required value={form.name} onChange={update('name')} placeholder="Your name" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={update('email')} placeholder="your@email.com" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                  <input type="text" required value={form.subject} onChange={update('subject')} placeholder="How can we help?" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                  <textarea required value={form.message} onChange={update('message')} placeholder="Describe your question or feedback in detail…" rows={6} className={`${inputClass} resize-none`} />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {status === 'sending' ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
