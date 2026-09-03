import { useCallback, useEffect, useRef, useState } from 'react'
import { FileUpload } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import toastService from '@/services/toast-service.tsx'

const IMPORT_FILE_ACCEPT = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

type UploadDialogResolver = {
  resolve: (jobId: string) => void
  reject: (error: Error) => void
}

type UploadContentProps = {
  onFileChange: (token: string) => void
  error?: string | null
}

function UploadContent({ onFileChange, error }: UploadContentProps) {
  return (
    <FileUpload
      onChange={onFileChange}
      className="w-full"
      hiddenLabel
      hiddenDescription
      error={error ?? undefined}
      accept={[...IMPORT_FILE_ACCEPT]}
      purpose="accounting_monthly_summary_import"
    />
  )
}

export function useMonthlySummaryImportUploadDialog() {
  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resolverRef = useRef<UploadDialogResolver | null>(null)
  const resolvedRef = useRef(false)
  const hasDisplayedRef = useRef(false)

  const cleanup = useCallback(() => {
    setLoading(false)
    setError(null)
    setFileToken(null)
    setUploadError(null)
    resolvedRef.current = false
    resolverRef.current = null
  }, [setError, setLoading])

  const handleClose = useCallback(() => {
    if (resolverRef.current && !resolvedRef.current) {
      resolverRef.current.reject(new Error('upload_dialog_cancelled'))
    }
    setIsOpen(false)
    cleanup()
  }, [cleanup])

  const handleFileChange = useCallback(
    (token: string) => {
      setFileToken(token || null)
      setUploadError(null)
      setError(null)
    },
    [setError]
  )

  const handleDownloadTemplate = useCallback(async () => {
    toastService.info('Đang tải file mẫu...')
    const dummyUrl = window.location.origin + '/templates/monthly_summary_import_template.xlsx'
    const link = document.createElement('a')
    link.href = dummyUrl
    link.download = 'monthly_summary_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!fileToken) {
      setUploadError('Vui lòng chọn một tệp Excel để tải lên.')
      setError('Vui lòng chọn một tệp Excel để tải lên.')
      return
    }

    try {
      setLoading(true)
      const dummyJobId = `job_ms_${Date.now()}`
      resolvedRef.current = true
      resolverRef.current?.resolve(dummyJobId)
      displayClose()
    } catch (err) {
      setUploadError('Tải lên thất bại. Vui lòng thử lại.')
      setError('Tải lên thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [displayClose, fileToken, setError, setLoading])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập Bảng chia hoa hồng từ Excel',
      content: <UploadContent onFileChange={handleFileChange} error={uploadError} />,
      confirmText: 'Tải lên',
      cancelText: 'Tải file mẫu',
      onConfirm: handleSubmit,
      onCancel: handleDownloadTemplate,
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [handleClose, handleDownloadTemplate, handleFileChange, handleSubmit, uploadError])

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

  const openUploadDialog = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      resolvedRef.current = false
      setIsOpen(true)
    })
  }, [])

  return { openUploadDialog }
}
