import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { useProjectDocumentSelection } from './useProjectDocumentSelection'
import type { ContextMenuState } from '../types'

type UseProjectDocumentsSelectionAndContextMenuParams = {
  items: RealestateLibraryFileRead[]
  onClose?: () => void
  /** When both false, right-click on empty canvas does not open context menu (no empty box). */
  canCreateFolder?: boolean
  canUploadDocument?: boolean
}

export function useProjectDocumentsSelectionAndContextMenu({
  items,
  onClose,
  canCreateFolder = true,
  canUploadDocument = true,
}: UseProjectDocumentsSelectionAndContextMenuParams) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items])
  const { selectedIds, isSelected, clearSelection, handleSelect, setSelectedIds } =
    useProjectDocumentSelection(itemIds)

  const selectedPrimaryItem = useMemo(() => {
    if (selectedIds.length === 0) return null
    const primaryId = selectedIds[selectedIds.length - 1]
    return items.find((item) => item.id === primaryId) ?? null
  }, [items, selectedIds])

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    targetType: 'canvas',
  })

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest?.('[data-sort-dropdown]')) return
      closeContextMenu()
      onClose?.()
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [closeContextMenu, onClose])

  const handleItemContextMenu = useCallback(
    (item: RealestateLibraryFileRead, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!selectedIds.includes(item.id)) {
        setSelectedIds([item.id])
      }
      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        targetType: 'item',
        targetId: item.id,
      })
    },
    [selectedIds, setSelectedIds]
  )

  const handleCanvasContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (selectedIds.length > 0) {
        clearSelection()
      }
      const hasCanvasActions = canCreateFolder || canUploadDocument
      if (!hasCanvasActions) return
      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        targetType: 'canvas',
      })
    },
    [clearSelection, selectedIds.length, canCreateFolder, canUploadDocument]
  )

  const handleOpenItemOptionsMenu = useCallback(
    (item: RealestateLibraryFileRead, event: React.MouseEvent) => {
      // Mở menu qua nút 3 chấm phải chọn item giống chuột phải (handleItemContextMenu),
      // nếu không selectedPrimaryItem = null → primaryItemPermissions rỗng → menu chỉ hiện
      // các thao tác vô điều kiện (Đánh dấu quan trọng + Chi tiết), thiếu Chia sẻ/Sửa/Xoá.
      if (!selectedIds.includes(item.id)) {
        setSelectedIds([item.id])
      }
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const menuWidthPx = 192
      const gapPx = 4
      const paddingPx = 8
      const left = Math.max(
        paddingPx,
        Math.min(rect.right - menuWidthPx, window.innerWidth - menuWidthPx - paddingPx)
      )
      setContextMenu({
        open: true,
        x: left,
        y: rect.bottom + gapPx,
        targetType: 'item',
        targetId: item.id,
      })
    },
    [selectedIds, setSelectedIds]
  )

  return {
    selectedIds,
    isSelected,
    clearSelection,
    handleSelect,
    setSelectedIds,
    selectedPrimaryItem,
    contextMenu,
    setContextMenu,
    closeContextMenu,
    handleItemContextMenu,
    handleCanvasContextMenu,
    handleOpenItemOptionsMenu,
  }
}
