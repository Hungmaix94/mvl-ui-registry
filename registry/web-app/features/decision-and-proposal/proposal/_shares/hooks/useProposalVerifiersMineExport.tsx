import { useCallback, useState, useEffect } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useExportProposalVerifiersMine,
  type GetProposalVerifiersMineExportParams,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import { useExportStatus } from '@/services/export-service.ts'
import ExportProgressDialog from '@/components/export/ExportProgressDialog.tsx'
import { ExportDelivery } from '@/constants/api-schema-aliases'

const DEFAULT_FILENAME = 'proposal-verifiers-mine.xlsx'

export function useProposalVerifiersMineExport() {
  const { displayCustom, displayClose } = useDialog()
  const [exportParams, setExportParams] = useState<GetProposalVerifiersMineExportParams | null>(
    null
  )
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Trigger export when params are set
  const { data: exportData, isLoading: isExporting } = useExportProposalVerifiersMine(
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
              if (exportParams) {
                openExportDialog(exportParams)
              }
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

  const openExportDialog = useCallback((params: GetProposalVerifiersMineExportParams) => {
    const exportParamsWithAsync: GetProposalVerifiersMineExportParams = {
      ...params,
      async: true,
      delivery: ExportDelivery.link,
    }
    setHasStarted(true)
    setExportParams(exportParamsWithAsync)
  }, [])

  return {
    openExportDialog,
    isExporting: isExporting || hasStarted,
  }
}
