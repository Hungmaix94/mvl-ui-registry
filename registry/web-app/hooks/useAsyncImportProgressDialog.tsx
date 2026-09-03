import { useCallback, useEffect, useRef, useState } from 'react'

import { useDialog } from '../hooks/useDialog.ts'
import { useImportStatus, type ImportJob } from '@/services/export-service.ts'
import { isTerminalImportStatus } from '@/utils/async-import-status'

const POLL_INTERVAL_MS = 2000
/** Trần thời gian poll: worker chết giữa chừng thì job đứng ở `running` mãi mãi. */
const POLL_DEADLINE_MS = 10 * 60 * 1000

type ProgressDialogResolver = {
  resolve: (job: ImportJob) => void
  reject: (error: Error) => void
}

type ProgressContentProps = {
  job: ImportJob | null
  isFetching: boolean
  timedOut: boolean
}

function ProgressContent({ job, isFetching, timedOut }: ProgressContentProps) {
  const percentage = Math.min(Math.round(job?.percentage ?? 0), 100)

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-2 pb-6">
      <p className="typo-body-base-regular text-content-dark-3 text-center">
        {timedOut
          ? 'Tiến trình chạy quá lâu và đã ngừng theo dõi. Tải lại trang để kiểm tra kết quả.'
          : 'Vui lòng đợi, quá trình có thể mất vài phút.'}
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

export type AsyncImportProgressDialogOptions = {
  /** Tiêu đề dialog, vd "Đang nhập danh sách căn". */
  title: string
  /** Nhãn nút xác nhận (thoát theo dõi), mặc định "Đóng". */
  confirmText?: string
}

/**
 * Dialog theo dõi tiến trình một job import bất đồng bộ: poll
 * `GET /api/import/status/?task_id=` cho tới khi job kết thúc rồi resolve job cuối.
 *
 * Tách dùng chung vì toàn bộ phần thân không có logic riêng của feature nào —
 * chỉ khác tiêu đề và nhãn nút. Trước đây mỗi feature tự giữ một bản sao gần như
 * giống hệt (hồ sơ nhân viên, khách hàng, hợp đồng, công tác phí…), nên một lỗi
 * chung phải vá ở từng nơi. Feature mới nên dùng hook này; các bản sao cũ sẽ
 * chuyển dần sang.
 *
 * Người dùng đóng dialog giữa chừng ⇒ promise reject với `progress_dialog_cancelled`.
 */
export function useAsyncImportProgressDialog({
  title,
  confirmText = 'Đóng',
}: AsyncImportProgressDialogOptions) {
  const { displayConfirm, displayClose, updateConfig } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const resolverRef = useRef<ProgressDialogResolver | null>(null)
  const finalJobRef = useRef<ImportJob | null>(null)
  const hasDisplayedRef = useRef(false)

  const { data: statusData, isFetching } = useImportStatus(
    { task_id: jobId ?? '' },
    {
      enabled: isOpen && Boolean(jobId) && !timedOut,
      staleTimeMs: POLL_INTERVAL_MS,
      refetchIntervalMs: POLL_INTERVAL_MS,
    }
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    const resolver = resolverRef.current
    const finalJob = finalJobRef.current ?? currentJob

    resolverRef.current = null
    finalJobRef.current = null
    setJobId(null)
    setCurrentJob(null)
    setTimedOut(false)
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
          {title}
          {!timedOut && <span className="dot-loader" />}
        </span>
      ),
      content: <ProgressContent job={currentJob} isFetching={isFetching} timedOut={timedOut} />,
      confirmText,
      cancelText: 'Huỷ',
      confirmButtonClassName: 'w-[150px]',
      cancelButtonClassName: 'w-[150px]',
      onConfirm: handleUserCancel,
      onCancel: handleUserCancel,
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [confirmText, currentJob, handleClose, handleUserCancel, isFetching, timedOut, title])

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

  // Trần thời gian: worker chết trong khi job còn `queued`/`running` thì không có
  // trạng thái kết thúc nào tới, nếu không chặn sẽ poll vô hạn.
  useEffect(() => {
    if (!isOpen || !jobId) {
      return
    }

    const timer = setTimeout(() => setTimedOut(true), POLL_DEADLINE_MS)
    return () => clearTimeout(timer)
  }, [isOpen, jobId])

  useEffect(() => {
    if (!isOpen || !statusData) {
      return
    }

    setCurrentJob(statusData)

    if (isTerminalImportStatus(statusData.status)) {
      finalJobRef.current = statusData
      displayClose()
    }
  }, [displayClose, isOpen, statusData])

  const openProgressDialog = useCallback((jobIdToTrack: string) => {
    return new Promise<ImportJob>((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      finalJobRef.current = null
      setCurrentJob(null)
      setTimedOut(false)
      setJobId(jobIdToTrack)
      setIsOpen(true)
    })
  }, [])

  return { openProgressDialog }
}
