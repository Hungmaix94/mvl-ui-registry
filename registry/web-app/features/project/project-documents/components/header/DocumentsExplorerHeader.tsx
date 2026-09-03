import { cn } from '@/utils'
import DocumentsExplorerBreadcrumb, {
  type DocumentPathItem,
} from './DocumentsExplorerBreadcrumb.tsx'
import DocumentsExplorerHeaderActions from './DocumentsExplorerHeaderActions.tsx'
import type { ProjectDocumentDisplayPriority } from '../sort-dropdown/DocumentSortDropdown.tsx'
import type {
  ProjectDocumentSortOption,
  ProjectDocumentViewMode,
} from '@/constants/project-document'

export type { DocumentPathItem } from './DocumentsExplorerBreadcrumb.tsx'

type ProjectDocumentsExplorerHeaderProps = {
  path: DocumentPathItem[]
  onNavigatePath: (index: number) => void
  sortOption: ProjectDocumentSortOption
  onSortOptionChange: (value: ProjectDocumentSortOption) => void
  sortOpen: boolean
  onSortOpenChange: (open: boolean) => void
  viewMode: ProjectDocumentViewMode
  onViewModeChange: (mode: ProjectDocumentViewMode) => void
  isDetailOpen: boolean
  onToggleDetail: () => void
  displayPriority: ProjectDocumentDisplayPriority
  onDisplayPriorityChange: (value: ProjectDocumentDisplayPriority) => void
  isSortDisabled?: boolean
  selectedCount?: number
  shareableCount?: number
  deletableCount?: number
  onDelete?: () => void
  onShare?: () => void
  onEditSelectedFile?: () => void
  canEditSelectedFile?: boolean
  selectionLabel?: string | null
  dragOverBreadcrumbIndex?: number | null
  onBreadcrumbDragOver?: (segment: DocumentPathItem, index: number) => void
  onBreadcrumbDragLeave?: (segment: DocumentPathItem, index: number) => void
  onBreadcrumbDrop?: (segment: DocumentPathItem, index: number) => void
}

export default function DocumentsExplorerHeader({
  path,
  onNavigatePath,
  sortOption,
  onSortOptionChange,
  sortOpen,
  onSortOpenChange,
  viewMode,
  onViewModeChange,
  isDetailOpen,
  onToggleDetail,
  displayPriority,
  onDisplayPriorityChange,
  isSortDisabled = false,
  selectedCount = 0,
  shareableCount = 0,
  deletableCount = 0,
  onDelete,
  onShare,
  onEditSelectedFile,
  canEditSelectedFile = false,
  selectionLabel,
  dragOverBreadcrumbIndex,
  onBreadcrumbDragOver,
  onBreadcrumbDragLeave,
  onBreadcrumbDrop,
}: ProjectDocumentsExplorerHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', 'px-7', 'w-full')}>
      <DocumentsExplorerBreadcrumb
        path={path}
        onNavigatePath={onNavigatePath}
        dragOverBreadcrumbIndex={dragOverBreadcrumbIndex}
        onBreadcrumbDragOver={onBreadcrumbDragOver}
        onBreadcrumbDragLeave={onBreadcrumbDragLeave}
        onBreadcrumbDrop={onBreadcrumbDrop}
      />

      <DocumentsExplorerHeaderActions
        sortOption={sortOption}
        onSortOptionChange={onSortOptionChange}
        sortOpen={sortOpen}
        onSortOpenChange={onSortOpenChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        isDetailOpen={isDetailOpen}
        onToggleDetail={onToggleDetail}
        displayPriority={displayPriority}
        onDisplayPriorityChange={onDisplayPriorityChange}
        isSortDisabled={isSortDisabled}
        selectedCount={selectedCount}
        shareableCount={shareableCount}
        deletableCount={deletableCount}
        onDelete={onDelete}
        onShare={onShare}
        onEditSelectedFile={onEditSelectedFile}
        canEditSelectedFile={canEditSelectedFile}
        selectionLabel={selectionLabel}
      />
    </div>
  )
}
