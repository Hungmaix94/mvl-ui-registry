import type { RealestateLibraryFileRead } from '@/services/document-service'
import DocumentGridItem from '@/features/project/project-documents/components/view-mode/grid/DocumentGridItem.tsx'
import { cn } from '@/utils'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type ProjectDocumentsGridProps = {
  items: RealestateLibraryFileRead[]
  isSelected: (id: number) => boolean
  importantById: Record<number, boolean>
  pendingDeleteIds?: number[]
  dragOverFolderId?: number | null
  onFolderDragOver?: (id: number) => void
  onFolderDragLeave?: (id: number) => void
  onItemClick: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  handleSelect: (id: number, options: { ctrlKey: boolean; shiftKey: boolean }) => void
  onOpenFolder: (item: RealestateLibraryFileRead) => void
  onItemContextMenu: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  setDraggingItemId: (id: number | null) => void
  onMoveItemToFolder: (targetFolder: RealestateLibraryFileRead) => void
  onToggleItemImportant: (itemId: number, value?: boolean) => void
  onOpenItemOptionsMenu: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
}

export default function DocumentGrid({
  items,
  isSelected,
  importantById,
  pendingDeleteIds = [],
  dragOverFolderId = null,
  onFolderDragOver,
  onFolderDragLeave,
  onItemClick,
  handleSelect,
  onOpenFolder,
  onItemContextMenu,
  setDraggingItemId,
  onMoveItemToFolder,
  onToggleItemImportant,
  onOpenItemOptionsMenu,
}: ProjectDocumentsGridProps) {
  return (
    <div className={cn('flex flex-wrap gap-2')}>
      {items.map((item) => (
        <DocumentGridItem
          key={item.id}
          item={item}
          isSelected={isSelected(item.id)}
          isImportant={importantById[item.id] ?? false}
          isPendingDelete={pendingDeleteIds.includes(item.id)}
          isDragOverTarget={dragOverFolderId === item.id}
          onSelect={(e) => onItemClick(item, e)}
          onSelectKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSelect(item.id, { ctrlKey: false, shiftKey: false })
            }
          }}
          onDoubleClick={() => onOpenFolder(item)}
          onContextMenu={(e) => onItemContextMenu(item, e)}
          onDragStart={() => setDraggingItemId(item.id)}
          onDragEnd={() => setDraggingItemId(null)}
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
          onToggleImportant={(value) => onToggleItemImportant(item.id, value)}
          onOpenOptionsMenu={(e) => onOpenItemOptionsMenu(item, e)}
        />
      ))}
    </div>
  )
}
