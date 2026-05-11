export default function ToolBadge({ isPremium = false, isNew = false, isAI = false }) {
  if (isPremium) {
    return (
      <span className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
        ⭐ Premium Tool
      </span>
    )
  }
  if (isAI) {
    return (
      <span className="inline-flex items-center gap-1 mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-medium">
        ✨ AI-Powered · Free · No sign-up
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full font-medium">
      ✓ Free · No sign-up · Works in browser
    </span>
  )
}
