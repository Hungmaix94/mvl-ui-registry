import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, FileUpload, Select } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { useConfirmFiles } from '@/services/file-service.ts'
import {
  useImportDepartmentCommissionPoolLines,
  useDepartmentCommissionPools,
  useDownloadDeptPoolImportTemplate,
  DepartmentCommissionPool,
} from '../services/department-commission-pools-service'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import { Flex } from '@radix-ui/themes'
import { buildDeptPoolOptionLabel } from '../utils/dept-pool-option-label'

const IMPORT_FILE_ACCEPT = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

type UploadDialogResolver = {
  resolve: (pool: any) => void
  reject: (error: Error) => void
}

type UploadContentProps = {
  pools?: DepartmentCommissionPool[]
  selectedPoolId: number | null
  onPoolSelect: (id: number) => void
  isFixedPool: boolean
  onFileChange: (token: string) => void
  onDownloadTemplate: () => void
  error?: string | null
}

function UploadContent({
  pools,
  selectedPoolId,
  onPoolSelect,
  isFixedPool,
  onFileChange,
  onDownloadTemplate,
  error,
}: UploadContentProps) {
  const poolOptions = (pools || [])
    .filter((p) => p.status === 'DRAFT' || p.status === 'CONFIRMED')
    .map((p) => ({ label: buildDeptPoolOptionLabel(p), value: String(p.id) }))

  return (
    <Flex direction="column" gap="4" className="w-full">
      {!isFixedPool && (
        <Select
          label="Chọn phòng ban / Pool"
          placeholder="Chọn phòng ban để nhập chia hoa hồng..."
          options={poolOptions}
          value={selectedPoolId ? String(selectedPoolId) : undefined}
          onChange={(val) => onPoolSelect(Number(val))}
          clearable={false}
        />
      )}
      <FileUpload
        onChange={onFileChange}
        className="w-full"
        hiddenLabel
        hiddenDescription
        error={error ?? undefined}
        accept={[...IMPORT_FILE_ACCEPT]}
        purpose="accounting_department_commission_pool_import"
      />
      <Flex justify="between" align="center" className="pt-1 text-xs text-neutral-500">
        <span>* File Excel cần 4 cột: STT, Mã nhân viên, Tên nhân viên, Số tiền</span>
        <Button
          variant="link"
          size="small"
          className="cursor-pointer p-0 font-medium text-blue-600 hover:underline"
          onClick={onDownloadTemplate}
        >
          Tải file mẫu .xlsx
        </Button>
      </Flex>
    </Flex>
  )
}

export function useDeptPoolImportUploadDialog() {
  const { displayCustom, displayClose, updateConfig, setLoading, setError } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [fileToken, setFileToken] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [poolId, setPoolId] = useState<number | null>(null)
  const [isFixedPool, setIsFixedPool] = useState(true)
  const [periodId, setPeriodId] = useState<number | undefined>(undefined)

  const { data: poolsData } = useDepartmentCommissionPools(
    { accounting_period: periodId, page_size: 100 },
    { enabled: isOpen && !isFixedPool }
  )

  const confirmFilesMutation = useConfirmFiles()
  const importLinesMutation = useImportDepartmentCommissionPoolLines()
  const downloadTemplateMutation = useDownloadDeptPoolImportTemplate()

  const resolverRef = useRef<UploadDialogResolver | null>(null)
  const resolvedRef = useRef(false)
  const hasDisplayedRef = useRef(false)

  const cleanup = useCallback(() => {
    setLoading(false)
    setError(null)
    setFileToken(null)
    setUploadError(null)
    setPoolId(null)
    setIsFixedPool(true)
    setPeriodId(undefined)
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

  const handlePoolSelect = useCallback(
    (id: number) => {
      setPoolId(id)
      setUploadError(null)
      setError(null)
    },
    [setError]
  )

  const handleConfirm = useCallback(async () => {
    if (!poolId) {
      const message = 'Vui lòng chọn phòng ban để nhập chia hoa hồng'
      setUploadError(message)
      setError(message)
      throw { isValidationError: true }
    }

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
            purpose: 'accounting_department_commission_pool_import',
          },
        ],
      })

      const confirmedFile = confirmResponse?.confirmed_files?.[0]
      if (!confirmedFile?.id) {
        throw new Error('Không thể xác nhận tệp tải lên')
      }

      const importResponse = await importLinesMutation.mutateAsync({
        id: poolId,
        data: {
          file_id: confirmedFile.id,
        },
      })

      resolvedRef.current = true
      resolverRef.current?.resolve(importResponse)
      displayClose()
      toastService.success('Nhập dữ liệu chia hoa hồng thành công')
    } catch (error) {
      const message = extractErrorMessage(error, 'Có lỗi xảy ra trong quá trình nhập')
      setUploadError(message)
      setError(message)
      toastService.error(message)
      setLoading(false)
      throw { isValidationError: true }
    }
  }, [
    fileToken,
    poolId,
    confirmFilesMutation,
    importLinesMutation,
    displayClose,
    setError,
    setLoading,
  ])

  const handleDownloadTemplate = useCallback(async () => {
    try {
      toastService.info('Đang tải xuống tệp mẫu Excel...')
      await downloadTemplateMutation.mutateAsync(poolId || undefined)
      toastService.success('Tải tệp mẫu thành công')
    } catch (error) {
      toastService.error(extractErrorMessage(error, 'Tải tệp mẫu thất bại'))
    }
  }, [downloadTemplateMutation, poolId])

  const createConfig = useCallback(() => {
    return {
      title: 'Nhập chia hoa hồng từ Excel',
      content: (
        <UploadContent
          pools={poolsData?.results}
          selectedPoolId={poolId}
          onPoolSelect={handlePoolSelect}
          isFixedPool={isFixedPool}
          onFileChange={handleFileChange}
          onDownloadTemplate={handleDownloadTemplate}
          error={uploadError}
        />
      ),
      leftFooterContent: (
        <Button variant="text" onClick={handleDownloadTemplate}>
          Tải tệp mẫu
        </Button>
      ),
      confirmText: 'Nhập file',
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
    handleFileChange,
    handleDownloadTemplate,
    handlePoolSelect,
    isFixedPool,
    poolId,
    poolsData?.results,
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
  }, [createConfig, isOpen, updateConfig, fileToken, uploadError, poolId, poolsData])

  const openUploadDialog = useCallback(
    (id?: number, period?: number) => {
      return new Promise<any>((resolve, reject) => {
        resolverRef.current = { resolve, reject }
        resolvedRef.current = false
        setFileToken(null)
        setUploadError(null)
        setPoolId(id || null)
        setIsFixedPool(!!id)
        setPeriodId(period)
        setError(null)
        setLoading(false)
        setIsOpen(true)
      })
    },
    [setError, setLoading]
  )

  return { openUploadDialog }
}
