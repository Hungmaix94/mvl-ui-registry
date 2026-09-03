import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, FileUpload } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { useConfirmFiles } from '@/services/file-service.ts'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useRecruitmentExpenseImportTemplate,
  useStartRecruitmentExpenseImport,
} from '@/features/recruitment/services/recruitment-expense-service'

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
      purpose="hrm_recruitment_expense_import"
    />
  )
}

export function useRecruitmentExpenseImportUploadDialog() {
  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const confirmFilesMutation = useConfirmFiles()
  const startImportMutation = useStartRecruitmentExpenseImport()
  const {
    refetch: refetchTemplate,
    isFetching: isTemplateFetching,
    data: templateResponse,
  } = useRecruitmentExpenseImportTemplate(undefined, { enabled: false })

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
    if (isTemplateFetching || typeof window === 'undefined') {
      return
    }

    try {
      const response = await refetchTemplate()
      const latestTemplate = response.data ?? templateResponse
      const downloadUrl = latestTemplate?.download_url

      if (!downloadUrl) {
        toastService.error('Không tìm thấy tệp mẫu.')
        return
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      if (latestTemplate?.file_name) {
        link.download = latestTemplate.file_name
      }
      link.rel = 'noopener noreferrer'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      toastService.error(extractErrorMessage(error, 'Tải tệp mẫu thất bại'))
    }
  }, [isTemplateFetching, refetchTemplate, templateResponse])

  const handleConfirm = useCallback(async () => {
    if (!fileToken) {
      const message = 'Vui lòng chọn tệp để nhập dữ liệu'
      setUploadError(message)
      setError(message)
      throw { isValidationError: true }
    }

    try {
      setLoading(true)
      setError(null)

      const confirmResponse = await confirmFilesMutation.mutateAsync({
        files: [
          {
            file_token: fileToken,
            purpose: 'hrm_recruitment_expense_import',
          },
        ],
      })

      const confirmedFile = confirmResponse?.confirmed_files?.[0]
      if (!confirmedFile?.id) {
        throw new Error('Không thể xác nhận tệp tải lên')
      }

      const importResponse = await startImportMutation.mutateAsync({
        file_id: confirmedFile.id,
        async_field: true,
      })

      const jobId = importResponse?.import_job_id
      if (!jobId) {
        throw new Error('Không thể khởi tạo tiến trình nhập liệu')
      }

      resolvedRef.current = true
      resolverRef.current?.resolve(jobId)
      displayClose()
    } catch (error) {
      const message = extractErrorMessage(error, 'Có lỗi xảy ra trong quá trình nhập')
      setUploadError(message)
      setError(message)
      toastService.error(message)
      setLoading(false)
      throw { isValidationError: true }
    }
  }, [confirmFilesMutation, displayClose, fileToken, setError, setLoading, startImportMutation])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập chi phí tuyển dụng',
      content: <UploadContent onFileChange={handleFileChange} error={uploadError} />,
      leftFooterContent: (
        <Button variant="text" onClick={handleDownloadTemplate} loading={isTemplateFetching}>
          Tải tệp mẫu
        </Button>
      ),
      confirmText: 'Thêm',
      cancelText: 'Hủy',
      footerFlexJustify: 'end' as const,
      onConfirm: handleConfirm,
      onCancel: () => displayClose(),
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [
    displayClose,
    handleClose,
    handleConfirm,
    handleDownloadTemplate,
    handleFileChange,
    isTemplateFetching,
    uploadError,
  ])

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

  const openUploadDialog = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      resolvedRef.current = false
      setFileToken(null)
      setUploadError(null)
      setError(null)
      setLoading(false)
      setIsOpen(true)
    })
  }, [setError, setLoading])

  return { openUploadDialog }
}
