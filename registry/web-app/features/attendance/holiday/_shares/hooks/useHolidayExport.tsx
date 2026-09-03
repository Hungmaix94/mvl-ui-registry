import { useCallback, useState, useEffect } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useExportHolidays,
  useExportStatus,
  GetHrmHolidaysExportParams,
} from '@/services/export-service.ts'
import ExportProgressDialog from '@/components/export/ExportProgressDialog.tsx'

const DEFAULT_FILENAME = 'holidays.xlsx'

export function useHolidayExport() {
  const { displayCustom, displayClose } = useDialog()
  const [exportParams, setExportParams] = useState<GetHrmHolidaysExportParams | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Trigger export when params are set
  const { data: exportData, isLoading: isExporting } = useExportHolidays(
    exportParams ?? undefined,
    { enabled: !!exportParams }
  )

  // Poll export status if we have a task ID
  const { data: statusData } = useExportStatus(taskId || '', {
    enabled: !!taskId,
  })

  // Handle initial export response
  useEffect(() => {
    if (!exportData || !hasStarted) return

    if ('task_id' in exportData && typeof exportData.task_id === 'string') {
      setTaskId(exportData.task_id)
      displayCustom({
        title: '',
        size: 'md',
        disableBackdropClose: true,
        hideFooter: true,
        content: <ExportProgressDialog progress={0} status="pending" onCancel={handleCancel} />,
      })
    }
  }, [exportData, hasStarted])

  // Update dialog based on status
  useEffect(() => {
    if (!hasStarted || !statusData) return

    const status = statusData.status?.toLowerCase()
    const progress = statusData.percent || 0
    const downloadUrl = statusData.file_url
    const filePath = statusData.file_path
    const error = statusData.error
    const filename = filePath ? filePath.split('/').pop() : DEFAULT_FILENAME

    let exportStatus: 'pending' | 'progress' | 'success' | 'failure' = 'pending'
    if (status === 'success') {
      exportStatus = 'success'
    } else if (status === 'failure') {
      exportStatus = 'failure'
    } else if (status === 'progress' || progress > 0) {
      exportStatus = 'progress'
    }

    displayCustom({
      title: '',
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
            setTimeout(() => {
              openExportDialog()
            }, 300)
          }}
          onDownload={() => {
            displayClose()
          }}
        />
      ),
    })

    if (exportStatus === 'success' || exportStatus === 'failure') {
      setHasStarted(false)
      setTaskId(null)
      setExportParams(null)
    }
  }, [statusData, hasStarted])

  const handleCancel = useCallback(() => {
    setTaskId(null)
    setHasStarted(false)
    setExportParams(null)
    displayClose()
  }, [displayClose])

  const openExportDialog = useCallback(async () => {
    const params: GetHrmHolidaysExportParams = {
      async: true,
      // delivery: 'link', // Uncomment if backend supports delivery param for holidays
    }
    setHasStarted(true)
    setExportParams(params)
  }, [])

  return {
    openExportDialog,
    isExporting: isExporting || hasStarted,
  }
}
