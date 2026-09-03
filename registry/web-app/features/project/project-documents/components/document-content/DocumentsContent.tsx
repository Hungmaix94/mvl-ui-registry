import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/utils'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { PROJECT_DOCUMENT_VIEW_MODE } from '@/constants/project-document.ts'
import DocumentLoadingSkeleton from '../DocumentLoadingSkeleton.tsx'
import DocumentContentEmpty from './DocumentContentEmpty.tsx'
import DocumentGrid from '../view-mode/grid/DocumentGrid.tsx'
import DocumentModeList from '../view-mode/list/DocumentModeList.tsx'
import { Loading } from '@/components/Loading.tsx'
import { TableNoData } from '@/components/ui/table/TableNoData.tsx'

type ProjectDocumentsContentProps = {
  isLoading: boolean
  items: RealestateLibraryFileRead[]
  isFetching: boolean
  viewMode: string
  dragOverCanvas: boolean
  importantById: Record<number, boolean>
  onScroll: () => void
  onCanvasClick: (event: React.MouseEvent) => void
  onCanvasContextMenu: (event: React.MouseEvent) => void
  onDragOver: (event: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  isSelected: (id: number) => boolean
  handleSelect: (id: number, options: { ctrlKey: boolean; shiftKey: boolean }) => void
  onItemClick: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  onOpenFolder: (item: RealestateLibraryFileRead) => void
  onItemContextMenu: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  setDraggingItemId: (id: number | null) => void
  onMoveItemToFolder: (targetFolder: RealestateLibraryFileRead) => void
  onToggleItemImportant: (itemId: number, value?: boolean) => void
  onOpenItemOptionsMenu: (item: RealestateLibraryFileRead, event: React.MouseEvent) => void
  onCreateFolder: () => void
  onCreateDocument: () => void
  canCreateFolder?: boolean
  canUploadDocument?: boolean
  hasActiveFilter: boolean
  isFilterTransitioning: boolean
  onClearFilter: () => void
  onMarqueeSelect: (ids: number[], options: { append: boolean }) => void
  pendingDeleteIds?: number[]
  dragOverFolderId?: number | null
  onFolderDragOver?: (id: number) => void
  onFolderDragLeave?: (id: number) => void
}

const DocumentsContent = forwardRef<HTMLDivElement, ProjectDocumentsContentProps>(
  (
    {
      isLoading,
      items,
      isFetching,
      viewMode,
      dragOverCanvas,
      importantById,
      onScroll,
      onCanvasClick,
      onCanvasContextMenu,
      onDragOver,
      onDragLeave,
      onDrop,
      isSelected,
      handleSelect,
      onItemClick,
      onOpenFolder,
      onItemContextMenu,
      setDraggingItemId,
      onMoveItemToFolder,
      onToggleItemImportant,
      onOpenItemOptionsMenu,
      onCreateFolder,
      onCreateDocument,
      canCreateFolder = true,
      canUploadDocument = true,
      hasActiveFilter,
      isFilterTransitioning,
      onClearFilter,
      onMarqueeSelect,
      pendingDeleteIds = [],
      dragOverFolderId = null,
      onFolderDragOver,
      onFolderDragLeave,
    },
    ref
  ) => {
    const localContainerRef = useRef<HTMLDivElement | null>(null)
    const [marqueeBox, setMarqueeBox] = useState<{
      left: number
      top: number
      width: number
      height: number
    } | null>(null)
    const dragStartClientRef = useRef<{ x: number; y: number } | null>(null)
    const dragCurrentClientRef = useRef<{ x: number; y: number } | null>(null)
    const dragAppendRef = useRef(false)
    const isDraggingRef = useRef(false)
    const ignoreNextCanvasClickRef = useRef(false)

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        localContainerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
          return
        }
        if (!ref) return
        ref.current = node
      },
      [ref]
    )

    const updateMarqueeBox = useCallback(() => {
      const container = localContainerRef.current
      const start = dragStartClientRef.current
      const current = dragCurrentClientRef.current
      if (!container || !start || !current) return
      const containerRect = container.getBoundingClientRect()
      const startX = start.x - containerRect.left + container.scrollLeft
      const startY = start.y - containerRect.top + container.scrollTop
      const currentX = current.x - containerRect.left + container.scrollLeft
      const currentY = current.y - containerRect.top + container.scrollTop
      const left = Math.min(startX, currentX)
      const top = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)
      setMarqueeBox({ left, top, width, height })
    }, [])

    const resolveIdsInSelection = useCallback(() => {
      const container = localContainerRef.current
      const start = dragStartClientRef.current
      const current = dragCurrentClientRef.current
      if (!container || !start || !current) return []
      const minX = Math.min(start.x, current.x)
      const maxX = Math.max(start.x, current.x)
      const minY = Math.min(start.y, current.y)
      const maxY = Math.max(start.y, current.y)
      const itemNodes = container.querySelectorAll<HTMLElement>(
        '[data-document-item="true"][data-document-id]'
      )
      const selectedIds: number[] = []
      itemNodes.forEach((node) => {
        const rawId = node.dataset.documentId
        if (!rawId) return
        const id = Number(rawId)
        if (Number.isNaN(id)) return
        const rect = node.getBoundingClientRect()
        const intersects =
          rect.left <= maxX && rect.right >= minX && rect.top <= maxY && rect.bottom >= minY
        if (intersects) {
          selectedIds.push(id)
        }
      })
      return selectedIds
    }, [])

    const finishMarquee = useCallback(() => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      const selectedIds = resolveIdsInSelection()
      onMarqueeSelect(selectedIds, { append: dragAppendRef.current })
      dragStartClientRef.current = null
      dragCurrentClientRef.current = null
      dragAppendRef.current = false
      setMarqueeBox(null)
    }, [onMarqueeSelect, resolveIdsInSelection])

    useEffect(() => {
      const handleWindowMouseMove = (event: MouseEvent) => {
        if (!isDraggingRef.current) return
        dragCurrentClientRef.current = { x: event.clientX, y: event.clientY }
        updateMarqueeBox()
      }

      const handleWindowMouseUp = () => {
        if (!isDraggingRef.current) return
        ignoreNextCanvasClickRef.current = true
        finishMarquee()
      }

      window.addEventListener('mousemove', handleWindowMouseMove)
      window.addEventListener('mouseup', handleWindowMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove)
        window.removeEventListener('mouseup', handleWindowMouseUp)
      }
    }, [finishMarquee, updateMarqueeBox])

    const handleMouseDown = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        const target = event.target as HTMLElement
        const isOnItem = !!target.closest?.('[data-document-item="true"]')
        if (isOnItem) return
        isDraggingRef.current = true
        dragAppendRef.current = event.ctrlKey || event.metaKey
        dragStartClientRef.current = { x: event.clientX, y: event.clientY }
        dragCurrentClientRef.current = { x: event.clientX, y: event.clientY }
        updateMarqueeBox()
        event.preventDefault()
      },
      [updateMarqueeBox]
    )

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (ignoreNextCanvasClickRef.current) {
          ignoreNextCanvasClickRef.current = false
          return
        }
        onCanvasClick(event)
      },
      [onCanvasClick]
    )

    const isGrid = viewMode === PROJECT_DOCUMENT_VIEW_MODE.GRID
    const hasItems = items.length > 0
    const isInitialLoading =
      (isLoading || (isFetching && !hasItems) || isFilterTransitioning) && !hasItems
    const isEmpty = !isLoading && !hasItems

    return (
      <div
        ref={setRefs}
        className={cn(
          'relative',
          'flex-1',
          !isInitialLoading && !isEmpty && isGrid && 'overflow-auto',
          'pt-0 pb-4 pl-7',
          isGrid && 'pt-4',
          dragOverCanvas && canUploadDocument && 'bg-data-light-grey-hover/50'
        )}
        onScroll={onScroll}
        onContextMenu={onCanvasContextMenu}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isInitialLoading ? (
          <DocumentLoadingSkeleton isGrid={isGrid} />
        ) : isEmpty ? (
          hasActiveFilter ? (
            <TableNoData
              message="Không tìm thấy dữ liệu"
              description="Không có kết quả phù hợp với bộ lọc đã chọn."
              onClearFilter={onClearFilter}
              clearFilterLabel="Quay lại"
            />
          ) : (
            <DocumentContentEmpty
              onCreateFolder={onCreateFolder}
              onCreateDocument={onCreateDocument}
              canCreateFolder={canCreateFolder}
            />
          )
        ) : isGrid ? (
          <DocumentGrid
            items={items}
            isSelected={isSelected}
            importantById={importantById}
            pendingDeleteIds={pendingDeleteIds}
            dragOverFolderId={dragOverFolderId}
            onFolderDragOver={onFolderDragOver}
            onFolderDragLeave={onFolderDragLeave}
            onItemClick={onItemClick}
            handleSelect={handleSelect}
            onOpenFolder={onOpenFolder}
            onItemContextMenu={onItemContextMenu}
            setDraggingItemId={setDraggingItemId}
            onMoveItemToFolder={onMoveItemToFolder}
            onToggleItemImportant={onToggleItemImportant}
            onOpenItemOptionsMenu={onOpenItemOptionsMenu}
          />
        ) : (
          <DocumentModeList
            items={items}
            isSelected={isSelected}
            pendingDeleteIds={pendingDeleteIds}
            dragOverFolderId={dragOverFolderId}
            onFolderDragOver={onFolderDragOver}
            onFolderDragLeave={onFolderDragLeave}
            onItemClick={onItemClick}
            onOpenFolder={onOpenFolder}
            onItemContextMenu={onItemContextMenu}
            setDraggingItemId={setDraggingItemId}
            onMoveItemToFolder={onMoveItemToFolder}
            importantById={importantById}
            onToggleItemImportant={onToggleItemImportant}
          />
        )}

        {isFetching && items.length > 0 && (
          <div className="flex items-center justify-center py-3">
            <Loading variant={'dots'} />
          </div>
        )}

        {dragOverCanvas && canUploadDocument && (
          <div className="border-action-primary-red-default bg-background-2/60 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm border-2 border-dashed">
            <p className="typo-body-base text-content-dark-1">Thả vào đây để tải lên</p>
          </div>
        )}

        {marqueeBox && (
          <div
            className="border-action-primary-red-default bg-action-primary-red-activated/30 pointer-events-none absolute z-20 border"
            style={{
              left: marqueeBox.left,
              top: marqueeBox.top,
              width: marqueeBox.width,
              height: marqueeBox.height,
            }}
          />
        )}
      </div>
    )
  }
)

DocumentsContent.displayName = 'DocumentsContent'

export default DocumentsContent
