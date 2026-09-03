import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, FileUpload, RadioGroup } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { useConfirmFiles } from '@/services/file-service.ts'
import {
  getContractService,
  useStartContractImport,
} from '@/features/contract/services/contract-service'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability.ts'
import { ContractImportMode } from '@/constants/api-schema-aliases'

const IMPORT_FILE_ACCEPT = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

type UploadDialogResolver = {
  resolve: (jobId: string) => void
  reject: (error: Error) => void
}

type ImportMode = ContractImportMode

type UploadContentProps = {
  onFileChange: (token: string) => void
  mode: ImportMode
  onModeChange: (mode: ImportMode) => void
  error?: string | null
}

const IMPORT_MODE_OPTIONS = [
  { value: ContractImportMode.update, label: 'Cập nhật' },
  { value: ContractImportMode.create, label: 'Tạo mới' },
  {
    value: ContractImportMode.update_employee_type,
    label: 'Chuyển đổi HD sang KLCT/KLTV',
  },
]

function UploadContent({ onFileChange, mode, onModeChange, error }: UploadContentProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="typo-body-base-medium text-content-dark-1 mb-3">Chế độ nhập</p>
        <RadioGroup
          id="import-mode"
          label=""
          hiddenLabel
          value={mode}
          onChange={(value) => onModeChange(value as ImportMode)}
          options={IMPORT_MODE_OPTIONS}
          disabled={false}
        />
      </div>
      <FileUpload
        onChange={onFileChange}
        className="w-full"
        hiddenLabel
        hiddenDescription
        error={error ?? undefined}
        accept={[...IMPORT_FILE_ACCEPT]}
        purpose="hrm_contract_import"
      />
    </div>
  )
}

export function useContractImportUploadDialog() {
  const ability = useAbility()

  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>(ContractImportMode.update)

  const confirmFilesMutation = useConfirmFiles()
  const startImportMutation = useStartContractImport()
  const [isTemplateFetching, setIsTemplateFetching] = useState(false)

  const resolverRef = useRef<UploadDialogResolver | null>(null)
  const resolvedRef = useRef(false)
  const hasDisplayedRef = useRef(false)

  const cleanup = useCallback(() => {
    setLoading(false)
    setError(null)
    setFileToken(null)
    setUploadError(null)
    setMode(ContractImportMode.update)
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
      setIsTemplateFetching(true)
      const response = await getContractService().getContractsImportTemplate(mode)
      const downloadUrl = response?.download_url

      if (!downloadUrl) {
        toastService.error('Không tìm thấy tệp mẫu.')
        return
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      if (response?.file_name) {
        link.download = response.file_name
      }
      link.rel = 'noopener noreferrer'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      const message = extractErrorMessage(error, 'Tải tệp mẫu thất bại')
      toastService.error(message)
    } finally {
      setIsTemplateFetching(false)
    }
  }, [isTemplateFetching, mode])

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
            purpose: 'hrm_contract_import',
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
        options: {
          batch_size: 500,
          count_total_first: true,
          header_rows: 1,
          output_format: 'csv',
          create_result_file_records: true,
          allow_update:
            mode === ContractImportMode.update || mode === ContractImportMode.update_employee_type,
          mode: mode,
        },
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
    mode,
    setError,
    setLoading,
    startImportMutation,
  ])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập danh sách Hợp đồng',
      content: (
        <UploadContent
          onFileChange={handleFileChange}
          mode={mode}
          onModeChange={setMode}
          error={uploadError}
        />
      ),
      leftFooterContent: ability.can('import_template', 'contract') ? (
        <Button variant="text" onClick={handleDownloadTemplate} loading={isTemplateFetching}>
          Tải tệp mẫu
        </Button>
      ) : undefined,
      confirmText: 'Thêm',
      cancelText: 'Hủy',
      footerFlexJustify: 'end' as const,
      onConfirm: handleConfirm,
      onCancel: () => displayClose(),
      disableBackdropClose: true,
      onClose: handleClose,
    }
  }, [
    ability,
    displayClose,
    handleClose,
    handleConfirm,
    handleDownloadTemplate,
    handleFileChange,
    isTemplateFetching,
    mode,
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
      setMode(ContractImportMode.update)
      setIsOpen(true)
    })
  }, [setError, setLoading])

  return { openUploadDialog }
}
