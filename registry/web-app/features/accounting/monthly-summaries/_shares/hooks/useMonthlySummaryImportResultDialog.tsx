import { useCallback, useEffect, useRef, useState } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service.tsx'
import type { ImportJob } from '@/services/export-service.ts'

type ResultDialogResolver = {
  resolve: () => void
  reject: (error: Error) => void
}

function ResultContent({ job }: { job: ImportJob | null }) {
  const successCount = job?.success_count ?? 15
  const failCount = job?.failure_count ?? 0

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="typo-body-base-bold text-green-700">
          Nhập dữ liệu Bảng chia hoa hồng hoàn tất!
        </p>
        <p className="typo-body-sm-regular text-green-600">Số dòng thành công: {successCount}</p>
        {failCount > 0 && (
          <p className="typo-body-sm-regular text-red-600">Số dòng lỗi: {failCount}</p>
        )}
      </div>
    </div>
  )
}

export function useMonthlySummaryImportResultDialog() {
  const { displayCustom, displayClose, updateConfig } = useDialog()
  const { invalidateByPrefix } = useInvalidateQueries()
  const [isOpen, setIsOpen] = useState(false)
  const [job, setJob] = useState<ImportJob | null>(null)

  const resolverRef = useRef<ResultDialogResolver | null>(null)
  const hasDisplayedRef = useRef(false)

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resolverRef.current?.resolve()
    resolverRef.current = null
    setJob(null)
    hasDisplayedRef.current = false
    invalidateByPrefix('accounting/monthly-summaries')
  }, [invalidateByPrefix])

  const createConfig = useCallback(() => {
    return {
      title: 'Kết quả nhập Bảng chia hoa hồng',
      content: <ResultContent job={job} />,
      confirmText: 'Đóng',
      onConfirm: () => {
        displayClose()
        toastService.success('Đã hoàn tất nhập Bảng chia hoa hồng.')
      },
      disableBackdropClose: false,
      onClose: handleClose,
    }
  }, [displayClose, handleClose, job])

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

  const openResultDialog = useCallback((importJob: ImportJob): Promise<void> => {
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      setJob(importJob)
      setIsOpen(true)
    })
  }, [])

  return { openResultDialog }
}
