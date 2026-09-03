import { cn } from '@/utils'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { DATETIME_FORMAT } from '@/constants/date-format'
import { formatDate } from '@/utils/date-utils'
import { IconBookmarksimple } from '@/assets/icons'
import DocumentIconTypeFile from '@/features/project/_shares/components/DocumentIconTypeFile.svg'
import DocumentIconTypeFolder from '@/features/project/_shares/components/DocumentIconTypeFolder.svg'
import BookmarkSimpleSvg from '@/features/project/_shares/components/BookmarkSimple.svg'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type DocumentModeListItemProps = {
  item: RealestateLibraryFileRead
  isSelected: boolean
  isImportant: boolean
  isPendingDelete?: boolean
  isDragOverTarget?: boolean
  onItemClick: (event: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onToggleImportant: (value: boolean) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver?: (event: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop: (event: React.DragEvent) => void
}

export default function DocumentModeListItem({
  item,
  isSelected,
  isImportant,
  isPendingDelete = false,
  isDragOverTarget = false,
  onItemClick,
  onDoubleClick,
  onContextMenu,
  onToggleImportant,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: DocumentModeListItemProps) {
  const isFolder = item.node_type === ElibraryNodeType.folder
  const categoryLabel = item.category_name?.trim() ? item.category_name : '-'

  return (
    <button
      type="button"
      draggable
      data-document-item="true"
      data-document-id={item.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onItemClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(e)
      }}
      className={cn(
        'w-full',
        'text-left',
        'group',
        'grid grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_minmax(180px,1fr)_220px] gap-2',
        'px-3 py-4',
        'border-border-1 border-t',
        'transition-opacity duration-200',
        isPendingDelete && 'pointer-events-none opacity-40',
        isDragOverTarget
          ? 'border-action-primary-red-default bg-data-light-grey-hover border-2'
          : isSelected
            ? 'bg-background-3'
            : 'hover:bg-data-light-grey-hover'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={isFolder ? DocumentIconTypeFolder : DocumentIconTypeFile}
          alt={isFolder ? 'Thư mục' : 'Tệp'}
          className="h-5 w-5 shrink-0"
        />
        <span
          className="text-content-dark-1 typo-body-sm-medium min-w-0 flex-1 truncate"
          title={item.name}
        >
          {item.name}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-pressed={isImportant}
          aria-label={isImportant ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu quan trọng'}
          title={
            isImportant ? 'Ấn vào để: Bỏ đánh dấu quan trọng' : 'Ấn vào để: Đánh dấu quan trọng'
          }
          className={cn(
            'shrink-0',
            'transition-opacity duration-300 hover:opacity-90',
            isImportant
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleImportant(!isImportant)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            onToggleImportant(!isImportant)
          }}
        >
          {isImportant ? (
            <img src={BookmarkSimpleSvg} alt="Đã đánh dấu quan trọng" className="h-6 w-6" />
          ) : (
            <IconBookmarksimple size={24} color="var(--color-action-primary-red-default)" />
          )}
        </span>
      </div>
      <span
        className="text-content-dark-3 typo-body-sm-medium truncate text-start"
        title={categoryLabel === '-' ? undefined : categoryLabel}
      >
        {categoryLabel}
      </span>
      <span className="text-content-dark-3 typo-body-sm-medium">
        {formatDate(item.created_at, DATETIME_FORMAT)}
      </span>
      <span className="text-content-dark-3 typo-body-sm-medium">
        {formatDate(item.updated_at, DATETIME_FORMAT)}
      </span>
    </button>
  )
}
