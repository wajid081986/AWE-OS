import PolicyLayout from '../components/policy/PolicyLayout'
import content from '../content/policies/privacyPolicy'

export default function PrivacyPolicy() {
  return <PolicyLayout {...content} canonicalPath="/privacy-policy" />
}
