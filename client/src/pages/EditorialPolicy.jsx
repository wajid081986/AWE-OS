import PolicyLayout from '../components/policy/PolicyLayout'
import content from '../content/policies/editorialPolicy'

export default function EditorialPolicy() {
  return <PolicyLayout {...content} canonicalPath="/editorial-policy" />
}
