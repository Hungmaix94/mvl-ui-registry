import { useCallback, useState } from 'react'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import toastService from '@/services/toast-service'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type UseProjectDocumentsDragAndDropParams = {
  projectId: number
  currentParentId: number | null
  openCreateDialog: (params: {
    projectId: number
    currentParentId: number | null
    onSuccess?: () => void
    initialFileToken?: string
    initialTitle?: string
    initialUploads?: Array<{
      clientId: string
      fileName: string
      fileSizeBytes: number
      file: File
    }>
    uploadAreaTrigger?: 'context_menu' | 'drag_drop'
  }) => void
  onRequestMove: (targetFolder: RealestateLibraryFileRead, draggingItemId: number | null) => void
  clearSelection: () => void
  setPage: (page: number | ((prev: number) => number)) => void
  /** When true, external file drop on canvas does not open upload dialog; no upload drag-over UI. */
  disableUploadDocument?: boolean
}

type UseProjectDocumentsDragAndDropResult = {
  dragOverCanvas: boolean
  dragOverFolderId: number | null
  setDraggingItemId: (id: number | null) => void
  handleCanvasDrop: (event: React.DragEvent<HTMLDivElement>) => void
  handleDragOver: (event: React.DragEvent) => void
  handleDragLeave: () => void
  handleMoveItemToFolder: (targetFolder: RealestateLibraryFileRead) => void
  handleFolderDragOver: (id: number) => void
  handleFolderDragLeave: (id: number) => void
}

export function useProjectDocumentsDragAndDrop({
  projectId,
  currentParentId,
  openCreateDialog,
  onRequestMove,
  clearSelection,
  setPage,
  disableUploadDocument = false,
}: UseProjectDocumentsDragAndDropParams): UseProjectDocumentsDragAndDropResult {
  const [dragOverCanvas, setDragOverCanvas] = useState(false)
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null)

  const hasDroppedFolderLikeEntries = (items: DataTransferItemList | null) => {
    if (!items || items.length === 0) return false

    for (let i = 0; i < items.length; i += 1) {
      const item = (items as any)[i]
      const entry = (item as any)?.webkitGetAsEntry?.()
      if (entry?.isDirectory) return true
    }
    return false
  }

  const isFolderLikeFile = (file: File) => {
    const relativePath = (file as any)?.webkitRelativePath as string | undefined
    if (relativePath) {
      if (relativePath.endsWith('/')) return true
      if (!file.name.includes('.') && relativePath === `${file.name}/`) return true
    }
    if (file.size === 0 && !file.name.includes('.')) return true
    return false
  }

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragOverCanvas(false)
      if (draggingItemId) return
      const rawFiles = Array.from(event.dataTransfer.files || [])
      if (rawFiles.length === 0) return

      const hasFolderLikeEntries = hasDroppedFolderLikeEntries(event.dataTransfer.items)
      const droppedFiles = rawFiles.filter((file) => !isFolderLikeFile(file))

      if (hasFolderLikeEntries || droppedFiles.length !== rawFiles.length) {
        toastService.warning('Không hỗ trợ tải lên folder')
      }

      // Open create dialog immediately; do not presign/upload on drop.
      if (droppedFiles.length === 0) return

      const initialUploads = droppedFiles.map((file, idx) => ({
        clientId: `drop-${idx}-${file.name}-${file.size}-${Date.now()}`,
        fileName: file.name,
        fileSizeBytes: file.size,
        file,
      }))

      openCreateDialog({
        projectId,
        currentParentId,
        initialUploads,
        uploadAreaTrigger: 'drag_drop',
        onSuccess: () => {
          setPage(1)
          clearSelection()
        },
      })
    },
    [
      draggingItemId,
      projectId,
      currentParentId,
      openCreateDialog,
      setPage,
      clearSelection,
      disableUploadDocument,
    ]
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (disableUploadDocument) return
      if (!draggingItemId) setDragOverCanvas(true)
    },
    [draggingItemId, disableUploadDocument]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverCanvas(false)
  }, [])

  const handleMoveItemToFolder = useCallback(
    (targetFolder: RealestateLibraryFileRead) => {
      if (targetFolder.node_type !== ElibraryNodeType.folder) return
      if (!draggingItemId || draggingItemId === targetFolder.id) return
      onRequestMove(targetFolder, draggingItemId)
      setDraggingItemId(null)
      setDragOverFolderId(null)
    },
    [draggingItemId, onRequestMove]
  )

  const handleFolderDragOver = useCallback(
    (id: number) => {
      if (draggingItemId && draggingItemId !== id) {
        setDragOverFolderId(id)
      }
    },
    [draggingItemId]
  )

  const handleFolderDragLeave = useCallback((id: number) => {
    setDragOverFolderId((prev) => (prev === id ? null : prev))
  }, [])

  return {
    dragOverCanvas,
    dragOverFolderId,
    setDraggingItemId,
    handleCanvasDrop,
    handleDragOver,
    handleDragLeave,
    handleMoveItemToFolder,
    handleFolderDragOver,
    handleFolderDragLeave,
  }
}
