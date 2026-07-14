import { Link } from 'react-router-dom'
import { Container, Callout } from '../../../components/primitives'

const STEPS = [
  {
    title: 'Open a tool — nothing to install',
    body: 'Every tool is a web page. It loads in about a second and asks for no account, no email, and no payment for core features.',
  },
  {
    title: 'Add your file or numbers',
    body: "Drop in a PDF or type your figures. File tools read your document locally using your browser's own file API — the network tab stays silent.",
  },
  {
    title: 'Process on your device',
    body: 'Merging, compressing, converting, calculating — all of it runs as code in your browser tab, on your hardware.',
  },
  {
    title: 'Download the result instantly',
    body: 'Your output file is generated in memory and saved straight to your device. No queue, no link expiry, no watermark.',
  },
]

function Eyebrow({ children }) {
  return (
    <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
      <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
      {children}
    </span>
  )
}

export default function PrivacyPromise() {
  return (
    <section
      id="privacy"
      className="bg-card border-t border-b border-line py-[length:var(--space-8)] max-[560px]:py-[length:var(--space-section-mobile)]"
    >
      <Container className="grid grid-cols-1 md:grid-cols-[1.1fr_.9fr] gap-10 md:gap-14 items-start">
        <div>
          <Eyebrow>Why AWE-OS is different</Eyebrow>
          <h2 className="ds-h2 text-ink mb-[18px]">
            Most "free" tool sites upload your files. We architected AWE-OS so we can't.
          </h2>

          <div className="[&_p]:font-body [&_p]:text-[length:var(--text-body)] [&_p]:text-ink-soft [&_p]:mb-4 [&_strong]:text-ink [&_strong]:font-semibold">
            <p>When you use a typical online PDF tool, your file travels to a server, gets processed there, and a download link comes back. That means your bank statement, offer letter, or ID proof sits — even briefly — on someone else's machine, subject to their retention policy and their security.</p>
            <p><strong>AWE-OS works differently by design.</strong> Our tools are built with WebAssembly and modern browser APIs, so the processing happens on <em>your</em> CPU, inside <em>your</em> browser tab. There is no upload step to skip — it simply doesn't exist. Close the tab and every trace of your file is gone.</p>
            <p>This architecture also makes the tools fast (no upload/download round-trip), lets many of them work offline once loaded, and means they keep working even for very large files that server-based sites reject.</p>
            <p>The second thing we do differently: our calculators are <strong>built for India first</strong>. Generic EMI calculators don't know about CGST vs IGST, old vs new tax regimes, PPF's 15-year lock-in, or TDS on FD interest. Ours do — because that's what our users actually need to calculate.</p>
          </div>

          <Callout variant="success" title="🔒 Our privacy promise">
            Files processed by our browser-based tools are never transmitted to, stored on, or readable by our servers. We can't see your documents even if we wanted to. Read the full <Link to="/privacy-policy" className="font-semibold">privacy policy</Link>.
          </Callout>
        </div>

        <div>
          <Eyebrow>How every tool works</Eyebrow>
          <div className="grid">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`flex gap-[18px] py-5 ${i < STEPS.length - 1 ? 'border-b border-dashed border-line' : ''}`}
              >
                <div
                  className="flex-none grid place-items-center rounded-s bg-ink text-card font-mono font-bold text-[length:var(--text-step-num)]"
                  style={{ width: 'var(--step-num-size)', height: 'var(--step-num-size)' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-body font-bold text-[length:var(--text-step-title)] text-ink mb-1">{step.title}</h3>
                  <p className="text-[length:var(--text-step-body)] text-ink-soft">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="font-body text-[length:var(--text-step-footnote)] text-ink-soft mt-3.5">
            Every tool is manually tested on Chrome, Firefox, Edge, and Safari before release, and re-tested after updates.
          </p>
        </div>
      </Container>
    </section>
  )
}
