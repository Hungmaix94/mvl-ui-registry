import { useCallback, useMemo, useState } from 'react'
import { Button, RadioGroup, Select, Checkbox } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'

import { SaleType } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import type { components } from '@/api'
import { CtvLineType, F2Source as F2SourceEnum } from '@/constants/api-schema-aliases'
import { resolveRateTriple, formatRateSpecWithEquivalent } from '@/utils/rate-spec'

import SaleStaffSelect from './SaleStaffSelect'
import { validateAddSaleStaff, type SaleStaffFieldError } from './addSaleStaffValidation'

type ApiSaleStaff = components['schemas']['BookingSaleRequest']

export type AddSaleStaffDialogResult = Pick<
  ApiSaleStaff,
  | 'sale_type'
  | 'employee_id'
  | 'exchange_id'
  | 'collaborator_id'
  | 'participation_percentage'
  | 'ctv_line_type'
  | 'ctv_line_employee_id'
  | 'ctv_line_department_id'
  | 'pct_commission'
  | 'amt_commission'
  | 'count_as_line_revenue'
  | 'f2_source'
  | 'f2_source_director_id'
> & {
  employee_detail?: components['schemas']['EmployeeWithDepartmentNested']
  exchange_detail?: components['schemas']['ExchangeNested']
  collaborator_detail?: components['schemas']['CollaboratorNested']
  f2_source_director_detail?: components['schemas']['EmployeeWithDepartmentNested']
  commission_type: 'pct' | 'amt'
}

const getInitialCommission = (
  commissionType?: 'pct' | 'amt',
  defaultAmtCommission?: string | number | null,
  defaultPctCommission?: string | number | null,
  defaultMvCommission?: string | number | null
) => {
  // When caller explicitly specifies commissionType, respect it — never
  // cross-fall back to the other mode (would mismatch UI label vs value).
  if (commissionType === 'amt')
    return defaultAmtCommission ? String(Math.round(Number(defaultAmtCommission))) : ''
  const configuredPct = defaultMvCommission ?? defaultPctCommission
  if (commissionType === 'pct') return configuredPct ? String(configuredPct) : ''
  if (defaultAmtCommission) return String(Math.round(Number(defaultAmtCommission)))
  return configuredPct ? String(configuredPct) : ''
}

export type AddSaleStaffDialogProps = {
  /** Options for the sale type radio group */
  saleTypeOptions: { value: string; label: string }[]
  /** Default sale type value */
  defaultSaleType?: string
  /** Default values for editing */
  defaultEmployeeId?: number | null
  defaultExchangeId?: number | null
  defaultCollaboratorId?: number | null
  defaultEmployee?: any
  defaultExchange?: any
  defaultCollaborator?: any
  /** External sale type values (used to determine employee vs exchange select) */
  externalSaleTypeValues: string[]
  /** Show percentage inputs */
  showPercentageInputs?: boolean
  /** Default participation percentage */
  defaultParticipationPercentage?: string
  /** Default percentage commission */
  defaultPctCommission?: string | number | null
  /** Default amount commission */
  defaultAmtCommission?: string | number | null
  /** Default partner percentage commission */
  defaultPartnerPctCommission?: string | number | null
  /** List of F2 commissions to auto-fill when selecting an exchange */
  f2Commissions?: any[]
  /** Default commission for internal sales (MV) */
  defaultMvCommission?: string
  /** Override commission type */
  commissionType?: 'pct' | 'amt'
  /** Default count as line revenue */
  defaultCountAsLineRevenue?: boolean
  /** Pre-mapped exchange options */
  exchangeOptions?: { value: string; label: string }[]
  /** Called when user confirms */
  onConfirm: (data: AddSaleStaffDialogResult) => void
  /** Called when user cancels */
  onCancel?: () => void
  /** Additional params to filter employee dropdown */
  employeeAdditionalParams?: Record<string, any> | ((saleType: string) => Record<string, any>)
  /** Additional params to filter exchange dropdown */
  exchangeAdditionalParams?: Record<string, any> | ((saleType: string) => Record<string, any>)
  /** Title for submit button */
  submitText?: string
  // CTV line fields
  defaultCtvLineType?: string
  defaultCtvLineEmployeeId?: number | null
  defaultCtvLineDepartmentId?: number | null
  disableCommissionInput?: boolean
  // F2 source fields (partner only)
  defaultF2Source?: string | null
  defaultF2SourceDirectorId?: number | null
  defaultPctCommissionSpec?: any | null
}

const AddSaleStaffDialog = ({
  saleTypeOptions,
  defaultSaleType,
  defaultEmployeeId = null,
  defaultExchangeId = null,
  defaultCollaboratorId = null,
  defaultEmployee = null,
  defaultExchange = null,
  defaultCollaborator = null,
  externalSaleTypeValues,
  showPercentageInputs = false,
  defaultParticipationPercentage = '',
  defaultPctCommission,
  defaultAmtCommission,
  defaultPartnerPctCommission,
  f2Commissions,
  defaultMvCommission,
  exchangeOptions,
  onConfirm,
  onCancel,
  employeeAdditionalParams,
  exchangeAdditionalParams,
  submitText = 'Thêm',
  // CTV line fields
  defaultCtvLineType = '',
  defaultCtvLineEmployeeId = null,
  defaultCtvLineDepartmentId = null,
  defaultCountAsLineRevenue = true,
  commissionType,
  disableCommissionInput = false,
  defaultF2Source = null,
  defaultF2SourceDirectorId = null,
  defaultPctCommissionSpec = null,
}: AddSaleStaffDialogProps) => {
  const { displayClose } = useDialog()
  const [saleType, setSaleType] = useState(defaultSaleType || saleTypeOptions[0]?.value || '')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(defaultEmployeeId)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(defaultEmployee)
  const [selectedExchangeId, setSelectedExchangeId] = useState<number | null>(defaultExchangeId)
  const [selectedExchange, setSelectedExchange] = useState<any>(defaultExchange)
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<number | null>(
    defaultCollaboratorId
  )
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(defaultCollaborator)
  const [participationPercentage, setParticipationPercentage] = useState(
    defaultParticipationPercentage
  )
  const [dealCommissionPercentage, setDealCommissionPercentage] = useState(() =>
    getInitialCommission(
      commissionType,
      defaultAmtCommission,
      defaultPctCommission,
      defaultMvCommission
    )
  )
  const [commType, setCommType] = useState<'pct' | 'amt'>(
    commissionType || (defaultAmtCommission ? 'amt' : 'pct')
  )
  const [error, setError] = useState<SaleStaffFieldError | undefined>()
  // CTV line fields
  const [ctvLineType, setCtvLineType] = useState(defaultCtvLineType || '')
  const [ctvLineEmployeeId, setCtvLineEmployeeId] = useState<number | null>(
    defaultCtvLineEmployeeId ?? null
  )
  const [ctvLineDepartmentId, setCtvLineDepartmentId] = useState<number | null>(
    defaultCtvLineDepartmentId ?? null
  )
  // `independent` line always implies count_as_line_revenue=false. Reflect that
  const [countAsLineRevenue, setCountAsLineRevenue] = useState<boolean>(
    defaultCtvLineType === CtvLineType.independent ? false : defaultCountAsLineRevenue
  )
  // F2 source fields (partner only)
  const [f2Source, setF2Source] = useState<string | null>(defaultF2Source || F2SourceEnum.linked)
  const [f2SourceDirectorId, setF2SourceDirectorId] = useState<number | null>(
    defaultF2SourceDirectorId ?? null
  )

  const isCommissionEditable = !disableCommissionInput && saleType !== 'mv'

  const matchedF2FractionText = useMemo(() => {
    if (saleType !== 'partner') return null
    if (selectedExchangeId) {
      const match = f2Commissions?.find(
        (c: any) => String(c.exchange_id) === String(selectedExchangeId)
      )
      const spec = match?.current_commission?.f2_commission_spec
      if (spec) return formatRateSpecWithEquivalent(spec)
    }
    if (defaultPctCommissionSpec) {
      return formatRateSpecWithEquivalent(defaultPctCommissionSpec)
    }
    return null
  }, [saleType, selectedExchangeId, f2Commissions, defaultPctCommissionSpec])

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.CTV_LINE_TYPE],
  })

  const ctvLineTypeOptions = keysMapOptions.get(APP_CONSTANT_KEY.SALES.CTV_LINE_TYPE)

  const { keysMapOptions: f2SourceKeysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const f2SourceOptions =
    f2SourceKeysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) ?? []

  const {
    loadEmployeeOptions: loadDirectorOptions,
    loadInitialEmployeeOptions: loadInitialDirectorOptions,
  } = useEmployeeSelect()

  const { loadDepartmentOptions, loadInitialDepartmentOptions } = useDepartmentSelect()
  const ctvLineEmployeeFilter = useMemo(
    () => ({
      type: 'mv',
      ...(ctvLineDepartmentId ? { department: ctvLineDepartmentId } : {}),
      ...(ctvLineType === CtvLineType.management ? { position__is_leadership: true } : {}),
    }),
    [ctvLineDepartmentId, ctvLineType]
  )
  const { loadEmployeeOptions, getCachedEmployeeById, loadInitialEmployeeOptions } =
    useEmployeeSelect({
      additionalParams: ctvLineEmployeeFilter,
    })

  const handleConfirm = useCallback(() => {
    const isInternal = !externalSaleTypeValues.includes(saleType)

    const validationError = validateAddSaleStaff({
      saleType,
      isInternal,
      selectedEmployeeId,
      selectedCollaboratorId,
      selectedExchangeId,
      f2Source,
      f2SourceDirectorId,
      ctvLineType,
      ctvLineEmployeeId,
      ctvLineDepartmentId,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    const isCollaborator = !isInternal && saleType === SaleType.collaborator
    const isPartner = !isInternal && saleType === SaleType.partner

    onConfirm({
      sale_type: saleType as ApiSaleStaff['sale_type'],
      employee_id: isInternal ? selectedEmployeeId : null,
      exchange_id: !isInternal && saleType !== SaleType.collaborator ? selectedExchangeId : null,
      collaborator_id: isCollaborator ? selectedCollaboratorId : null,
      employee_detail: isInternal ? selectedEmployee : null,
      exchange_detail: !isInternal && saleType !== SaleType.collaborator ? selectedExchange : null,
      collaborator_detail: isCollaborator ? selectedCollaborator : null,
      participation_percentage: participationPercentage,
      pct_commission: commType === 'pct' ? dealCommissionPercentage : null,
      amt_commission: commType === 'amt' ? dealCommissionPercentage : null,
      // CTV line fields
      ctv_line_type:
        isCollaborator && ctvLineType ? (ctvLineType as ApiSaleStaff['ctv_line_type']) : undefined,
      ctv_line_employee_id: isCollaborator ? ctvLineEmployeeId : undefined,
      ctv_line_department_id: isCollaborator ? ctvLineDepartmentId : undefined,
      count_as_line_revenue: isCollaborator ? countAsLineRevenue : undefined,
      // F2 source fields (partner only; director id only when source=director)
      f2_source: isPartner ? (f2Source as ApiSaleStaff['f2_source']) : null,
      f2_source_director_id:
        isPartner && f2Source === F2SourceEnum.director ? f2SourceDirectorId : null,
      commission_type: commType,
    })
    displayClose()
  }, [
    saleType,
    externalSaleTypeValues,
    selectedEmployeeId,
    selectedExchangeId,
    selectedCollaboratorId,
    selectedEmployee,
    selectedExchange,
    selectedCollaborator,
    participationPercentage,
    dealCommissionPercentage,
    commType,
    onConfirm,
    displayClose,
    // CTV line fields
    ctvLineType,
    ctvLineEmployeeId,
    ctvLineDepartmentId,
    countAsLineRevenue,
    // F2 source fields
    f2Source,
    f2SourceDirectorId,
  ])

  const handleCancel = useCallback(() => {
    onCancel?.()
    displayClose()
  }, [onCancel, displayClose])

  const handleSaleTypeChange = (newType: string) => {
    setSaleType(newType)
    if (newType === SaleType.partner) {
      if (defaultPartnerPctCommission != null && defaultPartnerPctCommission !== '') {
        setDealCommissionPercentage(String(defaultPartnerPctCommission))
        setCommType('pct')
      } else {
        setDealCommissionPercentage('')
        setCommType('pct')
      }
    } else if (!externalSaleTypeValues.includes(newType)) {
      const configuredPct = defaultMvCommission ?? defaultPctCommission
      if (configuredPct) {
        setDealCommissionPercentage(String(configuredPct))
        setCommType('pct')
      }
    } else if (newType !== SaleType.partner) {
      const configuredPct = defaultMvCommission ?? defaultPctCommission
      if (commissionType) {
        setDealCommissionPercentage(
          commissionType === 'amt'
            ? defaultAmtCommission
              ? String(defaultAmtCommission)
              : ''
            : configuredPct
              ? String(configuredPct)
              : ''
        )
        setCommType(commissionType)
      } else {
        setDealCommissionPercentage(
          defaultAmtCommission
            ? String(defaultAmtCommission)
            : configuredPct
              ? String(configuredPct)
              : ''
        )
        setCommType(defaultAmtCommission ? 'amt' : 'pct')
      }
    }
  }

  const handlePercentageChange = (
    value: string,
    setter: (val: string) => void,
    isAmount = false
  ) => {
    if (!value) {
      setter('')
      return
    }

    let parsedValue = value
    if (parsedValue.length > 1 && parsedValue.startsWith('0') && parsedValue[1] !== '.') {
      parsedValue = parsedValue.replace(/^0+/, '')
      if (parsedValue === '') parsedValue = '0'
    }

    const numVal = Number(parsedValue)
    if (isNaN(numVal)) return

    if (!isAmount && numVal > 100) {
      setter('100')
    } else if (numVal < 0) {
      setter('0')
    } else {
      setter(parsedValue)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Sale Type Selection */}
      <RadioGroup
        id="sale-type"
        label="Loại hình bán"
        options={saleTypeOptions}
        value={saleType}
        disabled={false}
        onChange={(val) => {
          handleSaleTypeChange(String(val))
          setSelectedEmployeeId(null)
          setSelectedEmployee(null)
          setSelectedExchangeId(null)
          setSelectedExchange(null)
          setSelectedCollaboratorId(null)
          setSelectedCollaborator(null)
          setError(undefined)
        }}
        required
        className="flex-row gap-4"
      />

      {/* Employee / Exchange Selection */}
      <SaleStaffSelect
        saleType={saleType}
        isInternal={!externalSaleTypeValues.includes(saleType)}
        employeeId={selectedEmployeeId}
        exchangeId={selectedExchangeId}
        collaboratorId={selectedCollaboratorId}
        onEmployeeChange={(id) => {
          setSelectedEmployeeId(id)
          if (id && !dealCommissionPercentage) {
            const fallbackComm = defaultMvCommission || defaultPctCommission
            if (fallbackComm) {
              setDealCommissionPercentage(String(fallbackComm))
              setCommType('pct')
            }
          }
        }}
        onExchangeChange={(id) => {
          setSelectedExchangeId(id)
          if (saleType === SaleType.partner && id) {
            const match = f2Commissions?.find((c: any) => String(c.exchange_id) === String(id))
            if (match?.current_commission) {
              const { pct, amt } = resolveRateTriple(
                match.current_commission.f2_commission_spec,
                match.current_commission.pct_f2_commission,
                match.current_commission.amt_f2_commission
              )
              if (pct != null) {
                setDealCommissionPercentage(String(pct))
                setCommType('pct')
                return
              } else if (amt != null) {
                setDealCommissionPercentage(String(Math.round(Number(amt))))
                setCommType('amt')
                return
              }
            }
            if (!dealCommissionPercentage) {
              const fallbackPartnerComm = defaultPartnerPctCommission || defaultPctCommission
              if (fallbackPartnerComm) {
                setDealCommissionPercentage(String(fallbackPartnerComm))
                setCommType('pct')
              }
            }
          }
        }}
        onCollaboratorChange={(id) => {
          setSelectedCollaboratorId(id)
          if (id && !dealCommissionPercentage) {
            const fallbackComm = defaultMvCommission || defaultPctCommission
            if (fallbackComm) {
              setDealCommissionPercentage(String(fallbackComm))
              setCommType('pct')
            }
          }
        }}
        onEmployeeEntityChange={setSelectedEmployee}
        onExchangeEntityChange={setSelectedExchange}
        onCollaboratorEntityChange={setSelectedCollaborator}
        error={error?.field === 'primary' ? error.message : undefined}
        onClearError={() => setError(undefined)}
        exchangeOptions={exchangeOptions}
        employeeAdditionalParams={
          typeof employeeAdditionalParams === 'function'
            ? employeeAdditionalParams(saleType)
            : employeeAdditionalParams
        }
        exchangeAdditionalParams={
          typeof exchangeAdditionalParams === 'function'
            ? exchangeAdditionalParams(saleType)
            : exchangeAdditionalParams
        }
      />

      {/* Collaborator Source & Line Fields — only when sale_type = collaborator */}
      {saleType === SaleType.collaborator && (
        <div className="border-border-1 mt-2 flex flex-col gap-4 border-t pt-4">
          <h4 className="typo-body-base-semibold text-content-dark-1">
            Thông tin Line (Người phụ trách)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Loại line"
              value={ctvLineType}
              error={error?.field === 'ctvLineType' ? error.message : undefined}
              onChange={(val) => {
                const v = String(val)
                setCtvLineType(v)
                setError(undefined)
                // Always reset slave fields when type changes; then set sane
                // defaults for the new type so leftover values don't submit.
                if (v === CtvLineType.independent) {
                  setCtvLineEmployeeId(null)
                  setCtvLineDepartmentId(null)
                  setCountAsLineRevenue(false)
                } else if (v === CtvLineType.exchange_dept) {
                  setCtvLineEmployeeId(null)
                  setCountAsLineRevenue(true)
                } else {
                  // management | internal_sale
                  setCtvLineEmployeeId(null)
                  setCtvLineDepartmentId(null)
                  setCountAsLineRevenue(true)
                }
              }}
              options={ctvLineTypeOptions}
              placeholder="Chọn loại line"
            />
          </div>

          {ctvLineType && ctvLineType !== CtvLineType.independent && (
            <div className="grid grid-cols-2 gap-4">
              {(ctvLineType === CtvLineType.management ||
                ctvLineType === CtvLineType.internal_sale) && (
                <Select
                  label="Nhân viên MV"
                  required
                  value={ctvLineEmployeeId}
                  error={error?.field === 'ctvLineEmployee' ? error.message : undefined}
                  onChange={(id) => {
                    const numId = id ? Number(id) : null
                    setCtvLineEmployeeId(numId)
                    setError(undefined)
                    if (numId) {
                      const emp = getCachedEmployeeById(numId)
                      if (emp?.department?.id) {
                        setCtvLineDepartmentId(emp.department.id)
                      }
                    } else {
                      setCtvLineDepartmentId(null)
                    }
                  }}
                  loadOptions={loadEmployeeOptions}
                  loadInitialOptions={loadInitialEmployeeOptions}
                  enableSearch
                  searchPlaceholder="Tìm nhân viên MV..."
                  placeholder="Chọn nhân viên MV..."
                />
              )}

              <Select
                label={
                  ctvLineType === CtvLineType.exchange_dept ? 'Phòng quản lý sàn LK' : 'Phòng ban'
                }
                required
                disabled={
                  (ctvLineType === CtvLineType.management ||
                    ctvLineType === CtvLineType.internal_sale) &&
                  !!ctvLineEmployeeId
                }
                value={ctvLineDepartmentId}
                error={error?.field === 'ctvLineDepartment' ? error.message : undefined}
                onChange={(id) => {
                  setCtvLineDepartmentId(id ? Number(id) : null)
                  setError(undefined)
                }}
                loadOptions={loadDepartmentOptions}
                loadInitialOptions={loadInitialDepartmentOptions}
                enableSearch
                searchPlaceholder={
                  ctvLineType === CtvLineType.exchange_dept
                    ? 'Tìm phòng quản lý sàn LK...'
                    : 'Tìm phòng ban...'
                }
                placeholder={
                  ctvLineType === CtvLineType.exchange_dept
                    ? 'Chọn phòng quản lý sàn LK...'
                    : 'Chọn phòng ban...'
                }
              />
            </div>
          )}

          {ctvLineType && ctvLineType !== CtvLineType.independent && (
            <div className="pt-2">
              <Checkbox
                id="count_as_line_revenue"
                label="Tính doanh thu phòng (Sẽ cộng vào doanh thu KPI của quản lý line)"
                checked={countAsLineRevenue}
                onCheckedChange={(val) => setCountAsLineRevenue(val === true)}
              />
            </div>
          )}
        </div>
      )}

      {/* F2 source — only when sale_type = partner */}
      {saleType === SaleType.partner && (
        <div className="border-border-1 mt-2 flex flex-col gap-4 border-t pt-4">
          <h4 className="typo-body-base-semibold text-content-dark-1">Nguồn F2 (theo giao dịch)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Nguồn F2"
              required
              value={f2Source}
              onChange={(val) => {
                // KHÔNG `String(val)` trần: xoá ô làm Select bắn `null`, `String(null)`
                // ra chuỗi "null" — một giá trị không thuộc enum, lọt xuống form rồi bị
                // zod chặn bằng message tiếng Anh ở `sales_staff.<i>.f2_source`. Người
                // dùng chỉ thấy câu chung chung dưới bảng và không thể lưu (bug 86eyez5z6).
                const v = val === null || val === undefined || val === '' ? null : String(val)
                setF2Source(v)
                if (v !== F2SourceEnum.director) setF2SourceDirectorId(null)
                setError(undefined)
              }}
              options={f2SourceOptions}
              placeholder="Chọn nguồn F2"
              error={error?.field === 'f2Source' ? error.message : undefined}
            />
            {f2Source === F2SourceEnum.director && (
              <Select
                label="Giám đốc kinh doanh"
                required
                value={f2SourceDirectorId}
                onChange={(id) => {
                  setF2SourceDirectorId(id ? Number(id) : null)
                  setError(undefined)
                }}
                loadOptions={loadDirectorOptions}
                loadInitialOptions={loadInitialDirectorOptions}
                enableSearch
                searchPlaceholder="Tìm giám đốc..."
                placeholder="Chọn giám đốc..."
                error={error?.field === 'director' ? error.message : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Percentage Inputs */}
      {showPercentageInputs && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="typo-body-base-semibold text-content-dark-2">
              Tỷ lệ tham gia (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="border-border-1 focus:ring-brand-primary h-10 w-full [appearance:textfield] rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 [&::-webkit-inner-spin-button]:appearance-none"
              value={participationPercentage}
              onChange={(e) => handlePercentageChange(e.target.value, setParticipationPercentage)}
              placeholder="Nhập Tỷ lệ tham gia"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="typo-body-base-semibold text-content-dark-2">Hoa hồng</label>
            <div className="relative">
              {/*
                Ô read-only bên dưới dùng `min-h-10` chứ KHÔNG phải `h-10`: nó nằm ở cột nửa bề rộng
                của dialog, mà chuỗi phân số kèm quy đổi ("1 / 3 của 100.000.000 đ ≈ 33.333.333 đ")
                dài hơn ô ⇒ xuống dòng. Chiều cao cứng 40px + `items-center` mà không có
                `overflow-hidden` thì dòng thứ hai tràn ra đè lên phần dưới. Và KHÔNG `truncate`:
                chuỗi có số tiền, cắt đi là giấu mất hàng tỷ (conventions.md — "số tiền thì cho
                xuống dòng, không truncate").
              */}
              {matchedF2FractionText ? (
                <div className="border-border-1 bg-neutral-30 text-content-dark-3 flex min-h-10 w-full cursor-not-allowed items-center rounded-md border px-3 py-2 text-sm">
                  {matchedF2FractionText}
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    min={0}
                    max={commType === 'amt' ? undefined : 100}
                    step={commType === 'amt' ? '1' : '0.01'}
                    className={`border-border-1 focus:ring-brand-primary h-10 w-full [appearance:textfield] rounded-md border bg-transparent py-2 pr-14 pl-3 text-sm outline-none focus:ring-1 [&::-webkit-inner-spin-button]:appearance-none ${!isCommissionEditable ? 'bg-neutral-30 text-content-dark-3 cursor-not-allowed' : ''}`}
                    value={dealCommissionPercentage}
                    disabled={!isCommissionEditable}
                    onChange={(e) =>
                      handlePercentageChange(
                        e.target.value,
                        setDealCommissionPercentage,
                        commType === 'amt'
                      )
                    }
                    placeholder={commType === 'amt' ? 'Nhập hoa hồng' : 'Nhập tỉ lệ hoa hồng'}
                  />
                  <button
                    type="button"
                    disabled={!isCommissionEditable}
                    onClick={() => {
                      if (!isCommissionEditable) return
                      setCommType((prev) => (prev === 'pct' ? 'amt' : 'pct'))
                      setDealCommissionPercentage('')
                    }}
                    className={`text-brand-primary hover:bg-brand-primary/10 absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${!isCommissionEditable ? 'cursor-not-allowed text-gray-400' : ''}`}
                    title={commType === 'pct' ? 'Chuyển sang VNĐ' : 'Chuyển sang %'}
                  >
                    {commType === 'pct' ? '%' : 'VNĐ'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={handleCancel} className="min-w-24">
          Huỷ
        </Button>
        <Button variant="primary" onClick={handleConfirm} className="min-w-24">
          {submitText}
        </Button>
      </div>
    </div>
  )
}

export default AddSaleStaffDialog
