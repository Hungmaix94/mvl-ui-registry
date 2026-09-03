import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import {
  useRecalculateSalaryPeriod,
  useSalaryPeriodTaskStatus,
} from '@/features/payroll/services/salary-period-service'
import { extractErrorMessage } from '@/utils/error-utils'
import RecalculateProgressDialog from '../components/RecalculateProgressDialog'

export function useRecalculatePayslip() {
  const { displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentPeriodId, setCurrentPeriodId] = useState<number | null>(null)

  // API hooks
  const recalculateMutation = useRecalculateSalaryPeriod()

  // Poll status
  const { data: statusData, isLoading: isPolling } = useSalaryPeriodTaskStatus(taskId || '', {
    enabled: !!taskId,
  })

  // Handle cancel/close
  const handleClose = useCallback(() => {
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

    // Refresh data on close if success
    const state = (statusData as any)?.state?.toLowerCase()
    if (state === 'success' || state === 'succeeded' || state === 'successful') {
      queryClient.invalidateQueries({
        queryKey: ['payroll', 'payroll-slips', 'list'],
      })
      // Also invalidate period details if needed
      queryClient.invalidateQueries({
        queryKey: ['payroll', 'salary-periods', 'detail', currentPeriodId],
      })
    }
  }, [taskId, queryClient, displayClose, statusData, currentPeriodId])

  // Trigger recalculation
  const recalculate = useCallback(
    async (salaryPeriodId: number) => {
      try {
        setHasStarted(true)
        setTaskId(null)
        setCurrentPeriodId(salaryPeriodId)

        // Show initial dialog
        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <RecalculateProgressDialog
              progress={0}
              status="pending"
              onCancel={handleClose}
              onClose={handleClose}
            />
          ),
        })

        // Call API
        const response = await recalculateMutation.mutateAsync(salaryPeriodId)

        // Check for task_id in response (now returns raw data)
        const newTaskId = response.task_id

        if (!newTaskId) {
          // Immediate success or failure without async task?
          throw new Error('No task ID returned')
        }

        setTaskId(newTaskId)
      } catch (error) {
        const errorMessage = extractErrorMessage(error, 'Không thể bắt đầu tính lại lương')
        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <RecalculateProgressDialog
              progress={0}
              status="failure"
              error={errorMessage}
              onCancel={handleClose}
              onClose={handleClose}
              onRetry={() => {
                displayClose()
                setTimeout(() => recalculate(salaryPeriodId), 300)
              }}
            />
          ),
        })
        setHasStarted(false)
      }
    },
    [recalculateMutation, displayCustom, handleClose, displayClose]
  )

  // Update dialog on status change
  useEffect(() => {
    if (!hasStarted || !statusData) return

    // Response structure based on type-check: { task_id, state, result?, meta? }
    const rawState = (statusData as any).state as string
    const meta = (statusData as any).meta as Record<string, any> | undefined
    const result = (statusData as any).result

    const state = rawState?.toLowerCase()

    // Attempt to extract progress from meta (common celery pattern)
    // meta could be { current: number, total: number, percent: number, ... }
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

    const error =
      state === 'failure' || state === 'failed'
        ? typeof result === 'string'
          ? result
          : JSON.stringify(result)
        : undefined

    let dialogStatus: 'pending' | 'progress' | 'success' | 'failure' = 'pending'

    if (state === 'success' || state === 'succeeded' || state === 'successful') {
      dialogStatus = 'success'
      progress = 100
    } else if (state === 'failure' || state === 'failed' || state === 'revoked') {
      dialogStatus = 'failure'
    } else if (state === 'started' || state === 'progress' || (progress > 0 && progress < 100)) {
      dialogStatus = 'progress'
    }

    displayCustom({
      title: '',
      size: 'md',
      disableBackdropClose: true,
      hideFooter: true,
      content: (
        <RecalculateProgressDialog
          progress={progress}
          status={dialogStatus}
          error={error}
          onCancel={handleClose}
          onClose={handleClose}
          onRetry={() => {
            if (currentPeriodId) {
              displayClose()
              // allow retry
              setTimeout(() => recalculate(currentPeriodId), 300)
            }
          }}
        />
      ),
    })

    if (dialogStatus === 'success' || dialogStatus === 'failure') {
      setHasStarted(false)
      setTaskId(null)
    }
  }, [
    statusData,
    hasStarted,
    displayCustom,
    handleClose,
    displayClose,
    recalculate,
    currentPeriodId,
  ])

  return {
    recalculate,
    isRecalculating: hasStarted || isPolling,
  }
}
