import { useState, useCallback } from 'react'
import { Button, RadioGroup, Select } from '@/components/ui'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { useDialog } from '@/hooks/useDialog'
import { TransactionSaleType } from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { components } from '@/api/schema'

export type AddTransactionSaleDialogResult = {
  sale_type: TransactionSaleType
  employee: number | null
  exchange: number | null
  employee_detail?: components['schemas']['EmployeeWithDepartmentNested'] | null
  exchange_detail?: components['schemas']['ExchangeNested'] | null
}

type Props = {
  onConfirm: (data: AddTransactionSaleDialogResult) => void
  onCancel?: () => void
}

const SALE_TYPE_OPTIONS = [
  { value: 'mv', label: 'Nhân viên Mai Việt' },
  { value: 'partner', label: 'Đối tác' },
  { value: 'collaborator', label: 'Cộng tác viên' },
]

const AddTransactionSaleDialog = ({ onConfirm, onCancel }: Props) => {
  const { displayClose } = useDialog()
  const [saleType, setSaleType] = useState<TransactionSaleType>('mv' as TransactionSaleType)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [selectedExchangeId, setSelectedExchangeId] = useState<number | null>(null)
  const [error, setError] = useState<string | undefined>()

  const { exchangeOptions } = useExchangeSelect({ valueType: 'id' })

  const isInternal = saleType === 'mv'

  const handleConfirm = useCallback(() => {
    if (isInternal && !selectedEmployeeId) {
      setError('Vui lòng chọn nhân viên')
      return
    }
    if (!isInternal && !selectedExchangeId) {
      setError('Vui lòng chọn sàn / đối tác')
      return
    }

    onConfirm({
      sale_type: saleType,
      employee: isInternal ? selectedEmployeeId : null,
      exchange: isInternal ? null : selectedExchangeId,
      employee_detail: isInternal ? selectedEmployee : null,
      exchange_detail:
        !isInternal && selectedExchangeId
          ? (() => {
              const opt = exchangeOptions.find((o) => o.value === selectedExchangeId)
              return opt ? { id: Number(opt.value), name: opt.label, code: '', tax_code: '' } : null
            })()
          : null,
    })
    displayClose()
  }, [
    saleType,
    selectedEmployeeId,
    selectedExchangeId,
    selectedEmployee,
    exchangeOptions,
    isInternal,
    onConfirm,
    displayClose,
  ])

  const handleCancel = useCallback(() => {
    onCancel?.()
    displayClose()
  }, [onCancel, displayClose])

  return (
    <div className="flex flex-col gap-4 p-4">
      <RadioGroup
        id="sale-type"
        label="Loại hình bán"
        options={SALE_TYPE_OPTIONS}
        value={saleType}
        disabled={false}
        onChange={(val) => {
          setSaleType(val as TransactionSaleType)
          setSelectedEmployeeId(null)
          setSelectedExchangeId(null)
          setError(undefined)
        }}
        required
        className="flex-row gap-4"
      />

      {isInternal ? (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Nhân viên <span className="text-red-500">*</span>
          </label>
          <EmployeeSelectWithDialog
            label=""
            value={selectedEmployeeId}
            onChange={(id) => {
              setSelectedEmployeeId(id)
              setError(undefined)
            }}
            onEntityChange={setSelectedEmployee}
            error={error}
            required
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Sàn / Đối tác / CTV <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedExchangeId ? String(selectedExchangeId) : null}
            onChange={(val) => {
              setSelectedExchangeId(val ? Number(val) : null)
              setError(undefined)
            }}
            options={exchangeOptions}
            placeholder="Tìm sàn liên kết / đối tác..."
            enableSearch
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={handleCancel}>
          Huỷ
        </Button>
        <Button variant="primary" onClick={handleConfirm}>
          Thêm
        </Button>
      </div>
    </div>
  )
}

export default AddTransactionSaleDialog
