function SkeletonBox({ className = '' }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
  )
}

export function ToolCardSkeleton() {
  return (
    <div className="h-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start gap-3">
        <SkeletonBox className="w-9 h-9 rounded-lg shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <SkeletonBox className="h-5 w-20 rounded-full" />
        <SkeletonBox className="h-5 w-16 rounded-full ml-auto" />
      </div>
    </div>
  )
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
      <SkeletonBox className="w-12 h-12 rounded-xl mb-4" />
      <SkeletonBox className="h-5 w-3/4 mb-2" />
      <SkeletonBox className="h-3 w-full mb-1" />
      <SkeletonBox className="h-3 w-5/6" />
    </div>
  )
}

export default function LoadingSkeleton({ count = 6, type = 'tool' }) {
  const Comp = type === 'category' ? CategoryCardSkeleton : ToolCardSkeleton
  return (
    <div className={`grid gap-4 ${type === 'category' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, i) => <Comp key={i} />)}
    </div>
  )
}
