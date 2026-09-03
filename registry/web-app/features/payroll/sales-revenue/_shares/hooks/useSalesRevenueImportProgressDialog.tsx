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
  const percentage = Math.min(Math.round(job?.percentage ?? 0), 100)

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

export function useSalesRevenueImportProgressDialog() {
  const { displayConfirm, displayClose, updateConfig } = useDialog()
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
    const finalJob = finalJobRef.current ?? currentJob

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
  }, [currentJob])

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
          Đang nhập dữ liệu
          <span className="dot-loader" />
        </span>
      ),
      content: <ProgressContent job={currentJob} isFetching={isFetching} />,
      confirmText: 'Xoá',
      cancelText: 'Huỷ',
      confirmButtonClassName: 'w-[150px]',
      cancelButtonClassName: 'w-[150px]',
      onConfirm: handleUserCancel,
      onCancel: handleUserCancel,
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [currentJob, handleClose, handleUserCancel, isFetching])

  useEffect(() => {
    if (!isOpen || !jobId) {
      return
    }

    displayConfirm(createConfig())
    hasDisplayedRef.current = true

    return () => {
      hasDisplayedRef.current = false
    }
  }, [createConfig, displayConfirm, isOpen, jobId])

  useEffect(() => {
    if (!isOpen || !hasDisplayedRef.current) {
      return
    }

    updateConfig(createConfig())
  }, [createConfig, isOpen, updateConfig])

  useEffect(() => {
    if (!isOpen || !statusData) {
      return
    }

    setCurrentJob(statusData)

    if (['succeeded', 'failed', 'cancelled'].includes(statusData.status)) {
      finalJobRef.current = statusData
      displayClose()
    }
  }, [displayClose, isOpen, statusData])

  const openProgressDialog = useCallback((jobIdToTrack: string) => {
    return new Promise<ImportJob>((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      finalJobRef.current = null
      setCurrentJob(null)
      setJobId(jobIdToTrack)
      setIsOpen(true)
    })
  }, [])

  return { openProgressDialog }
}
