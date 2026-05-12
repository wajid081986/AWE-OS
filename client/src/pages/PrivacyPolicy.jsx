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
        <meta name="description"         content="AWE-OS Privacy Policy — how we collect, use and protect your data. GDPR compliant." />
        <link rel="canonical"            href="https://awe-os.com/privacy-policy" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="Privacy Policy — AWE-OS" />
        <meta property="og:description"  content="AWE-OS Privacy Policy — how we collect, use and protect your data. GDPR compliant." />
        <meta property="og:url"          content="https://awe-os.com/privacy-policy" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://awe-os.com/og-image.svg" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="AWE-OS Privacy Policy" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="Privacy Policy — AWE-OS" />
        <meta name="twitter:description" content="AWE-OS Privacy Policy — how we collect, use and protect your data. GDPR compliant." />
        <meta name="twitter:image"       content="https://awe-os.com/og-image.svg" />
        <meta name="twitter:image:alt"   content="AWE-OS Privacy Policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Last updated: May 8, 2026</p>
        </div>

        <Section title="1. Introduction">
          <p>AWE-OS (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose and safeguard your information when you visit our website awe-os.com and use our services.</p>
          <p>By using AWE-OS, you consent to the data practices described in this Policy. If you do not agree, please do not use our services.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong>Account Information:</strong> When you register, we collect your name, email address and a hashed password. We never store your plain-text password.</p>
          <p><strong>Usage Data:</strong> We collect anonymous data about how you use our tools — which tools you use, how often and from which country — to improve our services. This data is never linked to your identity without consent.</p>
          <p><strong>Tool Inputs:</strong> Inputs you enter into our tools are processed to deliver results. We do not store these inputs unless you are logged in and explicitly save your work.</p>
          <p><strong>Device & Log Data:</strong> We automatically collect IP address, browser type, pages visited, referring URLs and timestamps for security and analytics purposes.</p>
          <p><strong>Cookies:</strong> We use cookies to maintain session state and remember preferences. See Section 8 for details.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use the data we collect to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Deliver, operate and improve AWE-OS services</li>
            <li>Maintain account security and prevent fraud</li>
            <li>Personalise your experience and remember your preferences</li>
            <li>Send transactional emails (account verification, password reset)</li>
            <li>Analyse aggregate usage patterns to develop new tools</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We <strong>do not</strong> sell your personal data to third parties under any circumstances.</p>
        </Section>

        <Section title="4. Google AdSense & Advertising">
          <p>AWE-OS uses Google AdSense to display advertisements. Google may use cookies and similar technologies to personalise ads based on your browsing activity across websites.</p>
          <p>Google&apos;s use of advertising cookies enables it and its partners to serve ads based on your visit to AWE-OS and other sites on the Internet. You can opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>
          <p>For more information, see <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</p>
        </Section>

        <Section title="5. Data Sharing & Third Parties">
          <p>We may share your data with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — our database and authentication provider (EU data residency available)</li>
            <li><strong>OpenAI</strong> — to process AI tool requests (inputs are subject to OpenAI&apos;s data retention policy)</li>
            <li><strong>Razorpay</strong> — for payment processing (credit card data never touches our servers)</li>
            <li><strong>AWS</strong> — for file storage (encrypted at rest)</li>
            <li><strong>Google Analytics / AdSense</strong> — for analytics and advertising</li>
            <li><strong>Law enforcement</strong> — when legally required to do so</li>
          </ul>
        </Section>

        <Section title="6. Your Rights (GDPR)">
          <p>If you are located in the European Economic Area, you have the following rights under the GDPR:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Restriction:</strong> Request that we restrict processing of your data</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:privacy@awe-os.com" className="text-blue-600 hover:underline">privacy@awe-os.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="7. Data Security">
          <p>We implement industry-standard security measures including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>TLS/SSL encryption for all data in transit</li>
            <li>AES-256 encryption for sensitive data at rest</li>
            <li>bcrypt hashing for all passwords</li>
            <li>JWT token blacklisting and automatic expiry</li>
            <li>Regular security audits and penetration testing</li>
          </ul>
          <p>No method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but are committed to using best practices.</p>
        </Section>

        <Section title="8. Cookie Policy">
          <p>We use the following types of cookies:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Essential cookies:</strong> Required for the website to function (session management, CSRF protection). Cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors use the site (Google Analytics). Can be opted out.</li>
            <li><strong>Advertising cookies:</strong> Used by Google AdSense to serve relevant ads. Can be opted out via Google Ads Settings.</li>
          </ul>
          <p>You can control cookies through your browser settings. Disabling essential cookies may affect site functionality.</p>
        </Section>

        <Section title="9. Data Retention">
          <p>We retain personal data for as long as your account is active or as needed to provide services. You may delete your account at any time, and we will erase your personal data within 30 days, except where retention is required by law.</p>
          <p>Anonymous usage analytics are retained for up to 24 months for aggregate trend analysis.</p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>AWE-OS is not directed to children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us personal information, please contact us immediately and we will delete it.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this Privacy Policy periodically. We will notify registered users of material changes by email. Continued use of AWE-OS after changes constitutes acceptance of the updated Policy.</p>
        </Section>

        <Section title="12. Contact">
          <p>For privacy-related questions or requests, contact us at:</p>
          <p><strong>Email:</strong> <a href="mailto:privacy@awe-os.com" className="text-blue-600 hover:underline">privacy@awe-os.com</a></p>
          <p><strong>Website:</strong> <a href="/contact" className="text-blue-600 hover:underline">awe-os.com/contact</a></p>
        </Section>
      </div>
    </>
  )
}
