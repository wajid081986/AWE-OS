function SkeletonBox({ className = '' }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
  )
}

export function ToolCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonBox className="h-3 w-full" />
      <SkeletonBox className="h-3 w-5/6" />
      <div className="flex items-center justify-between mt-1">
        <SkeletonBox className="h-5 w-20 rounded-full" />
        <SkeletonBox className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
      <SkeletonBox className="w-12 h-12 rounded-xl mb-4" />
      <SkeletonBox className="h-5 w-3/4 mb-2" />
      <SkeletonBox className="h-3 w-full" />
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
