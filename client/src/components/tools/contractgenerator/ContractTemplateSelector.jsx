const CONTRACT_TYPES = [
  {
    id: 'NDA',
    icon: '🔒',
    title: 'NDA',
    subtitle: 'Non-Disclosure Agreement',
    description: 'Protect confidential information shared during business discussions, partnerships, or pre-contract negotiations.',
    tags: ['Confidentiality', 'Privacy', 'IP Protection'],
    color: 'from-violet-500/20 to-purple-600/20',
    border: 'border-violet-500/40',
    ring: 'ring-violet-500',
    dot: 'bg-violet-400',
  },
  {
    id: 'Service Agreement',
    icon: '📋',
    title: 'Service Agreement',
    subtitle: 'Professional Services Contract',
    description: 'Define scope, payment terms, deliverables, and IP rights for freelance or consulting engagements.',
    tags: ['Freelance', 'Consulting', 'Project Work'],
    color: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/40',
    ring: 'ring-blue-500',
    dot: 'bg-blue-400',
  },
  {
    id: 'Employment Contract',
    icon: '👔',
    title: 'Employment Contract',
    subtitle: 'Consulting / Employment Agreement',
    description: 'Formalise full-time, part-time, or consulting engagements with clear terms for both employer and employee.',
    tags: ['Employment', 'Consulting', 'Fixed-Term'],
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/40',
    ring: 'ring-emerald-500',
    dot: 'bg-emerald-400',
  },
]

export default function ContractTemplateSelector({ value, onChange, error }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Select Contract Type <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CONTRACT_TYPES.map(ct => {
          const selected = value === ct.id
          return (
            <button
              key={ct.id}
              type="button"
              onClick={() => onChange(ct.id)}
              className={`
                text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer
                bg-gradient-to-br ${ct.color}
                ${selected
                  ? `${ct.border} ring-2 ${ct.ring} shadow-lg shadow-white/5 scale-[1.02]`
                  : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
                }
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{ct.icon}</span>
                {selected && (
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 ${ct.dot} shadow-lg`} />
                )}
              </div>
              <p className="font-semibold text-white mb-0.5">{ct.title}</p>
              <p className="text-xs text-gray-400 mb-3">{ct.subtitle}</p>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">{ct.description}</p>
              <div className="flex flex-wrap gap-1">
                {ct.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
