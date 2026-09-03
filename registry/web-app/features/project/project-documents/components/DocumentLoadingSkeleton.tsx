import { Skeleton } from '@radix-ui/themes'
import { cn } from '@/utils'

type ProjectDocumentsSkeletonProps = {
  isGrid: boolean
}

export default function DocumentLoadingSkeleton({ isGrid }: ProjectDocumentsSkeletonProps) {
  if (!isGrid) {
    const listSkeletonItems = Array.from({ length: 5 }, (_, index) => `list-skeleton-${index}`)

    return (
      <div className="space-y-2 p-4">
        {listSkeletonItems.map((key) => (
          <Skeleton key={key} className="h-10 w-full rounded-[4px]" />
        ))}
      </div>
    )
  }

  const gridSkeletonItems = Array.from({ length: 6 }, (_, index) => `grid-skeleton-${index}`)

  return (
    <div className="flex flex-wrap gap-3">
      {gridSkeletonItems.map((key) => (
        <div
          key={key}
          className={cn(
            'flex flex-col items-center',
            // 'border-border-1 border',
            'rounded-sm',
            'bg-background-2',
            'w-full sm:w-[130px]',
            'p-4'
          )}
        >
          <Skeleton className="mb-3 h-4 w-full rounded-[4px]" />
          <Skeleton className="mb-3 h-4 w-full rounded-[4px]" />
          <Skeleton className="mb-3 h-4 w-full rounded-[4px]" />
          <Skeleton className="h-3 w-full rounded-[4px]" />
        </div>
      ))}
    </div>
  )
}
