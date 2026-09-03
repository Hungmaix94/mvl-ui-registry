import { cn } from '@/utils'
import { Button } from '@/components/ui'
import {
  IconListbullets,
  IconSquaresfour,
  IconCaretdoublevertical,
  IconSquarehalf,
  IconTrash,
  IconSharenetwork,
  IconPencilsimple,
} from '@/assets/icons'
import {
  PROJECT_DOCUMENT_VIEW_MODE,
  type ProjectDocumentViewMode,
  type ProjectDocumentSortOption,
} from '@/constants/project-document.ts'
import DocumentSortDropdown, {
  type ProjectDocumentDisplayPriority,
} from '../sort-dropdown/DocumentSortDropdown.tsx'
import { Separator } from '@radix-ui/themes'

type ProjectDocumentsExplorerHeaderActionsProps = {
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
}

export default function DocumentsExplorerHeaderActions({
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
}: ProjectDocumentsExplorerHeaderActionsProps) {
  const hasSelection = selectedCount > 0

  return (
    <div className="flex shrink-0 items-center gap-2">
      {hasSelection && (
        <>
          {selectionLabel && !isDetailOpen && (
            <span className="typo-body-sm text-content-dark-3 shrink-0">{selectionLabel}</span>
          )}

          <Separator orientation="vertical" />

          <div className="flex shrink-0 items-center">
            {canEditSelectedFile && (
              <Button
                variant="text"
                size="medium"
                leftIcon={<IconPencilsimple size={16} />}
                iconOnly
                title="Chỉnh sửa thông tin tài liệu"
                className={cn(
                  'typo-body-xs-regular',
                  'text-content-dark-3 hover:text-content-dark-1'
                )}
                onClick={onEditSelectedFile}
              />
            )}
            {shareableCount > 0 && (
              <Button
                variant="text"
                size="medium"
                leftIcon={<IconSharenetwork size={16} />}
                title={`Chia sẻ ${shareableCount} tệp đang chọn\n(Không hỗ trợ chia sẻ folder)`}
                className={cn(
                  'typo-body-xs-regular',
                  'text-content-dark-3 hover:text-content-dark-1',
                  'gap-0'
                )}
                onClick={onShare}
              >
                {`(${shareableCount})`}
              </Button>
            )}
            {deletableCount > 0 && (
              <Button
                variant="text"
                size="medium"
                leftIcon={<IconTrash size={16} />}
                onClick={onDelete}
                title={`Xóa ${deletableCount} mục đang chọn`}
                className={cn('typo-body-xs-regular', 'gap-0')}
              >
                {`(${deletableCount})`}
              </Button>
            )}
          </div>

          <Separator orientation="vertical" />
        </>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            size="medium"
            iconOnly
            leftIcon={<IconSquaresfour size={24} />}
            className={cn(
              'size-10 rounded-sm',
              'text-content-dark-3 hover:text-content-dark-1',
              viewMode === PROJECT_DOCUMENT_VIEW_MODE.GRID
                ? 'bg-data-light-grey-hover text-content-dark-1'
                : 'bg-transparent'
            )}
            onClick={() => onViewModeChange(PROJECT_DOCUMENT_VIEW_MODE.GRID)}
            title="Hiển thị dạng lưới"
          />
          <Button
            variant="text"
            size="medium"
            title="Hiển thị dạng danh sách"
            iconOnly
            leftIcon={<IconListbullets size={24} />}
            showBackground
            className={cn(
              'size-10 rounded-sm',
              'text-content-dark-3 hover:text-content-dark-1',
              viewMode === PROJECT_DOCUMENT_VIEW_MODE.LIST
                ? 'bg-data-light-grey-hover text-content-dark-1'
                : 'bg-transparent'
            )}
            onClick={() => onViewModeChange(PROJECT_DOCUMENT_VIEW_MODE.LIST)}
          />
        </div>

        <Separator orientation="vertical" />

        <div className="relative" data-sort-dropdown>
          <Button
            variant="text"
            size="small"
            disabled={isSortDisabled}
            className={cn(
              'typo-body-sm-medium',
              'text-content-dark-3 hover:text-content-dark-1',
              'flex items-center justify-center gap-2',
              'text-center',
              'rounded-sm',
              'px-2 py-1'
            )}
            rightIcon={<IconCaretdoublevertical size={16} className="shrink-0" />}
            onClick={(e) => {
              e.stopPropagation()
              if (isSortDisabled) return
              onSortOpenChange(!sortOpen)
            }}
          >
            Sắp xếp theo
          </Button>
          <DocumentSortDropdown
            sortOption={sortOption}
            onSortOptionChange={onSortOptionChange}
            displayPriority={displayPriority}
            onDisplayPriorityChange={onDisplayPriorityChange}
            open={sortOpen}
            disabled={isSortDisabled}
          />
        </div>
      </div>

      <Separator orientation="vertical" />

      <Button
        variant="text"
        size="medium"
        title="Xem chi tiết"
        iconOnly
        leftIcon={<IconSquarehalf size={24} />}
        className={cn(
          'size-10 rounded-sm',
          'text-content-dark-3 hover:text-content-dark-1',
          isDetailOpen ? 'bg-data-light-grey-hover text-content-dark-1' : 'bg-transparent'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleDetail()
        }}
      />
    </div>
  )
}
