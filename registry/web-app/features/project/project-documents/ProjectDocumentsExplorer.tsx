import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type RealestateLibraryFileRead,
  useBrowseProjectDocument,
  useDeleteProjectDocument,
  useProjectDocumentShares,
  usePartialUpdateProjectDocument,
  useShareProjectDocument,
} from '@/services/document-service'
import {
  useCreateElibraryShareLink,
  useDeleteElibraryShare,
  useToggleElibraryFavorite,
} from '@/services/elibrary-service'
import toastService from '@/services/toast-service'
import DocumentsExplorerHeader, {
  type DocumentPathItem,
} from './components/header/DocumentsExplorerHeader'
import { DISPLAY_PRIORITY_FOLDER } from './components/sort-dropdown/sortDropdownConfig'
import DocumentsContent from './components/document-content/DocumentsContent'
import DocumentContentDetailPanel from './components/document-content/DocumentContentDetailPanel'
import DocumentContentContextMenu from './components/document-content/DocumentContentContextMenu'
import { useProjectDocumentFolderCreateDialog } from './hooks/useProjectDocumentFolderCreateDialog'
import { useProjectDocumentShareDialog } from './hooks/useProjectDocumentShareDialog'
import { useProjectDocumentFileCreateDialog } from './hooks/useProjectDocumentFileCreateDialog'
import { useProjectDocumentFileEditDialog } from './hooks/useProjectDocumentFileEditDialog'
import { useProjectDocumentsViewState } from './hooks/useProjectDocumentsViewState'
import { useProjectDocumentsQuery } from './hooks/useProjectDocumentsQuery'
import { useProjectDocumentsImportant } from './hooks/useProjectDocumentsImportant'
import { useProjectDocumentsSelectionAndContextMenu } from './hooks/useProjectDocumentsSelectionAndContextMenu'
import { useProjectDocumentsShareState } from './hooks/useProjectDocumentsShareState'
import { useProjectDocumentsContextMenuActions } from './hooks/useProjectDocumentsContextMenuActions'
import { useProjectDocumentsDragAndDrop } from './hooks/useProjectDocumentsDragAndDrop'
import { useProjectDocumentsDelete } from './hooks/useProjectDocumentsDelete'
import { useProjectDocumentsFilterDialog } from './hooks/useProjectDocumentsFilterDialog'
import { useProjectDocumentsMoveDialog } from './hooks/useProjectDocumentsMoveDialog'
import {
  PROJECT_DOCUMENT_DETAIL_MODE,
  PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS,
  type ProjectDocumentDetailMode,
} from './constants'
import { DOCUMENT_PERMISSION_RESOURCE } from './constants/permissions'
import { useBulkDocumentPermissions } from './hooks/useBulkDocumentPermissions'
import {
  type DocumentScopeFlags,
  useDocumentItemPermissions,
} from './hooks/useDocumentItemPermissions'
import { type ProjectDocumentsExplorerProps, type ProjectDocumentsTabSlots } from './types'
import {
  getRootFolderIdFromBrowsePayload,
  loadProjectDocumentsUserSettings,
  saveProjectDocumentsUserSettings,
} from './helpers'
import { cn } from '@/utils'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useUserName } from '@/store/auth-store'
import { Flex } from '@radix-ui/themes'
import { useDialogStore } from '@/store/dialog-store'
import { ElibraryNodeType, type ElibraryVisibility } from '@/constants/api-schema-aliases'

function getContextMenuTargetIds(
  selectedIds: number[],
  contextMenuTargetId: number | undefined
): number[] {
  return selectedIds.length > 0 ? selectedIds : contextMenuTargetId ? [contextMenuTargetId] : []
}

function getDetailModeFromSelectionCount(count: number): ProjectDocumentDetailMode {
  if (count === 0) return PROJECT_DOCUMENT_DETAIL_MODE.CURRENT_FOLDER
  if (count === 1) return PROJECT_DOCUMENT_DETAIL_MODE.ITEM
  return PROJECT_DOCUMENT_DETAIL_MODE.SELECTION
}

export default function ProjectDocumentsExplorer({
  project,
  setTabSlots,
  adapter,
}: ProjectDocumentsExplorerProps) {
  const sourceId = adapter?.sourceId ?? project.id
  const username = useUserName()
  const disableCreateFolder = adapter?.disableCreateFolder ?? false
  const disableMoveIntoFolder = adapter?.disableMoveIntoFolder ?? false
  const disableUploadDocument = adapter?.disableUploadDocument ?? false
  const disableEditItem = adapter?.disableEditItem ?? false
  const disableShareItem = adapter?.disableShareItem ?? false
  const disableDeleteItem = adapter?.disableDeleteItem ?? false
  const permissionResource =
    adapter?.permissionResource ?? DOCUMENT_PERMISSION_RESOURCE.PROJECT_DOCUMENT
  const scopePermissionFlags = useMemo<DocumentScopeFlags>(
    () => ({
      disableEditItem,
      disableShareItem,
      disableDeleteItem,
      disableMoveIntoFolder,
    }),
    [disableEditItem, disableShareItem, disableDeleteItem, disableMoveIntoFolder]
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const useUpdateMutationHook = adapter?.useUpdateMutationHook ?? usePartialUpdateProjectDocument
  const useDeleteMutationHook = adapter?.useDeleteMutationHook ?? useDeleteProjectDocument
  const useShareMutationHook = adapter?.useShareMutationHook ?? useShareProjectDocument
  const useCreateShareLinkMutationHook =
    adapter?.useCreateShareLinkMutationHook ?? useCreateElibraryShareLink
  const updateMutation = useUpdateMutationHook()
  const deleteMutation = useDeleteMutationHook()
  const shareMutation = useShareMutationHook()
  const createShareLinkMutation = useCreateShareLinkMutationHook()
  const toggleFavoriteMutation = useToggleElibraryFavorite()

  const projectCode = project.code ?? undefined
  const projectName = project.name ?? undefined
  const rootLabel =
    adapter?.rootLabel ?? `Thư mục gốc [${projectCode ?? '-'} - ${projectName ?? '-'}]`
  const useBrowseHook = adapter?.useBrowseHook ?? useBrowseProjectDocument
  const { data: browseData } = useBrowseHook(sourceId)
  const rootFolderId = useMemo(
    () => getRootFolderIdFromBrowsePayload(browseData as any),
    [browseData]
  )

  const rawVisibility = searchParams.get('visibility') as ElibraryVisibility | null
  const visibilityFromUrl = useMemo<ElibraryVisibility | null>(() => {
    if (adapter?.fixedVisibility) return adapter.fixedVisibility
    return rawVisibility && PROJECT_DOCUMENT_VISIBILITY_ENUM_OPTIONS.includes(rawVisibility)
      ? rawVisibility
      : null
  }, [adapter?.fixedVisibility, rawVisibility])

  const rawCategory = searchParams.get('category')
  const categoryFromUrl = useMemo<number | null>(
    () => (rawCategory ? Number(rawCategory) || null : null),
    [rawCategory]
  )

  const { viewMode, setViewMode, displayPriority, setDisplayPriority, sortOpen, setSortOpen } =
    useProjectDocumentsViewState()

  const {
    path,
    searchInput,
    debouncedSearch,
    setSearchInput,
    sortOption,
    setSortOption,
    setPage,
    items,
    isLoading,
    isFetching,
    currentParentId,
    handleNavigatePath,
    handleOpenFolder,
    scrollHandler,
  } = useProjectDocumentsQuery({
    projectId: sourceId,
    rootFolderId,
    rootLabel,
    visibility: visibilityFromUrl,
    category: categoryFromUrl,
    displayPriority,
    useDocumentsListHook: adapter?.useDocumentsListHook,
    allowNullRootFolderId: !!adapter?.useDocumentsListHook,
  })

  const pendingImportantToastRef = useRef<{
    itemId: number
    nextValue: boolean
  } | null>(null)

  const handleFavoriteBatchSyncComplete = useCallback(() => {
    const invalidateQueryKey = adapter?.listInvalidateQueryKey?.(sourceId) ?? [
      'realestate',
      'projects',
      sourceId,
      'documents',
      'list',
    ]
    void queryClient.invalidateQueries({
      queryKey: invalidateQueryKey as any,
    })

    const pending = pendingImportantToastRef.current
    if (!pending) return

    const item = items.find((it) => it.id === pending.itemId)
    const name = item?.name ?? '-'

    if (pending.nextValue) {
      toastService.success(`Đã đánh dấu quan trọng: "${name}"`)
    } else {
      toastService.success(`Đã bỏ đánh dấu quan trọng: "${name}"`)
    }

    pendingImportantToastRef.current = null
  }, [adapter?.listInvalidateQueryKey, items, queryClient, sourceId])

  const didHydrateUserSettingsRef = useRef(false)

  useEffect(() => {
    if (didHydrateUserSettingsRef.current) return

    const stored = loadProjectDocumentsUserSettings(username, adapter?.settingsNamespace)
    if (stored) {
      setViewMode(stored.viewMode)
      setDisplayPriority(stored.displayPriority)
      setSortOption(stored.sortOption)
    }

    didHydrateUserSettingsRef.current = true
  }, [adapter?.settingsNamespace, setDisplayPriority, setSortOption, setViewMode, username])

  useEffect(() => {
    if (!didHydrateUserSettingsRef.current) return

    saveProjectDocumentsUserSettings(
      username,
      {
        viewMode,
        displayPriority,
        sortOption,
      },
      adapter?.settingsNamespace
    )
  }, [adapter?.settingsNamespace, displayPriority, sortOption, username, viewMode])

  const {
    importantById,
    handleMarkImportant: markImportant,
    handleUnmarkImportant: unmarkImportant,
    handleToggleItemImportant,
  } = useProjectDocumentsImportant({
    items,
    toggleFavoriteMutation,
    onBatchSyncComplete: handleFavoriteBatchSyncComplete,
  })

  const {
    selectedIds,
    isSelected,
    clearSelection,
    handleSelect,
    setSelectedIds,
    selectedPrimaryItem,
    contextMenu,
    closeContextMenu,
    handleItemContextMenu,
    handleCanvasContextMenu,
    handleOpenItemOptionsMenu,
  } = useProjectDocumentsSelectionAndContextMenu({
    items,
    onClose: () => setSortOpen(false),
    canCreateFolder: !disableCreateFolder,
    canUploadDocument: !disableUploadDocument,
  })

  const [detailClosed, setDetailClosed] = useState(true)
  const [detailMode, setDetailMode] = useState<ProjectDocumentDetailMode>(
    PROJECT_DOCUMENT_DETAIL_MODE.CURRENT_FOLDER
  )

  const contentRef = useRef<HTMLDivElement>(null)

  const { openCreateFolderDialog } = useProjectDocumentFolderCreateDialog({
    useCreateFolderMutationHook: adapter?.useCreateFolderMutationHook as any,
    createDialogFolderTypeConfig: adapter?.createDialogFolderTypeConfig,
  })

  const listInvalidateQueryKeyLocal =
    adapter?.listInvalidateQueryKey ??
    ((pid: number) => ['realestate', 'projects', pid, 'documents'] as const)

  const useItemSharesHook = useMemo(() => {
    if (adapter?.useItemSharesHook) return adapter.useItemSharesHook
    return function useProjectItemSharesBound(itemId: number, options?: { enabled?: boolean }) {
      return useProjectDocumentShares(sourceId, itemId, undefined, options)
    }
  }, [adapter?.useItemSharesHook, sourceId])
  const useDeleteShareMutationHook = adapter?.useDeleteShareMutationHook ?? useDeleteElibraryShare

  const handleShareInvalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: listInvalidateQueryKeyLocal(sourceId),
    })
  }, [queryClient, listInvalidateQueryKeyLocal, sourceId])

  const { openShareDialog } = useProjectDocumentShareDialog({
    useItemSharesHook,
    useDeleteShareMutationHook,
    onAfterUnshare: handleShareInvalidate,
  })
  const { openCreateDialog } = useProjectDocumentFileCreateDialog({
    useCreateDocumentsMutationHook: adapter?.useCreateDocumentsMutationHook as any,
    uploadPurposeConfig: adapter?.createDialogUploadPurpose,
    dialogTitle: adapter?.createDialogTitle,
    visibilityConstantConfig: adapter?.createDialogVisibilityConstant,
    defaultVisibility: adapter?.createDialogDefaultVisibility,
    lockCreateDialogVisibility: adapter?.lockCreateDialogVisibility,
  })
  const listInvalidateQueryKey = listInvalidateQueryKeyLocal

  const { openEditDialog } = useProjectDocumentFileEditDialog({
    useUpdateMutationHook: adapter?.useUpdateMutationHook as any,
    listInvalidateQueryKey,
  })

  const handleCreateFolder = useCallback(() => {
    if (disableCreateFolder) return
    openCreateFolderDialog(sourceId, currentParentId, () => setPage(1))
  }, [disableCreateFolder, openCreateFolderDialog, sourceId, currentParentId, setPage])

  const { handleOpenShare } = useProjectDocumentsShareState({
    projectId: sourceId,
    items,
    selectedIds,
    selectedPrimaryItem,
    updateMutation,
    shareMutation,
    createShareLinkMutation,
    shareLinkConfig: adapter?.shareLinkConfig,
    openShareDialog,
    listInvalidateQueryKey,
    onSuccess: () => toastService.success('Cập nhật chia sẻ thành công'),
    visibilityConstantConfig: adapter?.createDialogVisibilityConstant,
  })

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
    },
    [setSearchInput]
  )

  const currentFolderLabel =
    path.length > 0 ? (path[path.length - 1]?.label ?? rootLabel) : rootLabel

  const { handleOpenFilterDialog, handleClearFilter } = useProjectDocumentsFilterDialog({
    visibilityFromUrl,
    categoryFromUrl,
    searchParams,
    setSearchParams,
    setPage,
    setSearchInput,
    clearSelection,
    fixedVisibility: adapter?.fixedVisibility,
    hideVisibilityFilter: adapter?.hideVisibilityFilter,
    visibilityConstantConfig: adapter?.createDialogVisibilityConstant,
  })

  const { openMoveConfirmDialog } = useProjectDocumentsMoveDialog({
    projectId: sourceId,
    currentFolderLabel,
    items,
    selectedIds,
    clearSelection,
    setPage,
    useBulkMoveMutationHook: adapter?.useBulkMoveMutationHook as any,
  })

  const {
    dragOverCanvas,
    dragOverFolderId,
    setDraggingItemId,
    handleCanvasDrop,
    handleDragOver,
    handleDragLeave,
    handleMoveItemToFolder,
    handleFolderDragOver,
    handleFolderDragLeave,
  } = useProjectDocumentsDragAndDrop({
    projectId: sourceId,
    currentParentId,
    openCreateDialog,
    disableUploadDocument,
    onRequestMove: (targetFolder, draggingItemId) => {
      if (disableMoveIntoFolder) return
      openMoveConfirmDialog(targetFolder, draggingItemId)
    },
    clearSelection,
    setPage,
  })

  const { pendingDeleteIds, openDeleteConfirm } = useProjectDocumentsDelete({
    projectId: sourceId,
    items,
    deleteMutation,
    clearSelection,
    setPage,
    listInvalidateQueryKey,
  })

  const displayItems = useMemo(() => {
    const folder = ElibraryNodeType.folder
    const folders = items.filter((item) => item.node_type === folder)
    const files = items.filter((item) => item.node_type !== folder)
    return displayPriority === DISPLAY_PRIORITY_FOLDER
      ? [...folders, ...files]
      : [...files, ...folders]
  }, [items, displayPriority])

  const selectedItems = useMemo(
    () => displayItems.filter((item) => selectedIds.includes(item.id)),
    [displayItems, selectedIds]
  )

  const selectionPermissions = useBulkDocumentPermissions(
    selectedItems,
    permissionResource,
    scopePermissionFlags
  )
  const allItemsPermissions = useBulkDocumentPermissions(
    items,
    permissionResource,
    scopePermissionFlags
  )
  const moveableIdSet = useMemo(
    () => new Set(allItemsPermissions.moveableIds),
    [allItemsPermissions.moveableIds]
  )
  const setDraggingItemIdGuarded = useCallback(
    (id: number | null) => {
      if (id !== null && !moveableIdSet.has(id)) return
      setDraggingItemId(id)
    },
    [moveableIdSet, setDraggingItemId]
  )
  const shareableCount = selectionPermissions.shareableCount
  const deletableCount = selectionPermissions.deletableCount

  const primaryItemPermissions = useDocumentItemPermissions(
    selectedPrimaryItem,
    permissionResource,
    scopePermissionFlags
  )

  const contextMenuShareableCount = useMemo(() => {
    if (selectedIds.length > 0) return shareableCount
    return primaryItemPermissions.canShare ? 1 : 0
  }, [selectedIds.length, shareableCount, primaryItemPermissions.canShare])

  // Cho phép chỉnh sửa cả thư mục lẫn tệp; canEdit đã gồm isOwner + quyền +
  // cờ vô hiệu theo scope của adapter.
  const canEditSelectedFile = selectedItems.length === 1 && primaryItemPermissions.canEdit

  const selectionLabel = selectedIds.length > 0 ? `${selectedIds.length} mục đang chọn` : null

  const [dragOverBreadcrumbIndex, setDragOverBreadcrumbIndex] = useState<number | null>(null)

  const handleBreadcrumbDragOver = useCallback((_segment: DocumentPathItem, index: number) => {
    setDragOverBreadcrumbIndex(index)
  }, [])

  const handleBreadcrumbDragLeave = useCallback((_segment: DocumentPathItem, index: number) => {
    setDragOverBreadcrumbIndex((prev) => (prev === index ? null : prev))
  }, [])

  const handleBreadcrumbDrop = useCallback(
    (segment: DocumentPathItem, _index: number) => {
      setDragOverBreadcrumbIndex(null)
      if (segment.id == null || segment.id === currentParentId) return
      if (disableMoveIntoFolder) return

      const targetFolder = {
        id: segment.id,
        name: segment.label,
        node_type: ElibraryNodeType.folder,
      } as RealestateLibraryFileRead

      openMoveConfirmDialog(targetFolder)
    },
    [currentParentId, disableMoveIntoFolder, openMoveConfirmDialog]
  )

  const shouldShowDetailPanel = !detailClosed

  const syncDetailMode = useCallback((count: number) => {
    setDetailMode(getDetailModeFromSelectionCount(count))
  }, [])

  const handleToggleDetailFromHeader = useCallback(() => {
    if (!detailClosed) {
      setDetailClosed(true)
      return
    }
    syncDetailMode(selectedIds.length)
    setDetailClosed(false)
  }, [detailClosed, selectedIds.length, syncDetailMode])

  const lastTabSlotsSyncKeyRef = useRef<string>('')
  const tabSlotsSyncKey = useMemo(
    () =>
      JSON.stringify({
        path: path.map((item) => `${item.id ?? 'null'}:${item.label}`),
        searchInput,
        sortOption,
        sortOpen,
        viewMode,
        detailClosed,
        displayPriority,
        isFetching,
        sourceId,
        currentParentId,
        visibility: visibilityFromUrl ?? 'null',
        disableUploadDocument,
      }),
    [
      path,
      searchInput,
      sortOption,
      sortOpen,
      viewMode,
      detailClosed,
      displayPriority,
      isFetching,
      sourceId,
      currentParentId,
      visibilityFromUrl,
      disableUploadDocument,
    ]
  )

  useEffect(() => {
    if (!setTabSlots) return
    const isSameSyncKey = lastTabSlotsSyncKeyRef.current === tabSlotsSyncKey
    if (isSameSyncKey) return

    const nextTabSlots: ProjectDocumentsTabSlots = {
      toolbarProps: {
        handleSearch: handleSearchChange,
        searchValue: searchInput,
        searchPlaceholder: 'Tìm kiếm theo tên tài liệu',
        searchClassName: 'w-full max-w-[360px]',
        handleFilter: handleOpenFilterDialog,
        filterBadgeCount:
          (adapter?.fixedVisibility ? 0 : visibilityFromUrl ? 1 : 0) +
          (categoryFromUrl != null ? 1 : 0),
        ...(disableUploadDocument
          ? {}
          : {
              handleCreateNew: () =>
                openCreateDialog({
                  projectId: sourceId,
                  currentParentId,
                  uploadAreaTrigger: 'context_menu',
                  onSuccess: () => {
                    setPage(1)
                    clearSelection()
                  },
                }),
              titleCreateNew: 'Tạo tài liệu',
            }),
      },
    }

    lastTabSlotsSyncKeyRef.current = tabSlotsSyncKey
    setTabSlots(nextTabSlots)
  }, [
    setTabSlots,
    tabSlotsSyncKey,
    path,
    searchInput,
    sortOption,
    sortOpen,
    viewMode,
    handleNavigatePath,
    detailClosed,
    handleToggleDetailFromHeader,
    displayPriority,
    isFetching,
    sourceId,
    currentParentId,
    visibilityFromUrl,
    categoryFromUrl,
    handleSearchChange,
    openCreateDialog,
    clearSelection,
    setPage,
    adapter?.fixedVisibility,
    disableUploadDocument,
  ])

  const handleScroll = useCallback(() => {
    scrollHandler(contentRef.current, isFetching)
  }, [scrollHandler, isFetching])

  const handleDeleteSelected = useCallback(() => {
    const ids = getContextMenuTargetIds(selectedIds, contextMenu.targetId)
    openDeleteConfirm(ids)
  }, [selectedIds, contextMenu.targetId, openDeleteConfirm])
  const handleEditSelectedFile = useCallback(() => {
    if (!canEditSelectedFile) return
    const selectedFile = selectedItems[0]
    if (!selectedFile) return

    openEditDialog({
      projectId: sourceId,
      item: selectedFile,
      onSuccess: () => setPage(1),
    })
  }, [canEditSelectedFile, openEditDialog, sourceId, selectedItems, setPage])

  const handleMarkImportant = useCallback(() => {
    const ids = getContextMenuTargetIds(selectedIds, contextMenu.targetId)
    if (ids.length === 0) return
    markImportant(ids)
    const matchedItems = items.filter((item) => ids.includes(item.id))
    if (matchedItems.length === 1) {
      const name = matchedItems[0]?.name ?? '-'
      toastService.success(`Đã đánh dấu quan trọng: "${name}"`)
      return
    }
    toastService.success(`Đã đánh dấu quan trọng cho ${matchedItems.length} mục`)
  }, [contextMenu.targetId, items, markImportant, selectedIds])

  const handleUnmarkImportant = useCallback(() => {
    const ids = getContextMenuTargetIds(selectedIds, contextMenu.targetId)
    if (ids.length === 0) return
    unmarkImportant(ids)
    const matchedItems = items.filter((item) => ids.includes(item.id))
    if (matchedItems.length === 1) {
      const name = matchedItems[0]?.name ?? '-'
      toastService.success(`Đã bỏ đánh dấu quan trọng: "${name}"`)
      return
    }
    toastService.success(`Đã bỏ đánh dấu quan trọng cho ${matchedItems.length} mục`)
  }, [contextMenu.targetId, items, selectedIds, unmarkImportant])

  const handleToggleItemImportantWithToast = useCallback(
    (itemId: number, value?: boolean) => {
      const currentImportant = importantById[itemId] ?? false
      const nextValue = typeof value === 'boolean' ? value : !currentImportant

      pendingImportantToastRef.current = {
        itemId,
        nextValue,
      }

      handleToggleItemImportant(itemId, nextValue)
    },
    [handleToggleItemImportant, importantById]
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const isOnItem = !!target.closest?.('[data-document-item="true"]')
      if (!isOnItem && selectedIds.length > 0) {
        clearSelection()
      }
    },
    [selectedIds.length, clearSelection]
  )

  const handleItemClick = useCallback(
    (item: RealestateLibraryFileRead, event: React.MouseEvent) => {
      handleSelect(item.id, { ctrlKey: event.ctrlKey, shiftKey: event.shiftKey })
    },
    [handleSelect]
  )

  const handleMarqueeSelect = useCallback(
    (ids: number[], options: { append: boolean }) => {
      if (options.append) {
        if (ids.length === 0) return
        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])))
        return
      }
      setSelectedIds(ids)
    },
    [setSelectedIds]
  )

  const contextMenuActions = useProjectDocumentsContextMenuActions({
    contextMenu,
    selectedIds,
    shareableCount: contextMenuShareableCount,
    selectedPrimaryItem,
    importantById,
    projectId: sourceId,
    currentParentId,
    setPage,
    clearSelection,
    syncDetailMode,
    setDetailClosed,
    openCreateFolderDialog,
    openCreateDialog,
    canCreateFolder: !disableCreateFolder,
    canUploadDocument: !disableUploadDocument,
    openEditDialog,
    handleOpenShare,
    handleMarkImportant,
    handleUnmarkImportant,
    handleDeleteSelected,
    primaryItemPermissions,
    selectionPermissions,
  })

  useEffect(() => {
    if (detailClosed) return
    syncDetailMode(selectedIds.length)
  }, [detailClosed, selectedIds.length, syncDetailMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIds.length === 0) return
      if (e.key !== 'Delete') return
      if (useDialogStore.getState().isOpen) return
      const target = e.target as Node
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) {
        return
      }
      e.preventDefault()
      handleDeleteSelected()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.length, handleDeleteSelected])

  return (
    <div className={cn('flex flex-col gap-4', 'pt-0 pb-4', 'h-full min-h-0')}>
      <DocumentsExplorerHeader
        path={path}
        onNavigatePath={handleNavigatePath}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        sortOpen={sortOpen}
        onSortOpenChange={setSortOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isDetailOpen={!detailClosed}
        onToggleDetail={handleToggleDetailFromHeader}
        displayPriority={displayPriority}
        onDisplayPriorityChange={setDisplayPriority}
        isSortDisabled={isLoading}
        selectedCount={selectedIds.length}
        shareableCount={shareableCount}
        deletableCount={deletableCount}
        onDelete={handleDeleteSelected}
        onShare={handleOpenShare}
        onEditSelectedFile={handleEditSelectedFile}
        canEditSelectedFile={canEditSelectedFile}
        selectionLabel={selectionLabel}
        dragOverBreadcrumbIndex={dragOverBreadcrumbIndex}
        onBreadcrumbDragOver={handleBreadcrumbDragOver}
        onBreadcrumbDragLeave={handleBreadcrumbDragLeave}
        onBreadcrumbDrop={handleBreadcrumbDrop}
      />
      <Flex flexGrow={'1'} className={cn('relative', 'min-h-0', 'rounded-sm')}>
        <div
          className={cn(
            'flex-1',
            'flex',
            'max-h-screen overflow-auto',
            !shouldShowDetailPanel && viewMode === 'list' && 'mr-7'
          )}
        >
          <DocumentsContent
            ref={contentRef}
            isLoading={isLoading}
            items={displayItems}
            isFetching={isFetching}
            viewMode={viewMode}
            dragOverCanvas={dragOverCanvas}
            importantById={importantById}
            onScroll={handleScroll}
            onCanvasClick={handleCanvasClick}
            onCanvasContextMenu={handleCanvasContextMenu}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleCanvasDrop}
            isSelected={isSelected}
            handleSelect={handleSelect}
            onItemClick={handleItemClick}
            onOpenFolder={handleOpenFolder}
            onItemContextMenu={handleItemContextMenu}
            setDraggingItemId={setDraggingItemIdGuarded}
            onMoveItemToFolder={handleMoveItemToFolder}
            onToggleItemImportant={handleToggleItemImportantWithToast}
            onOpenItemOptionsMenu={handleOpenItemOptionsMenu}
            onCreateFolder={handleCreateFolder}
            canCreateFolder={!disableCreateFolder}
            canUploadDocument={!disableUploadDocument}
            onCreateDocument={() =>
              openCreateDialog({
                projectId: sourceId,
                currentParentId,
                uploadAreaTrigger: 'context_menu',
                onSuccess: () => {
                  setPage(1)
                  clearSelection()
                },
              })
            }
            hasActiveFilter={
              searchInput.trim().length > 0 ||
              debouncedSearch.trim().length > 0 ||
              (!adapter?.fixedVisibility && !!visibilityFromUrl) ||
              categoryFromUrl != null
            }
            isFilterTransitioning={searchInput.trim() !== debouncedSearch.trim()}
            onClearFilter={handleClearFilter}
            onMarqueeSelect={handleMarqueeSelect}
            pendingDeleteIds={pendingDeleteIds}
            dragOverFolderId={dragOverFolderId}
            onFolderDragOver={handleFolderDragOver}
            onFolderDragLeave={handleFolderDragLeave}
          />
        </div>

        <DocumentContentDetailPanel
          item={detailMode === PROJECT_DOCUMENT_DETAIL_MODE.ITEM ? selectedPrimaryItem : null}
          visible={shouldShowDetailPanel}
          mode={detailMode}
          selectionCount={selectedIds.length}
          selectedItems={selectedItems}
          currentFolderLabel={currentFolderLabel}
          onRemoveSelectedItem={(id) =>
            setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
          }
          onClose={() => setDetailClosed(true)}
        />
      </Flex>

      <DocumentContentContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        actions={contextMenuActions}
        onClose={closeContextMenu}
      />
    </div>
  )
}
