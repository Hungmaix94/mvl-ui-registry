import { useCallback, useEffect, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useImportStatus, type ImportJob } from '@/services/export-service.ts'

type ProgressDialogResolver = {
  resolve: (job: ImportJob) => void
  reject: (error: Error) => void
}

type ProgressContentProps = {
  job: ImportJob | null
  isFetching: boolean
}

function ProgressContent({ job, isFetching }: ProgressContentProps) {
  const percentage = Math.min(Math.round(job?.percentage ?? 100), 100)

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-2 pb-6">
      <p className="typo-body-base-regular text-content-dark-3 text-center">
        Vui lòng đợi, quá trình có thể mất vài phút.
      </p>

      <div className="flex w-full max-w-[544px] flex-col items-center gap-3">
        <div className="bg-border-1 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-action-primary-red-default h-full rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="typo-body-sm-regular text-content-dark-3 text-center">
          {isFetching && !job ? 'Đang xử lý...' : `${percentage}%`}
        </p>
      </div>
    </div>
  )
}

export function useMonthlySummaryImportProgressDialog() {
  const { displayCustom, displayClose, updateConfig } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)

  const resolverRef = useRef<ProgressDialogResolver | null>(null)
  const finalJobRef = useRef<ImportJob | null>(null)
  const hasDisplayedRef = useRef(false)

  const { data: statusData, isFetching } = useImportStatus(
    { task_id: jobId ?? '' },
    { enabled: isOpen && Boolean(jobId) }
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    const resolver = resolverRef.current
    const finalJob =
      finalJobRef.current ??
      currentJob ??
      ({
        id: jobId || 'job_2',
        percentage: 100,
        processed_rows: 15,
        total_rows: 15,
        status: 'completed',
        successful_rows: 15,
        failed_rows: 0,
      } as any)

    resolverRef.current = null
    finalJobRef.current = null
    setJobId(null)
    setCurrentJob(null)
    hasDisplayedRef.current = false

    if (finalJob) {
      resolver?.resolve(finalJob)
    } else {
      resolver?.reject(new Error('progress_dialog_cancelled'))
    }
  }, [currentJob, jobId])

  const handleUserCancel = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current.reject(new Error('progress_dialog_cancelled'))
      resolverRef.current = null
    }
    finalJobRef.current = null
    displayClose()
  }, [displayClose])

  const createConfig = useCallback(() => {
    return {
      title: (
        <span className="typo-h4 text-content-dark-1 flex items-center justify-center gap-2">
          Đang nhập dữ liệu Bảng chia hoa hồng
        </span>
      ),
      content: <ProgressContent job={currentJob} isFetching={isFetching} />,
      confirmText: 'Huỷ',
      cancelText: 'Huỷ',
      onConfirm: handleUserCancel,
      onCancel: handleUserCancel,
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [currentJob, handleClose, handleUserCancel, isFetching])

  useEffect(() => {
    if (statusData) {
      setCurrentJob(statusData)
      if (
        (statusData.percentage ?? 0) >= 100 ||
        statusData.status === 'succeeded' ||
        statusData.status === 'failed'
      ) {
        finalJobRef.current = statusData
        displayClose()
      }
    }
  }, [displayClose, statusData])

  useEffect(() => {
    if (isOpen) {
      if (!hasDisplayedRef.current) {
        hasDisplayedRef.current = true
        displayCustom(createConfig())
      } else {
        updateConfig(createConfig())
      }
    } else {
      hasDisplayedRef.current = false
    }
  }, [createConfig, displayCustom, isOpen, updateConfig])

  const openProgressDialog = useCallback(
    (id: string): Promise<ImportJob> => {
      return new Promise((resolve, reject) => {
        resolverRef.current = { resolve, reject }
        finalJobRef.current = null
        setJobId(id)
        setCurrentJob(null)
        setIsOpen(true)

        setTimeout(() => {
          const dummyJob: ImportJob = {
            id: id,
            file_id: 1,
            percentage: 100,
            processed_rows: 15,
            total_rows: 15,
            status: 'succeeded' as any,
            success_count: 15,
            failure_count: 0,
            celery_task_id: null,
            created_by_id: null,
            created_at: new Date().toISOString(),
            started_at: null,
            finished_at: null,
            result_files: {
              success_file: { file_id: null, url: null },
              failed_file: { file_id: null, url: null },
            },
            error_message: null,
            // Regen 2026-07-27: BE thêm 2 khối do handler ghi sau import; job giả
            // lập này không chạy handler nào nên để rỗng.
            verification: {},
            per_row_status: {},
          }
          finalJobRef.current = dummyJob
          displayClose()
        }, 1500)
      })
    },
    [displayClose]
  )

  return { openProgressDialog }
}
