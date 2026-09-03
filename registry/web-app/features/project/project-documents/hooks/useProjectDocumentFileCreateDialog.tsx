import { useCallback, useMemo, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useCreateProjectDocuments } from '@/services/document-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { usePresignFile } from '@/services/file-service'
import ProjectDocumentBulkUploadList, {
  type BulkUploadItem,
  type ProjectDocumentBulkUploadListRef,
} from '../components/form/ProjectDocumentBulkUploadList'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

type InitialUploadItem = {
  clientId: string
  fileName: string
  fileSizeBytes: number
  file?: File
  title?: string
  description?: string
  token?: string
  status?: BulkUploadItem['status']
  error?: string
}

type UploadAreaTrigger = 'context_menu' | 'drag_drop'

type OpenProjectDocumentCreateDialogParams = {
  projectId: number
  currentParentId: number | null
  initialFileToken?: string
  initialTitle?: string
  initialUploads?: InitialUploadItem[]
  onSuccess?: () => void
  uploadAreaTrigger?: UploadAreaTrigger
}

type ProjectDocumentFileCreateDialogOptions = {
  useCreateDocumentsMutationHook?: typeof useCreateProjectDocuments
  uploadPurposeConfig?: {
    module: 'realestate' | 'elibrary'
    key: string
    fallbackPurpose: string
    parentFieldName: 'folder' | 'parent'
  }
  /** Mặc định: "Tạo tài liệu dự án" */
  dialogTitle?: string
  /** Mặc định: module files + Document_Visibility */
  visibilityConstantConfig?: {
    module: 'files' | 'elibrary'
    key: string
  }
  /** Mặc định: upload trong project docs */
  defaultVisibility?: ElibraryVisibility
  /** Mặc định: không khóa */
  lockCreateDialogVisibility?: boolean
}

export function useProjectDocumentFileCreateDialog(
  options?: ProjectDocumentFileCreateDialogOptions
) {
  const { displayCustom, displayClose, setLoading, updateConfig } = useDialog()
  const useCreateDocumentsMutationHook =
    options?.useCreateDocumentsMutationHook ?? useCreateProjectDocuments
  const createMutation = useCreateDocumentsMutationHook()
  const presignFileMutation = usePresignFile()
  const bulkUploadFormRef = useRef<ProjectDocumentBulkUploadListRef>(null)
  const uploadAbortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const isUploadCancelledRef = useRef(false)
  const uploadPurposeConfig = options?.uploadPurposeConfig ?? {
    module: 'realestate' as const,
    key: APP_CONSTANT_KEY.REALESTATE.FILE_PURPOSE_PROJECT,
    fallbackPurpose: 'project_document',
    parentFieldName: 'folder' as const,
  }
  const visibilityConstantConfig = options?.visibilityConstantConfig ?? {
    module: 'files' as const,
    key: APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY,
  }
  const dialogTitle = options?.dialogTitle ?? 'Tạo tài liệu dự án'
  const defaultVisibility = options?.defaultVisibility ?? ElibraryVisibility.department
  const lockCreateDialogVisibility = options?.lockCreateDialogVisibility ?? false
  const { keysMap } = useAppConstant({
    module: uploadPurposeConfig.module,
    keys: [uploadPurposeConfig.key],
  })
  const { keysMapOptions: visibilityOptionsMap } = useAppConstant({
    module: visibilityConstantConfig.module,
    keys: [visibilityConstantConfig.key],
  })
  const uploadPurpose =
    (keysMap.get(uploadPurposeConfig.key) as string | undefined) ??
    uploadPurposeConfig.fallbackPurpose
  const visibilityOptions = useMemo(
    () => visibilityOptionsMap.get(visibilityConstantConfig.key) ?? [],
    [visibilityOptionsMap, visibilityConstantConfig.key]
  )

  const stripExtension = useCallback((name: string) => {
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex <= 0) return name
    return name.slice(0, lastDotIndex)
  }, [])

  const getExtension = useCallback((name: string) => {
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex <= 0) return ''
    return name.slice(lastDotIndex)
  }, [])

  const openCreateDialog = useCallback(
    (params: OpenProjectDocumentCreateDialogParams) => {
      const { projectId, currentParentId, initialUploads, onSuccess, uploadAreaTrigger } = params

      const validInitialUploads =
        initialUploads?.filter((upload) => upload.clientId && upload.fileName) ?? []

      const showUploadArea = uploadAreaTrigger !== 'drag_drop'

      const initialBulkItems: BulkUploadItem[] = validInitialUploads.map((upload) => ({
        clientId: upload.clientId,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        file: upload.file,
        title: upload.title || stripExtension(upload.fileName),
        description: upload.description ?? '',
        token: upload.token,
        status: upload.status || 'idle',
        error: upload.error,
      }))

      const handleUploadsChange = (count: number) => {
        updateConfig({ disableConfirm: count === 0 })
      }

      const resetAbortState = () => {
        uploadAbortControllersRef.current.forEach((controller) => controller.abort())
        uploadAbortControllersRef.current.clear()
      }

      const handleBulkCancel = () => {
        isUploadCancelledRef.current = true
        resetAbortState()
        displayClose()
        toastService.info('Đã huỷ tải lên')
      }

      const markUploadsFailed = (
        uploads: BulkUploadItem[],
        messageByClientId: Record<string, string>,
        fallbackMessage: string
      ) => {
        bulkUploadFormRef.current?.setItemsPatch(
          uploads.map((upload) => ({
            clientId: upload.clientId,
            status: 'failed',
            error: messageByClientId[upload.clientId] || fallbackMessage,
          }))
        )
      }

      const handleBulkCreateConfirm = async () => {
        const values = bulkUploadFormRef.current?.getValidatedValues()
        if (!values) return

        const pendingUploads = values.uploads.filter((upload) => upload.status !== 'done')
        if (pendingUploads.length === 0) return

        isUploadCancelledRef.current = false
        resetAbortState()

        try {
          setLoading(true)

          const uploadResults = await Promise.all(
            pendingUploads.map(async (upload) => {
              if (!upload.file) {
                return {
                  clientId: upload.clientId,
                  ok: false as const,
                  error: 'Không tìm thấy file gốc để tải lại',
                }
              }

              bulkUploadFormRef.current?.setItemsPatch([
                {
                  clientId: upload.clientId,
                  status: 'presigning',
                  error: undefined,
                },
              ])

              try {
                const file = upload.file
                const fileExtension = getExtension(upload.fileName)
                const presignFileName = fileExtension
                  ? upload.title.endsWith(fileExtension)
                    ? upload.title
                    : `${upload.title}${fileExtension}`
                  : upload.title

                const presign = await presignFileMutation.mutateAsync({
                  file_name: presignFileName,
                  file_type: file.type || 'application/octet-stream',
                  purpose: uploadPurpose,
                })

                if (isUploadCancelledRef.current) {
                  return {
                    clientId: upload.clientId,
                    ok: false as const,
                    cancelled: true as const,
                  }
                }

                const abortController = new AbortController()
                uploadAbortControllersRef.current.set(upload.clientId, abortController)

                bulkUploadFormRef.current?.setItemsPatch([
                  {
                    clientId: upload.clientId,
                    status: 'uploading',
                    token: presign.file_token,
                  },
                ])

                const uploadResponse = await fetch(presign.upload_url, {
                  method: 'PUT',
                  body: file,
                  headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                  },
                  signal: abortController.signal,
                })

                if (!uploadResponse.ok) {
                  return {
                    clientId: upload.clientId,
                    ok: false as const,
                    error: 'Upload file thất bại',
                  }
                }

                return {
                  clientId: upload.clientId,
                  ok: true as const,
                  token: presign.file_token,
                  title: upload.title,
                  description: upload.description ?? '',
                }
              } catch (error) {
                if (isUploadCancelledRef.current) {
                  return {
                    clientId: upload.clientId,
                    ok: false as const,
                    cancelled: true as const,
                  }
                }
                return {
                  clientId: upload.clientId,
                  ok: false as const,
                  error: extractErrorMessage(error, 'Không thể tải lại tệp để tạo tài liệu'),
                }
              } finally {
                uploadAbortControllersRef.current.delete(upload.clientId)
              }
            })
          )

          if (isUploadCancelledRef.current) {
            const cancelledError = Object.assign(
              new Error('project_documents_bulk_create_cancelled'),
              {
                isApiError: true,
                skipToast: true,
              }
            )
            throw cancelledError
          }

          const uploadFailedMessageByClientId = Object.fromEntries(
            uploadResults
              .filter((result) => !result.ok && !result.cancelled)
              .map((result) => [result.clientId, result.error || 'Không thể tải lại tệp'])
          )

          if (Object.keys(uploadFailedMessageByClientId).length > 0) {
            markUploadsFailed(
              pendingUploads.filter((upload) => uploadFailedMessageByClientId[upload.clientId]),
              uploadFailedMessageByClientId,
              'Không thể tải lại tệp'
            )
          }

          const uploadedForCreate = uploadResults.filter((result) => result.ok)
          if (uploadedForCreate.length === 0) {
            const noUploadSuccessError = Object.assign(
              new Error('project_documents_bulk_create_upload_failed'),
              {
                isApiError: true,
                skipToast: true,
              }
            )
            throw noUploadSuccessError
          }

          bulkUploadFormRef.current?.setItemsPatch(
            uploadedForCreate.map((result) => ({
              clientId: result.clientId,
              status: 'creating',
              error: undefined,
              token: result.token,
            }))
          )

          // Q&A #7 fallback (implementation-plan.md §8): BE chưa tự set department khi
          // upload file ở DEPARTMENT scope (parent=null). FE fallback dự kiến inject
          // `department: currentUser.department_id` vào payload — nhưng `Me` schema chưa
          // expose department_id (chỉ có employee.department dạng string). Khi BE phơi
          // department_id qua /api/me/ hoặc bổ sung tự-set ở phía BE, gắn nó vào đây.
          const filesPayload = uploadedForCreate.map((result) => ({
            file_token: result.token,
            title: result.title,
            description: result.description ?? '',
            [uploadPurposeConfig.parentFieldName]: currentParentId,
            visibility: values.visibility,
          }))

          const result = await createMutation.mutateAsync({
            projectId,
            data: {
              files: filesPayload,
            },
          } as any)

          const failedItems =
            (
              result as {
                failed_items?: Array<{ file_token?: string; name?: string; error?: string }>
              } | null
            )?.failed_items ?? []

          const failedMessageByClientId: Record<string, string> = {}
          const uploadedClientIdByToken = Object.fromEntries(
            uploadedForCreate.map((upload) => [upload.token, upload.clientId])
          )

          failedItems.forEach((failedItem) => {
            if (!failedItem.file_token) return
            const clientId = uploadedClientIdByToken[failedItem.file_token]
            if (!clientId) return
            failedMessageByClientId[clientId] = failedItem.error || 'Tạo tài liệu thất bại'
          })

          const failedTokenSet = new Set(
            failedItems
              .map((failedItem) => failedItem.file_token)
              .filter((token): token is string => !!token)
          )

          bulkUploadFormRef.current?.setItemsPatch(
            uploadedForCreate.map((upload) => ({
              clientId: upload.clientId,
              status: failedTokenSet.has(upload.token) ? 'failed' : 'done',
              error: failedMessageByClientId[upload.clientId],
            }))
          )

          const createdCount = uploadedForCreate.length - failedItems.length
          const attemptedCount = pendingUploads.length

          if (failedItems.length === 0 && createdCount === attemptedCount) {
            toastService.success(
              attemptedCount === 1
                ? 'Tạo tài liệu thành công'
                : `Tạo ${attemptedCount} tài liệu thành công`
            )
            onSuccess?.()
            displayClose()
            return
          }

          const firstError = failedItems[0]?.error || 'Một số tệp tạo tài liệu thất bại'
          if (createdCount > 0) {
            toastService.warning(`Đã tạo ${createdCount}/${attemptedCount} tài liệu. ${firstError}`)
            onSuccess?.()
          } else if (failedItems.length > 0) {
            toastService.error(firstError)
          }

          const partialOrFailedError = Object.assign(
            new Error('project_documents_bulk_create_partial_or_failed'),
            {
              isApiError: true,
              skipToast: true,
            }
          )
          throw partialOrFailedError
        } catch (error) {
          if ((error as any)?.skipToast) {
            throw error
          }
          const fallbackMessage = extractErrorMessage(error, 'Không thể tạo tài liệu')
          const creatingUploads =
            bulkUploadFormRef.current
              ?.getAllValues()
              .uploads.filter((upload) => upload.status === 'creating') ?? []
          if (creatingUploads.length > 0) {
            markUploadsFailed(creatingUploads, {}, fallbackMessage)
          }
          toastService.error(fallbackMessage)
          const apiError = Object.assign(new Error('project_documents_bulk_create_failed'), {
            isApiError: true,
            skipToast: true,
          })
          throw apiError
        } finally {
          resetAbortState()
          setLoading(false)
        }
      }

      displayCustom({
        size: '2xl',
        title: dialogTitle,
        destroyOnClose: true,
        disableBackdropClose: true,
        disableConfirm: validInitialUploads.length === 0,
        content: (
          <ProjectDocumentBulkUploadList
            ref={bulkUploadFormRef}
            initialUploads={initialBulkItems}
            visibilityOptions={visibilityOptions}
            initialVisibility={defaultVisibility}
            visibilityLocked={lockCreateDialogVisibility}
            onUploadsChange={handleUploadsChange}
            showUploadArea={showUploadArea}
          />
        ),
        confirmText: 'Tạo tài liệu',
        cancelText: 'Huỷ',
        onConfirm: handleBulkCreateConfirm,
        onCancel: handleBulkCancel,
        footerFlexJustify: 'end',
      })
      return
    },
    [
      createMutation,
      dialogTitle,
      displayClose,
      displayCustom,
      presignFileMutation,
      setLoading,
      updateConfig,
      uploadPurpose,
      visibilityOptions,
    ]
  )

  return {
    openCreateDialog,
  }
}
