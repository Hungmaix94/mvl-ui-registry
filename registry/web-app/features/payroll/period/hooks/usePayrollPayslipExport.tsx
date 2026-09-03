import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import {
  getPayrollSlipService,
  type GetPayrollSlipsByPeriodExportParams,
} from '@/features/payroll/services/payroll-slip-service'
import { useSalaryPeriodTaskStatus } from '@/features/payroll/services/salary-period-service'
import { extractErrorMessage } from '@/utils/error-utils'
import ExportProgressDialog from '@/components/export/ExportProgressDialog'
import { ExportDelivery } from '@/constants/api-schema-aliases'

export function usePayrollPayslipExport() {
  const { displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null)

  // Poll status using useSalaryPeriodTaskStatus
  const { data: statusData, isLoading: isPolling } = useSalaryPeriodTaskStatus(taskId || '', {
    enabled: !!taskId,
  })

  // Handle cancel/close
  const handleCancel = useCallback(() => {
    // Cancel polling queries if any
    if (taskId) {
      queryClient.cancelQueries({
        queryKey: ['payroll', 'salary-periods', 'task-status', taskId],
      })
    }

    setTaskId(null)
    setHasStarted(false)
    setCurrentPeriodId(null)
    displayClose()
  }, [taskId, queryClient, displayClose])

  // Trigger export
  const openExportDialog = useCallback(
    async (salaryPeriodId: number) => {
      try {
        setHasStarted(true)
        setTaskId(null)
        setCurrentPeriodId(salaryPeriodId)

        // Show initial dialog
        displayCustom({
          title: 'Xuất dữ liệu',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: <ExportProgressDialog progress={0} status="pending" onCancel={handleCancel} />,
        })

        // Call export API with async=true
        const params: GetPayrollSlipsByPeriodExportParams = {
          async: true,
          delivery: ExportDelivery.link,
        }
        const response = await getPayrollSlipService().exportPayrollSlipsByPeriod(
          salaryPeriodId,
          params
        )

        // Check for task_id in response
        const newTaskId = (response as any)?.task_id

        if (!newTaskId) {
          throw new Error('No task ID returned from export API')
        }

        setTaskId(newTaskId)
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Không thể bắt đầu xuất dữ liệu')
        displayCustom({
          title: 'Xuất dữ liệu',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <ExportProgressDialog
              progress={0}
              status="failure"
              error={errorMessage}
              onCancel={handleCancel}
              onRetry={() => {
                displayClose()
                setTimeout(() => openExportDialog(salaryPeriodId), 300)
              }}
            />
          ),
        })
        setHasStarted(false)
      }
    },
    [displayCustom, handleCancel, displayClose]
  )

  // Update dialog on status change
  useEffect(() => {
    if (!hasStarted || !statusData) return

    // Response structure: { task_id, state, result?, meta? }
    const rawState = (statusData as any).state as string
    const meta = (statusData as any).meta as Record<string, any> | undefined
    const result = (statusData as any).result

    const state = rawState?.toLowerCase()

    // Extract progress from meta
    let progress = 0
    if (meta && typeof meta.percent === 'number') {
      progress = meta.percent
    } else if (
      meta &&
      typeof meta.current === 'number' &&
      typeof meta.total === 'number' &&
      meta.total > 0
    ) {
      progress = Math.round((meta.current / meta.total) * 100)
    }

    // Extract download URL and filename from result when successful
    let downloadUrl: string | null = null
    let filename: string | null = null

    if (state === 'success' || state === 'succeeded' || state === 'successful') {
      // Try to extract file info from result
      if (result) {
        if (typeof result === 'object') {
          downloadUrl =
            (result as any).file_url || (result as any).url || (result as any).download_url || null
          const filePath = (result as any).file_path || null
          filename = filePath
            ? filePath.split('/').pop() || 'payroll-slips-by-period.xlsx'
            : 'payroll-slips-by-period.xlsx'
        }
      }
    }

    const error =
      state === 'failure' || state === 'failed'
        ? typeof result === 'string'
          ? result
          : (result as any)?.message || JSON.stringify(result)
        : null

    let exportStatus: 'pending' | 'progress' | 'success' | 'failure' = 'pending'

    if (state === 'success' || state === 'succeeded' || state === 'successful') {
      exportStatus = 'success'
      progress = 100
    } else if (state === 'failure' || state === 'failed' || state === 'revoked') {
      exportStatus = 'failure'
    } else if (state === 'started' || state === 'progress' || (progress > 0 && progress < 100)) {
      exportStatus = 'progress'
    }

    displayCustom({
      title: 'Xuất dữ liệu',
      size: 'md',
      disableBackdropClose: true,
      hideFooter: true,
      content: (
        <ExportProgressDialog
          progress={progress}
          status={exportStatus}
          downloadUrl={downloadUrl}
          filename={filename || 'payroll-slips-by-period.xlsx'}
          error={error}
          onCancel={handleCancel}
          onRetry={() => {
            if (currentPeriodId) {
              displayClose()
              setTimeout(() => openExportDialog(currentPeriodId), 300)
            }
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
    }
  }, [
    statusData,
    hasStarted,
    displayCustom,
    handleCancel,
    displayClose,
    openExportDialog,
    currentPeriodId,
  ])

  return {
    openExportDialog,
    isExporting: hasStarted || isPolling,
  }
}
