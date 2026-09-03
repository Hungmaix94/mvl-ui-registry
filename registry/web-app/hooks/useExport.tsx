import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '../hooks/useDialog.ts'
import { useExportStatus } from '@/services/export-service.ts'
import { extractErrorMessage } from '@/utils/error-utils'
import ExportProgressDialog from '@/components/export/ExportProgressDialog.tsx'
import { QUERY_KEYS } from '@/constants'

type ExportOptions<TParams> = {
  /** Function to call export API */
  exportFunction: (params: TParams) => Promise<any>
  /** Default filename for exported file */
  defaultFilename: string
}

type SyncExportResult =
  | {
      url?: string | null
      filename?: string | null
      file_url?: string | null
      file_path?: string | null
      error?: string | null
    }
  | null
  | undefined

export function useExport<TParams extends Record<string, any> = Record<string, any>>({
  exportFunction,
  defaultFilename,
}: ExportOptions<TParams>) {
  const { displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [lastParams, setLastParams] = useState<TParams | null>(null)

  // Poll export status
  const { data: statusData, isLoading: isPolling } = useExportStatus(taskId || '', {
    enabled: !!taskId,
  })

  // Handle cancel export
  const handleCancel = useCallback(() => {
    // Cancel ongoing status polling queries
    if (taskId) {
      queryClient.cancelQueries({
        queryKey: QUERY_KEYS.EXPORT.STATUS(taskId),
      })
    }

    // Stop polling by clearing taskId
    setTaskId(null)
    setHasStarted(false)
    setLastParams(null)

    // Close dialog
    displayClose()
  }, [taskId, queryClient, displayClose])

  const openExportDialog = useCallback(
    async (params: TParams) => {
      const isAsync = Boolean((params && params.async) || (params && params?.params?.async))
      let jobStarted = false

      setHasStarted(true)
      setTaskId(null)
      setLastParams(params)

      // Show dialog immediately so user sees feedback before API responds
      displayCustom({
        title: 'Xuất dữ liệu',
        size: 'md',
        disableBackdropClose: true,
        hideFooter: true,
        content: <ExportProgressDialog progress={0} status="pending" onCancel={handleCancel} />,
      })

      try {
        // Call export API (dialog already visible)
        const response = await exportFunction(params)
        // Handle async export if task_id is returned
        if (isAsync) {
          const asyncResponse = response
          const newTaskId = asyncResponse.task_id

          setTaskId(newTaskId)
          jobStarted = true
          return
        }

        const syncResponse = response as SyncExportResult

        const downloadUrl =
          syncResponse?.url ??
          syncResponse?.file_url ??
          (typeof syncResponse?.file_path === 'string' ? syncResponse?.file_path : null)
        const filename =
          syncResponse?.filename ??
          (typeof syncResponse?.file_path === 'string'
            ? syncResponse?.file_path?.split('/').pop() || null
            : null) ??
          defaultFilename

        if (!downloadUrl) {
          throw new Error(syncResponse?.error || 'Không tìm thấy dữ liệu xuất')
        }

        displayCustom({
          title: 'Xuất dữ liệu',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <ExportProgressDialog
              progress={100}
              status="success"
              downloadUrl={downloadUrl}
              filename={filename ?? defaultFilename}
              onCancel={handleCancel}
            />
          ),
        })
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Không thể bắt đầu xuất dữ liệu')
        displayCustom({
          title: 'Lỗi xuất dữ liệu',
          content: (
            <ExportProgressDialog
              progress={0}
              status="failure"
              error={errorMessage}
              onCancel={handleCancel}
            />
          ),
          hideFooter: true,
          size: 'md',
        })
      } finally {
        if (!jobStarted) {
          setHasStarted(false)
        }
      }
    },
    [defaultFilename, displayCustom, displayClose, exportFunction, handleCancel]
  )

  // Update dialog content when status changes
  useEffect(() => {
    if (!hasStarted || !statusData) return

    const status = statusData.status?.toLowerCase()
    const progress = statusData.percent || 0
    const downloadUrl = statusData.file_url
    const filePath = statusData.file_path
    const error = statusData.error
    const filename = filePath ? filePath.split('/').pop() : defaultFilename

    // Determine status
    let exportStatus: 'pending' | 'progress' | 'success' | 'failure' = 'pending'
    if (status === 'success') {
      exportStatus = 'success'
    } else if (status === 'failure') {
      exportStatus = 'failure'
    } else if (status === 'progress' || progress > 0) {
      exportStatus = 'progress'
    }

    // Update dialog content
    displayCustom({
      title: 'Xuất dữ liệu',
      size: 'md',
      disableBackdropClose: true,
      hideFooter: true,
      content: (
        <ExportProgressDialog
          progress={progress}
          status={exportStatus}
          downloadUrl={downloadUrl || null}
          filename={filename}
          error={error || null}
          onCancel={handleCancel}
          onRetry={() => {
            displayClose()
            // Retry by reopening dialog - this will trigger a new export
            if (lastParams) {
              setTimeout(() => {
                openExportDialog(lastParams)
              }, 300)
            }
          }}
          onDownload={() => {
            // Do not close dialog when user clicks download; user closes via "Đóng"
          }}
        />
      ),
    })

    if (exportStatus === 'success' || exportStatus === 'failure') {
      setHasStarted(false)
      setTaskId(null)
    }
  }, [
    statusData,
    hasStarted,
    displayCustom,
    displayClose,
    defaultFilename,
    openExportDialog,
    lastParams,
    handleCancel,
  ])

  return {
    openExportDialog,
    isExporting: isPolling || hasStarted,
  }
}
