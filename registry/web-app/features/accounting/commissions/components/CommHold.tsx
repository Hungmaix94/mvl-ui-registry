import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import {
  PageTitle,
  Table,
  type TableAction,
  Chip,
  ColumnDef,
  Dash,
  TextField,
} from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { IconEye } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { COMMISSION_ACTION_PERMISSION } from '../constants/commission-permissions'
import FormController from '@/components/ui/form/FormController'
import { Select } from '@/components/ui'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { APP_PATH } from '@/routes'

import {
  type CommissionHoldGroup,
  useCommissionHoldsGrouped,
} from '@/features/accounting/commission-holds/services/commission-hold-service'
import {
  buildCommHoldApiParams,
  countActiveCommHoldFilters,
  heldAtRangeToParams,
  paramsToHeldAtRange,
  type CommHoldFilterValues,
} from '@/features/accounting/commissions/utils/comm-hold-filters'
import {
  buildHoldBreakdown,
  holdGroupIdentity,
  resolveBeneficiary,
} from '@/features/accounting/commissions/utils/comm-hold-group'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import {
  CommissionHoldStatus as HoldStatus,
  CommissionHoldBeneficiaryType as BeneficiaryType,
} from '@/constants/api-schema-aliases'

// ==========================================
// CONSTANTS — color variants (labels come from useAppConstant)
// ==========================================
const STATUS_VARIANT: Record<HoldStatus, ColoredValueVariant> = {
  [HoldStatus.ACTIVE]: ColoredValueVariant.ORANGE,
  [HoldStatus.RELEASED]: ColoredValueVariant.GREEN,
  [HoldStatus.CANCELLED]: ColoredValueVariant.GREY,
}

const BENEFICIARY_TYPE_VARIANT: Record<BeneficiaryType, ColoredValueVariant> = {
  [BeneficiaryType.EMPLOYEE]: ColoredValueVariant.BLUE,
  [BeneficiaryType.COLLABORATOR]: ColoredValueVariant.ORANGE,
  [BeneficiaryType.EXCHANGE]: ColoredValueVariant.PURPLE,
}

// ==========================================
// 1. FILTER FORM
// ==========================================
// The form holds the held date as a `DateRange` picker value; URL/API keeps it as the two
// `held_at_after`/`held_at_before` strings. Convert at the boundaries.
type CommHoldFilterFormValues = Omit<CommHoldFilterValues, 'held_at_after' | 'held_at_before'> & {
  held_at_range?: DateRange
}

const toCommHoldFormDefaults = (v?: CommHoldFilterValues): CommHoldFilterFormValues => ({
  status: v?.status ?? null,
  branch_id: v?.branch_id ?? null,
  block_id: v?.block_id ?? null,
  department_id: v?.department_id ?? null,
  employee_code: v?.employee_code ?? null,
  hold_reason: v?.hold_reason ?? null,
  tax_base: v?.tax_base ?? null,
  held_at_range: paramsToHeldAtRange(v ?? {}),
})

const CommHoldFilter = forwardRef<any, any>(({ initialValues, isOpen }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const form = useForm<CommHoldFilterFormValues>({
    defaultValues: toCommHoldFormDefaults(initialValues),
  })
  const { control, register, setValue, getValues, reset } = form
  const cascadeRef = useRef<any>(null)

  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_TAX_BASE_CHOICES,
    ],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES) || [],
    [keysMapOptions]
  )
  const holdReasonOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES) || [],
    [keysMapOptions]
  )
  const taxBaseOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_TAX_BASE_CHOICES) || [],
    [keysMapOptions]
  )

  useEffect(() => {
    if (isOpen) {
      reset(toCommHoldFormDefaults(initialValues))
      setFormKey((k) => k + 1)
    }
  }, [isOpen, initialValues, reset])

  useImperativeHandle(ref, () => ({
    getValues: () => getValues(),
    clearForm: () => {
      reset(toCommHoldFormDefaults(undefined))
      cascadeRef.current?.clearAll()
      setFormKey((k) => k + 1)
    },
  }))

  const handleCascadeChange = (data: any) => {
    setValue('branch_id', data.branch_id && data.branch_id > 0 ? data.branch_id : null, {
      shouldDirty: true,
    })
    setValue('block_id', data.block_id && data.block_id > 0 ? data.block_id : null, {
      shouldDirty: true,
    })
    setValue(
      'department_id',
      data.department_id && data.department_id > 0 ? data.department_id : null,
      { shouldDirty: true }
    )
  }

  return (
    <FormProvider {...form}>
      <Flex key={formKey} direction="column" gap="4" className="w-full">
        {/* Cascade Select: Branch, Block, Department */}
        <CascadeSelectGroupOrganization
          ref={cascadeRef}
          key={formKey}
          initialValues={{
            branch: initialValues?.branch_id?.toString(),
            block: initialValues?.block_id?.toString(),
            department: initialValues?.department_id?.toString(),
          }}
          onFormChange={handleCascadeChange}
          showDepartment={true}
          showEmployee={false}
          showPosition={false}
          layout="grid"
          skipValidation={true}
          className="gap-5"
        />

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <FormController<CommHoldFilterFormValues, any>
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái...',
              options: statusOptions,
              isClearable: true,
            }}
          />

          <FormController<CommHoldFilterFormValues, any>
            register={register}
            control={control}
            name="hold_reason"
            Field={Select}
            fieldProps={{
              label: 'Lý do giữ',
              placeholder: 'Chọn lý do giữ...',
              options: holdReasonOptions,
              isClearable: true,
            }}
          />

          <FormController<CommHoldFilterFormValues, any>
            register={register}
            control={control}
            name="tax_base"
            Field={Select}
            fieldProps={{
              label: 'Trước/sau thuế',
              placeholder: 'Chọn cơ sở thuế...',
              options: taxBaseOptions,
              isClearable: true,
            }}
          />

          <FormController<CommHoldFilterFormValues, any>
            register={register}
            control={control}
            name="employee_code"
            Field={TextField}
            fieldProps={{
              label: 'Mã người nhận',
              placeholder: 'Nhập mã nhân viên, CTV hoặc sàn F2...',
            }}
          />

          <div className="flex flex-col gap-2">
            <Controller
              name="held_at_range"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <DateRangePicker
                  label="Ngày giữ"
                  value={field.value || undefined}
                  showQuickSelect
                  onChange={(range) => field.onChange(range || null)}
                  error={error?.message}
                />
              )}
            />
          </div>
        </div>
      </Flex>
    </FormProvider>
  )
})
CommHoldFilter.displayName = 'CommHoldFilter'

// ==========================================
// 2. TABLE COMPONENT — mỗi dòng = 1 người nhận × 1 kỳ, xem chi tiết ở màn riêng
// ==========================================

type CommHoldTableProps = {
  data: CommissionHoldGroup[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

const CommHoldTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  currentPageIndex = 0,
  onPaginationChange,
}: CommHoldTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES,
    ],
  })

  const statusLabels = keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_STATUS_CHOICES) as
    | Record<string, string>
    | undefined
  const beneficiaryTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_BENEFICIARY_TYPE_CHOICES
  ) as Record<string, string> | undefined

  /** Điều hướng sang màn chi tiết (người nhận × kỳ) — group không có id nên URL mang 4 mảnh khoá. */
  const goToDetail = useCallback(
    (group: CommissionHoldGroup) => {
      const identity = holdGroupIdentity(group)
      if (!identity) return
      navigate(
        APP_PATH.COMMISSION_HOLD_DETAIL.replace(':beneficiaryType', identity.beneficiaryType)
          .replace(':beneficiaryId', String(identity.beneficiaryId))
          .replace(':year', String(identity.year))
          .replace(':month', String(identity.month))
      )
    },
    [navigate]
  )

  const columns: ColumnDef<CommissionHoldGroup>[] = useMemo(
    () => [
      {
        id: 'beneficiary',
        header: 'Người nhận',
        cell: ({ row }) => {
          const { name, code, meta } = resolveBeneficiary(row.original)
          const typeLabel =
            beneficiaryTypeLabels?.[row.original.beneficiary_type] ?? row.original.beneficiary_type
          const variant =
            BENEFICIARY_TYPE_VARIANT[row.original.beneficiary_type] ?? ColoredValueVariant.GREY
          return (
            <Flex direction="column" gap="1" align="start" className="py-0.5">
              <span className="text-content-dark-1 text-sm leading-snug font-semibold break-words">
                {name}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip label={String(typeLabel)} variant={variant} size="small" showDot />
                {code && <span className="text-content-dark-4 text-xs">{code}</span>}
              </div>
              {meta.length > 0 && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                  {meta.map((m) => (
                    <div key={m.label} className="flex gap-1 text-xs leading-snug">
                      <span className="text-content-dark-4 shrink-0">{m.label}:</span>
                      <span className="text-content-dark-2 break-words">{m.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Flex>
          )
        },
        meta: { width: 'w-[300px]', frozen: true },
      },
      {
        id: 'period',
        header: 'Kỳ',
        cell: ({ row }) => {
          const { commission_period_month, commission_period_year } = row.original
          if (!commission_period_year) return <Dash />
          return (
            <span className="text-content-dark-1 text-sm font-medium">
              {String(commission_period_month).padStart(2, '0')}/{commission_period_year}
            </span>
          )
        },
        meta: { width: 'w-[90px]' },
      },
      {
        id: 'total_hold_amount',
        header: 'Tổng đang giữ',
        cell: ({ row }) => {
          const total = Number(row.original.total_hold_amount || 0)
          return (
            <Flex direction="column" gap="0.5" align="end">
              <span className="text-content-dark-1 text-sm font-bold">
                {formatCurrencyVND(total)} ₫
              </span>
              <span className="text-content-dark-4 text-xs">
                {row.original.total_count} lệnh giữ
              </span>
            </Flex>
          )
        },
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'breakdown',
        header: 'Chi tiết giữ (ACTIVE)',
        cell: ({ row }) => {
          const items = buildHoldBreakdown(row.original)
          if (items.length === 0) return <Dash />
          return (
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <div key={item.key} className="flex justify-between gap-2 text-xs leading-snug">
                  <span className="text-content-dark-3">{item.label}</span>
                  <span className="text-content-dark-1 font-medium whitespace-nowrap">
                    {formatCurrencyVND(item.amount)} ₫
                  </span>
                </div>
              ))}
            </div>
          )
        },
        meta: { width: 'w-[260px]' },
      },
      {
        id: 'tax_split',
        header: 'Trước/sau thuế',
        cell: ({ row }) => {
          const preTax = Number(row.original.pre_tax_amount || 0)
          const postTax = Number(row.original.post_tax_amount || 0)
          if (preTax <= 0 && postTax <= 0) return <Dash />
          return (
            <div className="flex flex-col gap-0.5 text-xs leading-snug">
              {preTax > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-content-dark-3">Trước thuế</span>
                  <span className="text-content-dark-1 font-medium whitespace-nowrap">
                    {formatCurrencyVND(preTax)} ₫
                  </span>
                </div>
              )}
              {postTax > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-content-dark-3">Sau thuế</span>
                  <span className="text-content-dark-1 font-medium whitespace-nowrap">
                    {formatCurrencyVND(postTax)} ₫
                  </span>
                </div>
              )}
            </div>
          )
        },
        meta: { width: 'w-[170px]' },
      },
      {
        id: 'latest_held_at',
        header: 'Giữ gần nhất',
        cell: ({ row }) => {
          const val = row.original.latest_held_at
          return val ? (
            <span className="text-content-dark-2 text-sm">{formatDate(val)}</span>
          ) : (
            <Dash />
          )
        },
        meta: { width: 'w-[120px]' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const { active_count, released_count, cancelled_count } = row.original
          // Trạng thái group derive từ counter: còn ACTIVE nào → "Đang giữ (n)".
          if (active_count > 0) {
            return (
              <Chip
                variant={STATUS_VARIANT[HoldStatus.ACTIVE]}
                label={`${statusLabels?.[HoldStatus.ACTIVE] ?? 'Đang giữ'} (${active_count})`}
                size="small"
                showDot
              />
            )
          }
          if (released_count > 0) {
            return (
              <Chip
                variant={STATUS_VARIANT[HoldStatus.RELEASED]}
                label={`${statusLabels?.[HoldStatus.RELEASED] ?? 'Đã giải phóng'} (${released_count})`}
                size="small"
                showDot
              />
            )
          }
          return (
            <Chip
              variant={STATUS_VARIANT[HoldStatus.CANCELLED]}
              label={`${statusLabels?.[HoldStatus.CANCELLED] ?? 'Đã hủy'} (${cancelled_count})`}
              size="small"
              showDot
            />
          )
        },
        meta: { width: 'w-[150px]', frozenRight: true },
      },
    ],
    [statusLabels, beneficiaryTypeLabels]
  )

  const actions: TableAction<CommissionHoldGroup>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        // Route `COMMISSION_HOLD_DETAIL` khai `commissionhold.list` chứ không phải `.retrieve`:
        // nhóm tạm giữ không có id riêng (BE gộp theo người nhận × kỳ) nên màn chi tiết vẫn đọc
        // danh sách. Gate bằng `.retrieve` cho "hợp lý" là chặt hơn route ⇒ giấu nút của người
        // vào được màn.
        show: () =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.VIEW_HOLD_DETAIL.action,
            COMMISSION_ACTION_PERMISSION.VIEW_HOLD_DETAIL.subject
          ),
        onClick: goToDetail,
      },
    ],
    [ability, goToDetail]
  )

  if (error) {
    return <div className="px-7 py-10 text-center text-sm text-red-600">Lỗi tải dữ liệu</div>
  }

  return (
    <Table
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
      showSTT
      sttFrozen
      enablePagination
      manualPagination
      showActions
      rowActions={actions}
      onRowClick={goToDetail}
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
    />
  )
}

// ==========================================
// 3. MAIN COMPONENT (LIST PAGE)
// ==========================================
export default function CommHold() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const formRef = useRef<any>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  useEffect(() => {
    // The 2 tax_base tabs are merged into one list (ClickUp 86eyc21xw): no `tax_base` default
    // anymore — an unfiltered view shows BOTH PRE_TAX + POST_TAX. `tax_base` is now a normal
    // optional filter driven from the filter dialog.
    if (!searchParams.has('page')) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  const page = Number(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentFilters = useMemo(() => {
    const filters: CommHoldFilterValues = {}
    const status = searchParams.get('status')
    if (status) filters.status = status

    const branch_id = searchParams.get('branch')
    if (branch_id) filters.branch_id = Number(branch_id)

    const block_id = searchParams.get('block')
    if (block_id) filters.block_id = Number(block_id)

    const department_id = searchParams.get('department')
    if (department_id) filters.department_id = Number(department_id)

    const employee_code = searchParams.get('employee_code')
    if (employee_code) filters.employee_code = employee_code

    const hold_reason = searchParams.get('hold_reason')
    if (hold_reason) filters.hold_reason = hold_reason

    const tax_base = searchParams.get('tax_base')
    if (tax_base) filters.tax_base = tax_base

    const held_at_after = searchParams.get('held_at_after')
    if (held_at_after) filters.held_at_after = held_at_after

    const held_at_before = searchParams.get('held_at_before')
    if (held_at_before) filters.held_at_before = held_at_before

    return filters
  }, [searchParams])

  const activeFilterCount = countActiveCommHoldFilters(currentFilters)

  const apiFilters = useMemo(
    () =>
      buildCommHoldApiParams({
        filters: currentFilters,
        page,
        pageSize,
        search: searchParams.get('search'),
      }),
    [currentFilters, page, pageSize, searchParams]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useCommissionHoldsGrouped(apiFilters, { enabled: isUrlReady })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/commission-holds/export/',
    'giu-hoa-hong.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiFilters as Record<string, unknown>
    openExportDialog(filters)
  }, [apiFilters, openExportDialog])

  const handleApplyFilter = () => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.status) newParams.set('status', formData.status)
    else newParams.delete('status')

    if (formData.branch_id) newParams.set('branch', String(formData.branch_id))
    else newParams.delete('branch')

    if (formData.block_id) newParams.set('block', String(formData.block_id))
    else newParams.delete('block')

    if (formData.department_id) newParams.set('department', String(formData.department_id))
    else newParams.delete('department')

    if (formData.employee_code) newParams.set('employee_code', formData.employee_code)
    else newParams.delete('employee_code')

    if (formData.hold_reason) newParams.set('hold_reason', formData.hold_reason)
    else newParams.delete('hold_reason')

    if (formData.tax_base) newParams.set('tax_base', formData.tax_base)
    else newParams.delete('tax_base')

    const { held_at_after, held_at_before } = heldAtRangeToParams(formData.held_at_range)
    if (held_at_after) newParams.set('held_at_after', held_at_after)
    else newParams.delete('held_at_after')
    if (held_at_before) newParams.set('held_at_before', held_at_before)
    else newParams.delete('held_at_before')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const handleSearch = (value: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')
    if (value) {
      newParams.set('search', value)
    } else {
      newParams.delete('search')
    }
    setSearchParams(newParams, { replace: true })
  }

  const searchVal = searchParams.get('search') || ''

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Tạm giữ HH Sale"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={activeFilterCount}
        handleSearch={handleSearch}
        searchValue={searchVal}
        searchPlaceholder="Tìm tên/mã người nhận..."
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
      />

      {/* Scrollable table area — horizontal scroll bar + pagination pinned to bottom */}
      <CommHoldTable
        data={listResponse?.results ?? []}
        isLoading={isLoading}
        error={error}
        totalRecords={listResponse?.count ?? 0}
        pageSize={pageSize}
        onPaginationChange={handlePaginationChange}
      />

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <CommHoldFilter
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
