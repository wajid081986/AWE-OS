// Renders below the tool interface: how-to steps, about text, and FAQs.
// All sections are optional — renders nothing if all props are empty.
export default function ToolFooter({ steps, about, faqs, name, className = '' }) {
  if (!steps?.length && !about?.length && !faqs?.length) return null

  return (
    <div className={className}>

      {steps?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use {name}</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="text-gray-600 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {about?.length > 0 && (
        <section className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">About {name}</h2>
          <div className="space-y-3">
            {about.map((para, i) => (
              <p key={i} className="text-gray-600 text-sm leading-relaxed">{para}</p>
            ))}
          </div>
        </section>
      )}

      {faqs?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
                  <span
                    className="text-gray-400 text-xl shrink-0 group-open:rotate-45 transition-transform duration-200"
                    aria-hidden
                  >+</span>
                </summary>
                <div className="px-5 pb-4 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
