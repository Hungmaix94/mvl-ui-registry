import { Select } from '@/components/ui'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import type { GetEmployeesDropdownParams } from '@/features/employee/services/employee-service'
import { SaleType } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

export type SaleStaffSelectProps = {
  /** The specific sale type selected */
  saleType?: string
  /** Whether the current sale type is internal (shows employee select) */
  isInternal: boolean
  /** Selected employee ID (internal type) */
  employeeId: number | null
  /** Selected exchange ID (partner type) */
  exchangeId: number | null
  /** Selected collaborator ID (collaborator type) */
  collaboratorId?: number | null
  /** Called when employee ID changes */
  onEmployeeChange: (id: number | null) => void
  /** Called when exchange ID changes */
  onExchangeChange: (id: number | null) => void
  /** Called when collaborator ID changes */
  onCollaboratorChange?: (id: number | null) => void
  /** Called when the full employee entity changes */
  onEmployeeEntityChange?: (employee: any) => void
  /** Called when the full exchange entity changes */
  onExchangeEntityChange?: (exchange: any) => void
  /** Called when the full collaborator entity changes */
  onCollaboratorEntityChange?: (collaborator: any) => void
  /** Error message */
  error?: string
  /** Clear error callback */
  onClearError?: () => void
  /** Additional params to filter employee dropdown */
  employeeAdditionalParams?: GetEmployeesDropdownParams | (() => GetEmployeesDropdownParams)
  /** Additional params to filter exchange dropdown */
  exchangeAdditionalParams?: Record<string, any> | (() => Record<string, any>)
  /** Employee select label */
  employeeLabel?: string
  /** Exchange select label */
  exchangeLabel?: string
  /** Collaborator select label */
  collaboratorLabel?: string
  /** Explicit options for exchange (overrides loadOptions) */
  exchangeOptions?: { value: string; label: string }[]
}

const SaleStaffSelect = ({
  saleType,
  isInternal,
  employeeId,
  exchangeId,
  collaboratorId,
  onEmployeeChange,
  onExchangeChange,
  onCollaboratorChange,
  onEmployeeEntityChange,
  onExchangeEntityChange,
  onCollaboratorEntityChange,
  error,
  onClearError,
  employeeAdditionalParams,
  exchangeAdditionalParams,
  employeeLabel = 'Người phụ trách bán',
  exchangeLabel = 'Sàn / Đối tác',
  collaboratorLabel = 'Cộng tác viên',
  exchangeOptions,
}: SaleStaffSelectProps) => {
  const exchangeParams =
    typeof exchangeAdditionalParams === 'function'
      ? exchangeAdditionalParams()
      : exchangeAdditionalParams || {}
  const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({
    valueType: 'id',
    params: exchangeParams,
  })
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()

  if (isInternal) {
    return (
      <div className="flex flex-col gap-2">
        <EmployeeSelectWithDialog
          label={employeeLabel}
          value={employeeId}
          onChange={(id) => {
            onEmployeeChange(id)
            onClearError?.()
          }}
          onEntityChange={onEmployeeEntityChange}
          additionalParams={employeeAdditionalParams}
          error={error}
          required
        />
      </div>
    )
  }

  if (saleType === SaleType.collaborator) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-0.5">
          <label className="typo-body-base-semibold text-content-dark-2">{collaboratorLabel}</label>
          <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
        </div>
        <Select
          value={collaboratorId ? String(collaboratorId) : null}
          onChange={(val) => {
            onCollaboratorChange?.(val ? Number(val) : null)
            onClearError?.()
          }}
          onChangeOption={(opt) => {
            if (onCollaboratorEntityChange) {
              onCollaboratorEntityChange(opt ? { id: Number(opt.value), name: opt.label } : null)
            }
          }}
          loadOptions={loadCollaboratorOptions}
          loadInitialOptions={loadInitialCollaboratorOptions}
          placeholder="Tìm cộng tác viên..."
          enableSearch
        />
        {error && <span className="text-data-red-default text-xs">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5">
        <label className="typo-body-base-semibold text-content-dark-2">{exchangeLabel}</label>
        <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
      </div>
      <Select
        value={exchangeId ? String(exchangeId) : null}
        onChange={(val) => {
          onExchangeChange(val ? Number(val) : null)
          onClearError?.()
        }}
        onChangeOption={(opt) => {
          if (onExchangeEntityChange) {
            onExchangeEntityChange(opt ? { id: Number(opt.value), name: opt.label } : null)
          }
        }}
        options={exchangeOptions}
        loadOptions={exchangeOptions ? undefined : loadExchangeOptions}
        loadInitialOptions={exchangeOptions ? undefined : loadInitialExchangeOptions}
        placeholder="Tìm sàn liên kết / đối tác..."
        enableSearch
      />
      {error && <span className="text-data-red-default text-xs">{error}</span>}
    </div>
  )
}

export default SaleStaffSelect
