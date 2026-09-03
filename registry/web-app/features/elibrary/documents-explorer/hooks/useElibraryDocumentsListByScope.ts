import {
  type GetElibraryDepartmentDocumentsParams,
  type GetElibraryFilesParams,
  useElibraryDepartmentDocuments,
  useElibraryFiles,
  useElibraryMyDocuments,
  useElibrarySharedWithMe,
} from '@/services/elibrary-service'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

export const ELIBRARY_DOCUMENT_SCOPE = {
  MY: 'my',
  DEPARTMENT: 'department',
  SHARED_WITH_ME: 'shared-with-me',
  COMPANY: 'company',
} as const

export type ElibraryDocumentScope =
  (typeof ELIBRARY_DOCUMENT_SCOPE)[keyof typeof ELIBRARY_DOCUMENT_SCOPE]

type ListHookOptions = { enabled?: boolean }

export function useMyDocumentsListByScope(
  _sourceId: number,
  params?: GetElibraryFilesParams,
  options?: ListHookOptions
) {
  return useElibraryMyDocuments(params as any, options)
}

export function useDepartmentDocumentsListByScope(
  _sourceId: number,
  params?: GetElibraryDepartmentDocumentsParams,
  options?: ListHookOptions
) {
  return useElibraryDepartmentDocuments(params as any, options)
}

export function useSharedWithMeListByScope(
  _sourceId: number,
  params?: GetElibraryFilesParams,
  options?: ListHookOptions
) {
  return useElibrarySharedWithMe(params as any, options)
}

export function useCompanyDocumentsListByScope(
  _sourceId: number,
  params?: GetElibraryFilesParams,
  options?: ListHookOptions
) {
  const queryParams = {
    ...(params || {}),
    visibility: ElibraryVisibility.company,
  }

  return useElibraryFiles(queryParams as any, options)
}
