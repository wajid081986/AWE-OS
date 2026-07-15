import PolicyLayout from '../components/policy/PolicyLayout'
import content from '../content/policies/termsOfUse'

export default function Terms() {
  return <PolicyLayout {...content} canonicalPath="/terms" />
}
