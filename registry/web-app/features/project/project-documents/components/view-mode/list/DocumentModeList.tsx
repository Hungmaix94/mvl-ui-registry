import type { RealestateLibraryFileRead } from '@/services/document-service'
import DocumentModeListItem from './DocumentModeListItem'
import { cn } from '@/utils'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type DocumentModeListProps = {
  items: RealestateLibraryFileRead[]
  isSelected: (id: number) => boolean
  importantById: Record<number, boolean>
  pendingDeleteIds?: number[]
  dragOverFolderId?: number | null
  onFolderDragOver?: (id: number) => void
  onFolderDragLeave?: (id: number) => void
  onItemClick: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  onOpenFolder: (item: RealestateLibraryFileRead) => void
  onItemContextMenu: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  setDraggingItemId: (id: number | null) => void
  onMoveItemToFolder: (targetFolder: RealestateLibraryFileRead) => void
  onToggleItemImportant: (itemId: number, value?: boolean) => void
}

export default function DocumentModeList({
  items,
  isSelected,
  importantById,
  pendingDeleteIds = [],
  dragOverFolderId = null,
  onFolderDragOver,
  onFolderDragLeave,
  onItemClick,
  onOpenFolder,
  onItemContextMenu,
  setDraggingItemId,
  onMoveItemToFolder,
  onToggleItemImportant,
}: DocumentModeListProps) {
  return (
    <>
      <div
        className={cn(
          'bg-background-2',
          'grid gap-2',
          'grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_minmax(180px,1fr)_220px]',
          'px-3 py-2',
          'sticky top-0',
          'border-border-1 rounded-br-0 rounded rounded-bl-none border border-b-0'
        )}
      >
        <span className="typo-body-base text-content-dark-2">Tên</span>
        <span className="typo-body-base text-content-dark-2 text-start">Danh mục</span>
        <span className="typo-body-base text-content-dark-2">Ngày tạo</span>
        <span className="typo-body-base text-content-dark-2">Lần cuối cập nhật</span>
      </div>
      <div className="border-border-1 rounded-tr-0 overflow-hidden rounded rounded-tl-none border">
        {items.map((item) => (
          <DocumentModeListItem
            key={item.id}
            item={item}
            isSelected={isSelected(item.id)}
            isImportant={importantById[item.id] ?? false}
            isPendingDelete={pendingDeleteIds.includes(item.id)}
            isDragOverTarget={dragOverFolderId === item.id}
            onItemClick={(e) => onItemClick(item, e)}
            onDoubleClick={() => onOpenFolder(item)}
            onContextMenu={(e) => onItemContextMenu(item, e)}
            onDragStart={() => setDraggingItemId(item.id)}
            onDragEnd={() => setDraggingItemId(null)}
            onToggleImportant={(value) => onToggleItemImportant(item.id, value)}
            onDragOver={(e) => {
              if (item.node_type !== ElibraryNodeType.folder) return
              e.preventDefault()
              onFolderDragOver?.(item.id)
            }}
            onDragLeave={() => onFolderDragLeave?.(item.id)}
            onDrop={(e) => {
              e.preventDefault()
              void onMoveItemToFolder(item)
            }}
          />
        ))}
      </div>
    </>
  )
}
