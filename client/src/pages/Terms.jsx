import { Helmet } from 'react-helmet-async'

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — AWE-OS</title>
        <meta name="description" content="AWE-OS Terms of Service — rules for using our platform, your rights, and our responsibilities." />
        <link rel="canonical" href="https://awe-os.com/terms" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-sm text-gray-400">Last updated: May 8, 2026</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using AWE-OS (&quot;Service&quot;, &quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use AWE-OS.</p>
          <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via email to registered users. Continued use after changes constitutes acceptance.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>AWE-OS provides a collection of free and premium AI-powered tools, converters, calculators and digital products accessible via the web. Features may be added, modified or discontinued at our discretion.</p>
          <p>While we strive for 99.9% uptime, we do not guarantee uninterrupted access to the Service. We are not liable for service interruptions outside our reasonable control.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>Some features require creating an account. You agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate, current and complete information during registration</li>
            <li>Maintain the security of your password and notify us immediately of any breach</li>
            <li>Be responsible for all activity under your account</li>
            <li>Not share your account credentials with any third party</li>
            <li>Be at least 13 years old (or the minimum age in your jurisdiction)</li>
          </ul>
        </Section>

        <Section title="4. Permitted Use">
          <p>You may use AWE-OS for lawful personal and commercial purposes. You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Service for illegal activities or to violate any applicable law</li>
            <li>Infringe intellectual property rights of AWE-OS or third parties</li>
            <li>Submit malicious code, viruses, or disruptive content</li>
            <li>Attempt to gain unauthorised access to our systems</li>
            <li>Scrape, crawl or bot-access the Service without prior written consent</li>
            <li>Use the Service to generate spam, misinformation, or harmful content</li>
            <li>Resell or commercialise the Service itself without our permission</li>
            <li>Use automated tools to exceed normal human usage rates</li>
          </ul>
        </Section>

        <Section title="5. Tool Usage Rules">
          <p>When using AI-powered tools:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for the accuracy and appropriateness of inputs you provide</li>
            <li>AI outputs are provided as-is and may not always be accurate — always review before use</li>
            <li>You must not use AI tools to generate content that is defamatory, discriminatory or illegal</li>
            <li>Tool outputs generated using our platform belong to you, subject to any third-party AI model terms</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          <p>All content on AWE-OS — including the platform design, tool interfaces, code, brand identity and original text — is the property of AWE-OS and protected by copyright law.</p>
          <p>You retain ownership of content you input into our tools. By using our tools, you grant us a limited, non-exclusive licence to process your inputs solely to deliver the requested service.</p>
          <p>You may not reproduce, distribute or create derivative works from AWE-OS content without written permission.</p>
        </Section>

        <Section title="7. Free vs Premium Features">
          <p>Free tier usage is subject to fair-use limits. We reserve the right to throttle or restrict access if usage significantly exceeds reasonable personal use.</p>
          <p>Premium subscriptions are billed monthly or annually. Refunds are provided within 7 days of purchase if the service is materially deficient. Subscription cancellations take effect at the end of the current billing period.</p>
        </Section>

        <Section title="8. Advertising">
          <p>AWE-OS displays third-party advertisements via Google AdSense. We are not responsible for the content of these advertisements. Clicking on ads may take you to third-party websites; their terms and privacy policies apply.</p>
          <p>We do not endorse products or services advertised on our platform.</p>
        </Section>

        <Section title="9. Disclaimers">
          <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We disclaim all warranties including merchantability, fitness for a particular purpose and non-infringement.</p>
          <p>AI-generated content is not guaranteed to be accurate, complete or suitable for any particular purpose. You should independently verify AI outputs before acting on them.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by law, AWE-OS and its affiliates shall not be liable for any indirect, incidental, special, consequential or punitive damages arising from your use of the Service, including but not limited to lost profits, data loss or business interruption.</p>
          <p>Our total liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim, or INR 500, whichever is greater.</p>
        </Section>

        <Section title="11. Termination">
          <p>We may suspend or terminate your account at any time if you violate these Terms. You may delete your account at any time from account settings.</p>
          <p>Upon termination, your right to access the Service ceases immediately. Provisions relating to intellectual property, disclaimers and limitation of liability survive termination.</p>
        </Section>

        <Section title="12. Governing Law">
          <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.</p>
        </Section>

        <Section title="13. Contact">
          <p>For questions about these Terms:</p>
          <p><strong>Email:</strong> <a href="mailto:legal@awe-os.com" className="text-blue-600 hover:underline">legal@awe-os.com</a></p>
          <p><strong>Website:</strong> <a href="/contact" className="text-blue-600 hover:underline">awe-os.com/contact</a></p>
        </Section>
      </div>
    </>
  )
}
