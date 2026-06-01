import { Helmet } from 'react-helmet-async'

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — AWE-OS</title>
        <meta name="description"         content="AWE-OS Privacy Policy. Learn how we handle your data — spoiler: we don't collect any. All tools run in your browser." />
        <link rel="canonical"            href="https://www.awe-os.com/privacy-policy" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="Privacy Policy — AWE-OS" />
        <meta property="og:description"  content="AWE-OS Privacy Policy. Learn how we handle your data — spoiler: we don't collect any. All tools run in your browser." />
        <meta property="og:url"          content="https://www.awe-os.com/privacy-policy" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.svg" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="AWE-OS Privacy Policy" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="Privacy Policy — AWE-OS" />
        <meta name="twitter:description" content="AWE-OS Privacy Policy. Learn how we handle your data — spoiler: we don't collect any. All tools run in your browser." />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.svg" />
        <meta name="twitter:image:alt"   content="AWE-OS Privacy Policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Last updated: June 1, 2026</p>
        </div>

        <Section title="1. Introduction">
          <p>
            AWE-OS (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a free, browser-based tools
            platform. We are committed to your privacy — not just as a legal obligation, but as a core
            design principle. This policy explains exactly what data we do and do not handle when you
            use awe-os.com.
          </p>
          <p>
            The short version: <strong>we built AWE-OS so your data never has to leave your device.</strong>{' '}
            PDF processing, image editing, calculations, and conversions all run locally in your browser.
            Nothing is uploaded to our servers. Nothing is stored. Nothing is sold.
          </p>
        </Section>

        <Section title="2. Data We Do NOT Collect">
          <p>
            The following data is <strong>never sent to our servers</strong> under any circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Files you upload to PDF tools (merge, compress, split, convert, etc.)</li>
            <li>Images you process with our image tools</li>
            <li>Numbers or values you enter into calculators or converters</li>
            <li>Text you paste into any text-processing tool</li>
            <li>QR code data, colour values, or unit conversion inputs</li>
          </ul>
          <p>
            All of the above run entirely inside your browser using JavaScript. Your data never travels
            over the network. We have no access to it, and we never will.
          </p>
        </Section>

        <Section title="3. Data We May Collect">
          <p>The only personal data we may receive comes through two voluntary channels:</p>
          <p>
            <strong>Contact form:</strong> If you use the contact form at awe-os.com/contact, we receive
            your name, email address, and the message you write. We use this solely to reply to you and
            do not add you to any marketing list.
          </p>
          <p>
            <strong>Analytics:</strong> If Google Analytics is active on the site, it collects
            anonymised usage data — pages visited, session duration, country, and device type. This
            data is aggregated and never linked to you personally. You can opt out at any time using
            the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>
        </Section>

        <Section title="4. Cookies">
          <p>
            AWE-OS itself does not set any tracking or login cookies — there are no user accounts, so
            there is no session to maintain.
          </p>
          <p>
            If Google Analytics or Google AdSense is active, those services may set their own cookies:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Analytics cookies (Google Analytics):</strong> Used to measure site traffic in
              aggregate. These do not identify you personally.
            </li>
            <li>
              <strong>Advertising cookies (Google AdSense):</strong> Used to serve contextually
              relevant ads. You can opt out via{' '}
              <a
                href="https://www.google.com/settings/ads"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Ads Settings
              </a>
              .
            </li>
          </ul>
          <p>
            You can block or delete all cookies through your browser settings at any time. Doing so
            will not affect any tool functionality on AWE-OS.
          </p>
        </Section>

        <Section title="5. Third-Party Services">
          <p>AWE-OS may integrate the following third-party services:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google AdSense</strong> — We plan to display non-intrusive ads to fund the
              platform. AdSense may use cookies to personalise ads based on your browsing history
              across the web. See{' '}
              <a
                href="https://policies.google.com/privacy"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&apos;s Privacy Policy
              </a>{' '}
              for full details.
            </li>
            <li>
              <strong>Google Analytics</strong> — Anonymised traffic measurement. Data is processed
              by Google under their standard terms. No personally identifiable information is shared.
            </li>
          </ul>
          <p>
            We do not use any other third-party data processors. We do not sell, rent, or share your
            data with any party for commercial purposes.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>
            We respect your rights under both the <strong>EU General Data Protection Regulation (GDPR)</strong>{' '}
            and the <strong>Indian Information Technology Act 2000</strong> and its associated rules
            (IT (Reasonable Security Practices and Procedures) Rules 2011).
          </p>
          <p>Because we collect almost no personal data, most rights are automatically satisfied:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Right to access:</strong> We hold no stored data about your tool usage. Contact
              us if you submitted a contact form and want a copy of that message.
            </li>
            <li>
              <strong>Right to erasure:</strong> Contact us at{' '}
              <a href="mailto:contact@awe-os.com" className="text-blue-600 hover:underline">
                contact@awe-os.com
              </a>{' '}
              and we will delete any contact form data we hold about you within 30 days.
            </li>
            <li>
              <strong>Right to object:</strong> You can opt out of Google Analytics or AdSense
              cookies at any time via their respective opt-out mechanisms.
            </li>
            <li>
              <strong>Indian IT Act:</strong> We comply with the IT Act 2000&apos;s provisions on
              data protection and will cooperate with lawful requests from Indian authorities.
            </li>
          </ul>
        </Section>

        <Section title="7. Contact">
          <p>
            For any privacy-related questions, data deletion requests, or concerns, please contact us:
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:contact@awe-os.com" className="text-blue-600 hover:underline">
              contact@awe-os.com
            </a>
          </p>
          <p>
            <strong>Contact form:</strong>{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              awe-os.com/contact
            </a>
          </p>
          <p>We aim to respond to all privacy enquiries within 5 business days.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &quot;Last updated&quot; date at the top of this page. We encourage you to review this
            page periodically.
          </p>
          <p>
            Because we do not hold your email address (unless you contacted us), we cannot notify
            you of changes directly. Continued use of AWE-OS after a policy update constitutes
            your acceptance of the revised policy.
          </p>
        </Section>
      </div>
    </>
  )
}
