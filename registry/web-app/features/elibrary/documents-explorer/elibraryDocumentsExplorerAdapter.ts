import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DOCUMENT_PERMISSION_RESOURCE } from '@/features/project/project-documents/constants/permissions'
import type { ProjectDocumentsExplorerAdapter } from '@/features/project/project-documents/types'
import {
  useCreateElibraryShareLink,
  useDeleteElibraryShare,
  useElibraryFileShares,
} from '@/services/elibrary-service'
import {
  ELIBRARY_DOCUMENT_SCOPE,
  type ElibraryDocumentScope,
  useCompanyDocumentsListByScope,
  useDepartmentDocumentsListByScope,
  useMyDocumentsListByScope,
  useSharedWithMeListByScope,
} from './hooks/useElibraryDocumentsListByScope'
import {
  useElibraryBulkMoveDocumentsCompatMutation,
  useElibraryCreateDocumentsCompatMutation,
  useElibraryCreateFolderCompatMutation,
  useElibraryDeleteDocumentCompatMutation,
  useElibraryShareDocumentCompatMutation,
  useElibraryUpdateDocumentCompatMutation,
} from './hooks/useElibraryExplorerCompatMutations'
import { ElibraryFolderType, ElibraryVisibility } from '@/constants/api-schema-aliases'

/**
 * Adapter-shape bound wrapper cho `useElibraryFileShares` — match contract
 * `(itemId, options?) => ...` của `ProjectDocumentsExplorerAdapter.useItemSharesHook`.
 */
function useElibraryItemSharesBound(itemId: number, options?: { enabled?: boolean }) {
  return useElibraryFileShares(itemId, undefined, options)
}

function useElibraryRootFolder() {
  return { data: null }
}

function getScopeLabel(scope: ElibraryDocumentScope) {
  switch (scope) {
    case ELIBRARY_DOCUMENT_SCOPE.MY:
      return 'Thư mục gốc tài liệu cá nhân'
    case ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT:
      return 'Thư mục gốc tài liệu phòng ban'
    case ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME:
      return 'Thư mục gốc tài liệu chia sẻ với tôi'
    case ELIBRARY_DOCUMENT_SCOPE.COMPANY:
      return 'Thư mục gốc tài liệu toàn công ty'
    default:
      return 'Thư mục gốc thư viện điện tử'
  }
}

function getListHookByScope(scope: ElibraryDocumentScope) {
  switch (scope) {
    case ELIBRARY_DOCUMENT_SCOPE.MY:
      return useMyDocumentsListByScope
    case ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT:
      return useDepartmentDocumentsListByScope
    case ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME:
      return useSharedWithMeListByScope
    case ELIBRARY_DOCUMENT_SCOPE.COMPANY:
      return useCompanyDocumentsListByScope
    default:
      return useMyDocumentsListByScope
  }
}

function getInvalidateQueryKeyByScope(scope: ElibraryDocumentScope) {
  switch (scope) {
    case ELIBRARY_DOCUMENT_SCOPE.MY:
      return ['elibrary', 'files', 'my-documents'] as const
    case ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT:
      return ['elibrary', 'files', 'department-documents'] as const
    case ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME:
      return ['elibrary', 'files', 'shared-with-me'] as const
    case ELIBRARY_DOCUMENT_SCOPE.COMPANY:
      return ['elibrary', 'files', 'list'] as const
    default:
      return ['elibrary', 'files'] as const
  }
}

export function createElibraryDocumentsExplorerAdapter(
  scope: ElibraryDocumentScope
): ProjectDocumentsExplorerAdapter {
  return {
    sourceId: 1,
    rootLabel: getScopeLabel(scope),
    settingsNamespace: `elibrary-documents-${scope}`,
    useBrowseHook: useElibraryRootFolder,
    useDocumentsListHook: getListHookByScope(scope),
    useUpdateMutationHook: useElibraryUpdateDocumentCompatMutation as any,
    useDeleteMutationHook: useElibraryDeleteDocumentCompatMutation as any,
    useShareMutationHook: useElibraryShareDocumentCompatMutation as any,
    useCreateDocumentsMutationHook: useElibraryCreateDocumentsCompatMutation as any,
    useCreateFolderMutationHook: useElibraryCreateFolderCompatMutation as any,
    useBulkMoveMutationHook: useElibraryBulkMoveDocumentsCompatMutation as any,
    createDialogUploadPurpose: {
      module: 'elibrary',
      key: APP_CONSTANT_KEY.ELIBRARY.LIBRARY_FILE_PURPOSE,
      fallbackPurpose: 'elibrary',
      parentFieldName: 'parent',
    },
    createDialogTitle: 'Tạo tài liệu',
    createDialogVisibilityConstant: {
      module: 'elibrary',
      key: APP_CONSTANT_KEY.ELIBRARY.VISIBILITY,
    },
    createDialogDefaultVisibility:
      scope === ELIBRARY_DOCUMENT_SCOPE.MY
        ? ElibraryVisibility.private
        : scope === ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT
          ? ElibraryVisibility.department
          : scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY
            ? ElibraryVisibility.company
            : ElibraryVisibility.private,
    lockCreateDialogVisibility: true,
    fixedVisibility:
      scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY ? ElibraryVisibility.company : undefined,
    hideVisibilityFilter: scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY,
    disableCreateFolder:
      scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME || scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY,
    disableMoveIntoFolder:
      scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME || scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY,
    disableUploadDocument:
      scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME || scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY,
    disableEditItem: scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME,
    disableShareItem: scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME,
    disableDeleteItem: scope === ELIBRARY_DOCUMENT_SCOPE.SHARED_WITH_ME,
    permissionResource: DOCUMENT_PERMISSION_RESOURCE.ELIBRARY_ITEM,
    useItemSharesHook: useElibraryItemSharesBound,
    useDeleteShareMutationHook: useDeleteElibraryShare,
    useCreateShareLinkMutationHook: useCreateElibraryShareLink,
    createDialogFolderTypeConfig: {
      rootFolderType:
        scope === ELIBRARY_DOCUMENT_SCOPE.MY
          ? ElibraryFolderType.personal
          : scope === ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT
            ? ElibraryFolderType.department
            : scope === ELIBRARY_DOCUMENT_SCOPE.COMPANY
              ? ElibraryFolderType.app
              : ElibraryFolderType.subfolder,
      subfolderFolderType: ElibraryFolderType.subfolder,
    },
    listInvalidateQueryKey: () => getInvalidateQueryKeyByScope(scope),
  }
}
