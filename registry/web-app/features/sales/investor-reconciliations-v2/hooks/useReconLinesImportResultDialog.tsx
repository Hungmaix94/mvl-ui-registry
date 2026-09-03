import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  parseResultFiles,
  resolveImportOutcomeMessage,
} from '@/features/sales/investor-reconciliations-v2/utils/recon-lines-import-result'
import type { components } from '@/api/schema.ts'
import type { ImportJob } from '@/services/export-service.ts'
import type { DialogConfig } from '@/types'

type ResultFileInfo = components['schemas']['ResultFileInfo']

type ResultDialogResolver = {
  resolve: () => void
}

function DownloadLink({ file, label }: { file?: ResultFileInfo | null; label: string }) {
  if (!file?.url) return null
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="typo-body-sm-medium text-action-primary-red-default hover:underline"
    >
      {label}
    </a>
  )
}

function ResultContent({ job }: { job: ImportJob }) {
  const files = parseResultFiles(job.result_files)
  const successCount = job.success_count ?? 0
  const failureCount = job.failure_count ?? 0
  const outcomeMessage = resolveImportOutcomeMessage(job)

  return (
    <div className="flex flex-col gap-4 px-6 pt-2 pb-6">
      {outcomeMessage ? (
        <p className="typo-body-base-regular text-data-red-default">{outcomeMessage}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="typo-body-base-regular text-content-dark-2">
            Thêm thành công <b className="text-data-green-default">{successCount}</b> căn
            {failureCount > 0 && (
              <>
                {' · '}Lỗi <b className="text-data-red-default">{failureCount}</b> dòng
              </>
            )}
          </p>
          {failureCount > 0 && (
            <p className="typo-body-sm-regular text-content-dark-3">
              Tải tệp dòng lỗi bên dưới để xem lý do từng dòng, sửa lại rồi nhập bổ sung.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <DownloadLink file={files?.success_file} label="Tải danh sách thành công" />
        <DownloadLink file={files?.failed_file} label="Tải danh sách lỗi" />
      </div>
    </div>
  )
}

/**
 * Bước 3: tóm tắt kết quả job (số căn thêm được / số dòng lỗi) + link tải tệp kết quả.
 * Gọn hơn bản của Hồ sơ nhân viên (không parse CSV tại chỗ) vì lý do lỗi đã nằm sẵn
 * trong tệp dòng lỗi do BE sinh.
 */
export function useReconLinesImportResultDialog() {
  const { displayCustom, displayClose, updateConfig } = useDialog()
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
  }, [])

  const createConfig = useCallback((): DialogConfig => {
    return {
      title: 'Kết quả nhập danh sách căn',
      content: job ? <ResultContent job={job} /> : null,
      hideFooter: false,
      footer: (
        <div className="border-border-1 flex w-full justify-end border border-t-[1px] px-6 py-3">
          <Button variant="secondary" className="w-[120px]" onClick={() => displayClose()}>
            Đóng
          </Button>
        </div>
      ),
      disableBackdropClose: false,
      onClose: handleClose,
    }
  }, [displayClose, handleClose, job])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    displayCustom(createConfig())
    hasDisplayedRef.current = true

    return () => {
      hasDisplayedRef.current = false
    }
  }, [createConfig, displayCustom, isOpen])

  useEffect(() => {
    if (!isOpen || !hasDisplayedRef.current) {
      return
    }
    updateConfig(createConfig())
  }, [createConfig, isOpen, updateConfig])

  const openResultDialog = useCallback((finalJob: ImportJob) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = { resolve }
      setJob(finalJob)
      setIsOpen(true)
    })
  }, [])

  return { openResultDialog }
}
