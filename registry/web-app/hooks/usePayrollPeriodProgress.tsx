import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '../hooks/useDialog.ts'
import { useSalaryPeriodTaskStatus } from '@/features/payroll/services/salary-period-service'
import PayrollPeriodProgressDialog from '@/components/payroll/PayrollPeriodProgressDialog'
import { extractErrorMessage } from '@/utils/error-utils'

type PayrollPeriodProgressOptions<TParams> = {
  /** Function to call create payroll period API */
  createFunction: (params: TParams) => Promise<any>
  /** Callback when creation succeeds */
  onSuccess?: () => void
  /** Callback when creation fails */
  onError?: (error: string) => void
}

export function usePayrollPeriodProgress<
  TParams extends Record<string, any> = Record<string, any>,
>({ createFunction, onSuccess, onError }: PayrollPeriodProgressOptions<TParams>) {
  const { displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const [taskId, setTaskId] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [lastParams, setLastParams] = useState<TParams | null>(null)

  // Poll task status
  const { data: taskStatus } = useSalaryPeriodTaskStatus(taskId || '', {
    enabled: !!taskId && hasStarted,
  })

  // Handle cancel
  const handleCancel = useCallback(() => {
    // Cancel ongoing status polling queries
    if (taskId) {
      queryClient.cancelQueries({
        queryKey: ['payroll', 'salary-periods', 'task-status', taskId],
      })
    }

    // Stop polling by clearing taskId
    setTaskId(null)
    setHasStarted(false)
    setLastParams(null)

    // Close dialog
    displayClose()
  }, [taskId, queryClient, displayClose])

  const openProgressDialog = useCallback(
    async (params: TParams) => {
      let jobStarted = false

      try {
        setHasStarted(true)
        setTaskId(null)
        setLastParams(params)

        // Call create API
        const response = await createFunction(params)

        // Check if we got a task_id (async operation)
        if (!response || !response.data || !response.data.task_id) {
          // If no task_id, show success immediately (synchronous operation)
          displayCustom({
            title: '',
            size: 'md',
            disableBackdropClose: true,
            hideFooter: true,
            content: (
              <PayrollPeriodProgressDialog
                progress={100}
                status="success"
                onCancel={() => {
                  displayClose()
                  if (onSuccess) {
                    onSuccess()
                  }
                }}
              />
            ),
          })
          setHasStarted(false)
          return
        }

        const newTaskId = response.data.task_id

        setTaskId(newTaskId)
        jobStarted = true

        // Show dialog immediately
        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <PayrollPeriodProgressDialog progress={0} status="pending" onCancel={handleCancel} />
          ),
        })
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error, 'Không thể bắt đầu tạo kỳ lương')

        displayCustom({
          title: '',
          size: 'md',
          disableBackdropClose: true,
          hideFooter: true,
          content: (
            <PayrollPeriodProgressDialog
              progress={0}
              status="failure"
              error={errorMessage}
              onCancel={handleCancel}
              onRetry={() => {
                displayClose()
                // Retry by reopening dialog
                if (lastParams) {
                  setTimeout(() => {
                    openProgressDialog(lastParams)
                  }, 300)
                }
              }}
            />
          ),
        })
        setHasStarted(false)

        if (onError) {
          onError(errorMessage)
        }
      } finally {
        if (!jobStarted) {
          setHasStarted(false)
        }
      }
    },
    [displayCustom, displayClose, createFunction, handleCancel, lastParams, onSuccess, onError]
  )

  // Update dialog content when status changes
  useEffect(() => {
    if (!hasStarted || !taskStatus) return

    const state = taskStatus.state?.toUpperCase()
    const meta = taskStatus.meta as
      | { current?: number; total?: number; status?: string }
      | undefined
    const progress =
      meta?.current && meta?.total ? Math.round((meta.current / meta.total) * 100) : 0
    const error = taskStatus.result ? (taskStatus.result as { message?: string })?.message : null

    // Determine status
    let dialogStatus: 'pending' | 'progress' | 'success' | 'failure' = 'pending'
    if (state === 'SUCCESS') {
      dialogStatus = 'success'
    } else if (state === 'FAILURE') {
      dialogStatus = 'failure'
    } else if (state === 'PROGRESS' || progress > 0) {
      dialogStatus = 'progress'
    }

    // Update dialog content
    displayCustom({
      title: '',
      size: 'md',
      disableBackdropClose: true,
      hideFooter: true,
      content: (
        <PayrollPeriodProgressDialog
          progress={progress}
          status={dialogStatus}
          error={error || null}
          onCancel={handleCancel}
          onRetry={() => {
            displayClose()
            // Retry by reopening dialog
            if (lastParams) {
              setTimeout(() => {
                openProgressDialog(lastParams)
              }, 300)
            }
          }}
          onClose={() => {
            displayClose()
            setHasStarted(false)
            setTaskId(null)
            setLastParams(null)
            if (dialogStatus === 'success' && onSuccess) {
              onSuccess()
            }
          }}
        />
      ),
    })

    // Auto close and trigger callback on success
    if (state === 'SUCCESS') {
      setTimeout(() => {
        displayClose()
        setHasStarted(false)
        setTaskId(null)
        setLastParams(null)
        if (onSuccess) {
          onSuccess()
        }
      }, 1000) // Delay 1s to show success state
    } else if (state === 'FAILURE') {
      setHasStarted(false)
      setTaskId(null)
      setLastParams(null)
    }
  }, [
    taskStatus,
    hasStarted,
    displayCustom,
    handleCancel,
    lastParams,
    openProgressDialog,
    displayClose,
    onSuccess,
  ])

  return {
    openProgressDialog,
    isProcessing: hasStarted,
  }
}
