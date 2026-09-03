import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, FileUpload } from '@/components/ui'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import { useConfirmFiles } from '@/services/file-service.ts'
import {
  useAttendanceExemptionImportTemplate,
  useStartAttendanceExemptionImport,
} from '@/features/attendance/services/attendance-exemption-service'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import { Flex } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'

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
  month?: Date
  onMonthChange: (date: Date | undefined) => void
  error?: string | null
}

function UploadContent({ onFileChange, month, onMonthChange, error }: UploadContentProps) {
  return (
    <Flex direction="column" gap="5" className="w-full">
      <MonthPicker
        key={month ? month.getTime() : 'empty'}
        label="Tháng áp dụng"
        value={month}
        onChange={onMonthChange}
        placeholder="Chọn tháng"
        showYear
        required
      />
      <FileUpload
        onChange={onFileChange}
        className="w-full"
        hiddenLabel
        hiddenDescription
        error={error ?? undefined}
        accept={[...IMPORT_FILE_ACCEPT]}
        purpose="hrm_attendance_exemption_import"
      />
    </Flex>
  )
}

export function useAttendanceExemptionImportUploadDialog() {
  const ability = useAbility()

  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [month, setMonth] = useState<Date | undefined>(undefined)

  const confirmFilesMutation = useConfirmFiles()
  const startImportMutation = useStartAttendanceExemptionImport()
  const {
    refetch: refetchTemplate,
    isFetching: isTemplateFetching,
    data: templateResponse,
  } = useAttendanceExemptionImportTemplate({ enabled: false })

  const resolverRef = useRef<UploadDialogResolver | null>(null)
  const resolvedRef = useRef(false)
  const hasDisplayedRef = useRef(false)
  const lastSuccessfulMonthRef = useRef<Date | undefined>(undefined)

  const cleanup = useCallback(() => {
    setLoading(false)
    setError(null)
    setFileToken(null)
    setUploadError(null)
    setMonth(undefined)
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

  const handleMonthChange = useCallback(
    (date: Date | undefined) => {
      setMonth(date)
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
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toastService.success('Tải tệp mẫu thành công')
    } catch (error) {
      const message = 'Tải tệp mẫu thất bại'
      toastService.error(message)
    }
  }, [isTemplateFetching, refetchTemplate, templateResponse])

  const handleConfirm = useCallback(async () => {
    if (!fileToken) {
      const message = 'Vui lòng chọn tệp để nhập dữ liệu'
      setUploadError(message)
      setError(message)
      throw { isValidationError: true }
    }

    if (!month) {
      const message = 'Vui lòng chọn tháng áp dụng'
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
            purpose: 'hrm_attendance_exemption_import',
          },
        ],
      })

      const confirmedFile = confirmResponse?.confirmed_files?.[0]
      if (!confirmedFile?.id) {
        throw new Error('Không thể xác nhận tệp tải lên')
      }

      const monthStr = String(month.getMonth() + 1).padStart(2, '0')
      const yearStr = String(month.getFullYear())
      const targetMonth = `${monthStr}/${yearStr}`

      const importResponse = await startImportMutation.mutateAsync({
        file_id: confirmedFile.id,
        async_field: true,
        options: {
          batch_size: 500,
          count_total_first: true,
          header_rows: 1,
          output_format: 'csv',
          create_result_file_records: true,
          allow_update: false,
          handler_options: {
            target_month: targetMonth,
          },
        },
      })

      const jobId = importResponse?.import_job_id
      if (!jobId) {
        throw new Error('Không thể khởi tạo tiến trình nhập liệu')
      }

      lastSuccessfulMonthRef.current = month

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
    month,
    setError,
    setLoading,
    startImportMutation,
  ])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập danh sách nhân sự được miễn chấm công nhưng không đi làm theo ngày',
      content: (
        <UploadContent
          onFileChange={handleFileChange}
          month={month}
          onMonthChange={handleMonthChange}
          error={uploadError}
        />
      ),
      leftFooterContent: ability.can('import_template', 'attendance_exemption') ? (
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
    handleMonthChange,
    isTemplateFetching,
    month,
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
  }, [createConfig, isOpen, updateConfig, month, fileToken, uploadError])

  const openUploadDialog = useCallback(
    (initialMonth?: Date) => {
      return new Promise<string>((resolve, reject) => {
        resolverRef.current = { resolve, reject }
        resolvedRef.current = false
        setFileToken(null)
        setUploadError(null)
        setMonth(initialMonth ?? lastSuccessfulMonthRef.current)
        setError(null)
        setLoading(false)
        setIsOpen(true)
      })
    },
    [setError, setLoading]
  )

  return { openUploadDialog }
}
