import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import { IconCaretright } from '@/assets/icons'

export type DocumentPathItem = {
  id: number | null
  label: string
}

type ProjectDocumentsExplorerBreadcrumbProps = {
  path: DocumentPathItem[]
  onNavigatePath: (index: number) => void
  dragOverBreadcrumbIndex?: number | null
  onBreadcrumbDragOver?: (segment: DocumentPathItem, index: number) => void
  onBreadcrumbDragLeave?: (segment: DocumentPathItem, index: number) => void
  onBreadcrumbDrop?: (segment: DocumentPathItem, index: number) => void
}

export default function DocumentsExplorerBreadcrumb({
  path,
  onNavigatePath,
  dragOverBreadcrumbIndex = null,
  onBreadcrumbDragOver,
  onBreadcrumbDragLeave,
  onBreadcrumbDrop,
}: ProjectDocumentsExplorerBreadcrumbProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {path.map((segment, index) => {
        const isLast = index === path.length - 1
        const isDragOver = dragOverBreadcrumbIndex === index

        return (
          <button
            key={`${segment.id ?? 'root'}-${index}`}
            type="button"
            draggable={false}
            className={cn(
              'typo-body-sm-medium rounded-sm px-1 transition-colors',
              isDragOver
                ? 'bg-data-light-grey-hover text-content-dark-1 ring-action-primary-red-default ring-1'
                : isLast
                  ? 'text-data-red-default'
                  : 'text-content-dark-3 hover:text-content-dark-1'
            )}
            onClick={() => onNavigatePath(index)}
            onDragOver={(e) => {
              e.preventDefault()
              onBreadcrumbDragOver?.(segment, index)
            }}
            onDragLeave={() => onBreadcrumbDragLeave?.(segment, index)}
            onDrop={(e) => {
              e.preventDefault()
              onBreadcrumbDrop?.(segment, index)
            }}
          >
            <Flex className="items-center italic">
              {index > 0 && <IconCaretright className="text-content-dark-3 mr-2" size={14} />}
              {segment.label}
            </Flex>
          </button>
        )
      })}
    </div>
  )
}
