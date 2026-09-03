import type { PageTitleToolbarProps } from '@/components/ui/page-title/PageTitleToolbar'
import type { components } from '@/api/schema'
import type { RealestateLibraryFileRead } from '@/services/document-service'

import type { DocumentItemResource } from '../constants/permissions'
import { type ElibraryFolderType, type ElibraryVisibility } from '@/constants/api-schema-aliases'

export type ProjectDocumentsTabSlots = {
  // topSlot: ReactNode
  toolbarProps: PageTitleToolbarProps
}

export type ProjectDocumentsExplorerProject = {
  id: number
  code?: string | null
  name?: string | null
}

export type ProjectDocumentsExplorerProps = {
  project: ProjectDocumentsExplorerProject
  /** When set, explorer injects breadcrumb + toolbar into parent PageTitle (e.g. tab topSlot + toolbarProps) */
  setTabSlots?: (slots: ProjectDocumentsTabSlots | null) => void
  adapter?: ProjectDocumentsExplorerAdapter
}

export type ContextMenuState = {
  open: boolean
  x: number
  y: number
  targetType: 'canvas' | 'item'
  targetId?: number
}

export type DocumentsListHook = (
  sourceId: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) => {
  data?: { results?: RealestateLibraryFileRead[]; count?: number }
  isLoading: boolean
  isFetching: boolean
}

export type ProjectDocumentsExplorerAdapter = {
  sourceId?: number
  rootLabel?: string
  settingsNamespace?: string
  useBrowseHook?: (sourceId: number) => { data?: unknown }
  useDocumentsListHook?: DocumentsListHook
  useUpdateMutationHook?: () => {
    mutateAsync: (params: {
      projectId: number
      documentId: number
      data: components['schemas']['PatchedLibraryItemUpdateRequest']
    }) => Promise<unknown>
  }
  useDeleteMutationHook?: () => {
    mutateAsync: (params: { projectId: number; documentId: number }) => Promise<unknown>
  }
  useShareMutationHook?: () => {
    mutateAsync: (params: {
      projectId: number
      documentId: number
      data: components['schemas']['LibraryShareCreateRequest']
    }) => Promise<unknown>
  }
  useCreateDocumentsMutationHook?: () => {
    mutateAsync: (params: {
      projectId: number
      data:
        | components['schemas']['ProjectDocumentCreateRequest']
        | { files: components['schemas']['ProjectDocumentCreateRequest'][] }
    }) => Promise<unknown>
  }
  useCreateFolderMutationHook?: () => {
    mutateAsync: (params: {
      projectId: number
      data: components['schemas']['ProjectDocumentFolderCreateRequest']
    }) => Promise<unknown>
  }
  useBulkMoveMutationHook?: () => {
    mutateAsync: (params: {
      projectId: number
      ids: number[]
      folder: number | null
    }) => Promise<unknown>
    isPending?: boolean
  }
  createDialogUploadPurpose?: {
    module: 'realestate' | 'elibrary'
    key: string
    fallbackPurpose: string
    parentFieldName: 'folder' | 'parent'
  }
  /** Bulk upload dialog title (e.g. thư viện điện tử). Mặc định: "Tạo tài liệu dự án". */
  createDialogTitle?: string
  /** Nguồn options "Phạm vi truy cập" trong form upload. Mặc định: files.Document_Visibility */
  createDialogVisibilityConstant?: {
    module: 'files' | 'elibrary'
    key: string
  }
  /** Default visibility cho dialog upload (theo scope E-Library). */
  createDialogDefaultVisibility?: ElibraryVisibility
  /** Khi true, khóa selection “Phạm vi truy cập” trong dialog upload. */
  lockCreateDialogVisibility?: boolean
  fixedVisibility?: ElibraryVisibility
  hideVisibilityFilter?: boolean
  /** Hide/disable creating folders for read-only scopes (e.g. "shared with me"). */
  disableCreateFolder?: boolean
  /** Disable "move into folder" for read-only scopes (e.g. "shared with me"). */
  disableMoveIntoFolder?: boolean
  /** Hide upload / "Tạo tài liệu" (toolbar, context menu, drag-drop, empty state). */
  disableUploadDocument?: boolean
  /** Hide edit (rename / visibility / category / description) per-scope. */
  disableEditItem?: boolean
  /** Hide share action per-scope. */
  disableShareItem?: boolean
  /** Hide delete action per-scope. */
  disableDeleteItem?: boolean
  /**
   * Namespace permission cho per-item ability check:
   * - 'elibrary_item' cho 4 page elibrary
   * - 'project_document' cho tab Documents trong project
   * Mặc định 'project_document' (vì Project là consumer gốc của explorer).
   */
  permissionResource?: DocumentItemResource
  /** Hook load existing shares cho 1 item — Phase 4. Default project: useProjectDocumentShares bound by sourceId. */
  useItemSharesHook?: (
    itemId: number,
    options?: { enabled?: boolean }
  ) => {
    data?:
      | { results?: components['schemas']['LibraryShareRead'][] }
      | components['schemas']['LibraryShareRead'][]
    isLoading: boolean
    refetch?: () => void
  }
  /** Hook mutation xoá share — default useDeleteElibraryShare (shared endpoint cho cả 2 module). */
  useDeleteShareMutationHook?: () => {
    mutateAsync: (shareId: number) => Promise<unknown>
    isPending?: boolean
  }
  /**
   * Hook mutation tạo public share-link cho 1 item.
   * Default: `useCreateElibraryShareLink` (endpoint `POST /api/elibrary/items/{id}/share-links/`).
   * Q&A confirm: endpoint elibrary dùng được cho cả project document IDs (cùng DB).
   * Trả về `LibraryAccessTokenRead` có field `url` để copy clipboard.
   */
  useCreateShareLinkMutationHook?: () => {
    mutateAsync: (params: {
      id: number
      data: components['schemas']['LibraryAccessTokenCreateRequest']
    }) => Promise<components['schemas']['LibraryAccessTokenRead']>
    isPending?: boolean
  }
  /** Override default TTL/max_uses khi tạo share-link. */
  shareLinkConfig?: {
    ttlSeconds?: number
    maxUses?: number | null
  }
  /**
   * For E-Library folder creation:
   * - When creating at root (parent == null), set folder_type = rootFolderType
   * - When creating under a folder (parent != null), set folder_type = subfolderFolderType
   */
  createDialogFolderTypeConfig?: {
    rootFolderType: ElibraryFolderType
    subfolderFolderType?: ElibraryFolderType
    rootDepartmentId?: number
  }
  listInvalidateQueryKey?: (sourceId: number) => readonly unknown[]
}
