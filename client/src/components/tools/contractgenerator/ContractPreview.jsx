const STATUS_CONFIG = {
  pass:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  warning: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  text: 'text-yellow-300',  badge: 'bg-yellow-500/20 text-yellow-300'  },
  info:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300'    },
}

function ComplianceItem({ item }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.info
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-white">{item.title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {item.category}
          </span>
          {item.actionRequired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-medium">
              Action Required
            </span>
          )}
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{item.description}</p>
      </div>
    </div>
  )
}

export default function ContractPreview({ contractData, complianceResults }) {
  if (!contractData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">📄</p>
        <p className="text-sm">Complete all steps to preview your contract</p>
      </div>
    )
  }

  const warnings = (complianceResults || []).filter(r => r.status === 'warning').length
  const passes   = (complianceResults || []).filter(r => r.status === 'pass').length

  return (
    <div className="space-y-6">
      {/* Compliance Summary */}
      {complianceResults && complianceResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Indian Legal Compliance Check</h3>
            <div className="flex gap-2 text-xs">
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{passes} passed</span>
              {warnings > 0 && (
                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">{warnings} warnings</span>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {complianceResults.map(item => (
              <ComplianceItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Contract Preview */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Contract Preview</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Preview header */}
          <div className="bg-gray-900 px-6 py-5 text-center border-b border-white/10">
            <p className="text-base font-bold text-white tracking-wide">{contractData.title}</p>
            <p className="text-xs text-gray-400 mt-1">{contractData.subtitle}</p>
          </div>

          {/* Sections */}
          <div className="px-6 py-5 space-y-5 max-h-96 overflow-y-auto">
            {contractData.sections.map((section, i) => (
              <div key={i}>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  {section.sectionTitle}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))}

            {/* Signature placeholder */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SIGNATURES</p>
              <div className="grid grid-cols-2 gap-6 text-xs text-gray-400">
                <div className="space-y-2">
                  <p className="font-medium text-gray-300">Service Provider / Party A</p>
                  <p>Name: _____________________</p>
                  <p>Signature: _____________________</p>
                  <p>Date: _____________________</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-300">Client / Party B</p>
                  <p>Name: _____________________</p>
                  <p>Signature: _____________________</p>
                  <p>Date: _____________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          ↑ Scroll to read the full contract • The PDF will be professionally formatted on A4
        </p>
      </div>
    </div>
  )
}
