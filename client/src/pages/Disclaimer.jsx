import PolicyLayout from '../components/policy/PolicyLayout'
import content from '../content/policies/disclaimer'

export default function Disclaimer() {
  return <PolicyLayout {...content} canonicalPath="/disclaimer" />
}
