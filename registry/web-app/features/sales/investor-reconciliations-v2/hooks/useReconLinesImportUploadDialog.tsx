import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, FileUpload } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { useConfirmFiles } from '@/services/file-service.ts'
import {
  useInvestorReconciliationLinesImportTemplate,
  useStartInvestorReconciliationLinesImport,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

const IMPORT_FILE_ACCEPT = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

const FILE_PURPOSE = 'sales_investor_recon_lines_import'

type UploadDialogResolver = {
  resolve: (jobId: string) => void
  reject: (error: Error) => void
}

function UploadContent({
  onFileChange,
  error,
}: {
  onFileChange: (token: string) => void
  error?: string | null
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="typo-body-sm-regular text-content-dark-3">
        Tải tệp mẫu, điền danh sách căn theo sheet “DATA”, rồi tải lên. Hệ thống tính hoa hồng/VAT
        giống hệt khi thêm từng căn.
      </p>
      <FileUpload
        onChange={onFileChange}
        className="w-full"
        hiddenLabel
        hiddenDescription
        error={error ?? undefined}
        accept={[...IMPORT_FILE_ACCEPT]}
        purpose={FILE_PURPOSE}
      />
    </div>
  )
}

/**
 * Bước 1 của luồng nhập Excel danh sách căn: chọn tệp → confirm file → gọi
 * `POST /investor-reconciliation-sheets/{id}/lines/import/`, trả về `import_job_id`
 * cho dialog tiến trình. Theo đúng pattern import async dùng chung của repo
 * (xem `useEmployeeImportUploadDialog`).
 */
export function useReconLinesImportUploadDialog(sheetId: number) {
  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const confirmFilesMutation = useConfirmFiles()
  const startImportMutation = useStartInvestorReconciliationLinesImport()
  const {
    refetch: refetchTemplate,
    isFetching: isTemplateFetching,
    data: templateResponse,
  } = useInvestorReconciliationLinesImportTemplate(sheetId, { enabled: false })

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
      const message = 'Vui lòng chọn tệp để nhập danh sách căn'
      setUploadError(message)
      setError(message)
      throw { isValidationError: true }
    }

    try {
      setLoading(true)
      setError(null)

      const confirmResponse = await confirmFilesMutation.mutateAsync({
        files: [{ file_token: fileToken, purpose: FILE_PURPOSE }],
      })

      const confirmedFile = confirmResponse?.confirmed_files?.[0]
      if (!confirmedFile?.id) {
        throw new Error('Không thể xác nhận tệp tải lên')
      }

      const importResponse = await startImportMutation.mutateAsync({
        sheetPk: sheetId,
        body: { file_id: confirmedFile.id, async_field: true },
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
  }, [
    confirmFilesMutation,
    displayClose,
    fileToken,
    setError,
    setLoading,
    sheetId,
    startImportMutation,
  ])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập danh sách căn từ Excel',
      content: <UploadContent onFileChange={handleFileChange} error={uploadError} />,
      leftFooterContent: (
        <Button variant="text" onClick={handleDownloadTemplate} loading={isTemplateFetching}>
          Tải tệp mẫu
        </Button>
      ),
      confirmText: 'Nhập',
      cancelText: 'Huỷ',
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
