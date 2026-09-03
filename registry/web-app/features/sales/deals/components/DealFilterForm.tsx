import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { getRealEstateService } from '@/services/realestate-service'
import { getSaleService } from '@/services/sales-service'
import { PAGE_SIZE } from '@/constants/table'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useBookingContractLoadOptions } from '@/features/project/booking-contract/services/useBookingContractLoadOptions'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'

export type DealFilterFormData = {
  project?: number
  investor?: number
  sales_allocation?: number
  code?: string
  unit_number?: string
  status?: string
  sold?: string
  deposit_month?: string
  deposit_year?: string
  deposit_date_from?: string
  deposit_date_to?: string
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với deposit_date_from/to, cộng thêm (AND). */
  transaction_sheet_date_from?: string
  transaction_sheet_date_to?: string
  f2_exchange?: number
  amt_agency_fee_min?: number
  amt_agency_fee_max?: number
  employee?: (string | number)[] | string | number
  collaborator?: number
  source_name?: string
}

export type DealFilterFormRef = {
  clearForm: () => void
  getValues: () => DealFilterFormData
}

interface DealFilterProps {
  initialValues?: FieldValues
  isOpen?: boolean
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}))

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - 2 + i
  return {
    value: String(year),
    label: `Năm ${year}`,
  }
})

const DealFilterForm = forwardRef<DealFilterFormRef, DealFilterProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES],
    })

    const dealStatusOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES) || [],
      [keysMapOptions]
    )

    const { register, control, handleSubmit, reset, getValues, watch } =
      useForm<DealFilterFormData>({
        defaultValues: {
          ...initialValues,
        },
      })

    const watchedProjectId = watch('project')
    const {
      loadProjectOptions,
      loadInitialProjectOptions,
      loadSalesAllocationOptions,
      loadInitialSalesAllocationOptions,
    } = useBookingContractLoadOptions({
      projectId: watchedProjectId,
    })

    const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect()
    const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect()

    const loadCollaboratorOptions = useCallback(
      async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
        try {
          const paginatedData = await getSaleService().getCollaborators({
            search: params.query || undefined,
            page: params.page,
            page_size: params.pageSize || PAGE_SIZE,
          })

          if (!paginatedData?.results) {
            return { items: [], nextPage: null, hasNextPage: false }
          }

          const items: SelectOption[] = paginatedData.results.map((r: any) => ({
            value: r.id,
            label: `${r.code || ''} - ${r.name || String(r.id)}`,
          }))

          let nextPage: number | null = null
          const hasNext = !!paginatedData.next
          if (hasNext && paginatedData.next) {
            try {
              const nextUrl = paginatedData.next.startsWith('http')
                ? new URL(paginatedData.next)
                : new URL(paginatedData.next, window.location.origin)
              const nextPageParam = nextUrl.searchParams.get('page')
              if (nextPageParam) nextPage = Number(nextPageParam)
            } catch {
              const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
              nextPage = pageMatch ? Number(pageMatch[1]) : params.page + 1
            }
          }

          return { items, nextPage, hasNextPage: hasNext }
        } catch {
          return { items: [], nextPage: null, hasNextPage: false }
        }
      },
      []
    )

    const loadInitialCollaboratorOptions = useCallback(
      async (values: (string | number)[]): Promise<SelectOption[]> => {
        if (!values || values.length === 0) return []
        try {
          const fetchPromises = values.map(async (id) => {
            try {
              const c = await getSaleService().getCollaborator(Number(id))
              return {
                label: `${c.code || ''} - ${c.name || String(c.id)}`,
                value: c.id,
              }
            } catch {
              return null
            }
          })
          const results = await Promise.all(fetchPromises)
          const filtered = results.filter(
            (item): item is { label: string; value: number } => item !== null
          )
          return filtered.map((item) => ({
            label: item.label,
            value: item.value,
          }))
        } catch {
          return []
        }
      },
      []
    )

    const loadInvestorOptions = useCallback(
      async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
        try {
          const paginatedData = await getRealEstateService().getInvestorDropdown({
            search: params.query || undefined,
            page: params.page,
            page_size: params.pageSize || PAGE_SIZE,
          })

          if (!paginatedData?.results) {
            return { items: [], nextPage: null, hasNextPage: false }
          }

          const items: SelectOption[] = paginatedData.results.map((r: any) => ({
            value: r.id,
            label: r.name ?? r.code ?? String(r.id),
          }))

          let nextPage: number | null = null
          const hasNext = !!paginatedData.next
          if (hasNext && paginatedData.next) {
            try {
              const nextUrl = paginatedData.next.startsWith('http')
                ? new URL(paginatedData.next)
                : new URL(paginatedData.next, window.location.origin)
              const nextPageParam = nextUrl.searchParams.get('page')
              if (nextPageParam) nextPage = Number(nextPageParam)
            } catch {
              const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
              nextPage = pageMatch ? Number(pageMatch[1]) : params.page + 1
            }
          }

          return { items, nextPage, hasNextPage: hasNext }
        } catch {
          return { items: [], nextPage: null, hasNextPage: false }
        }
      },
      []
    )

    const loadInitialInvestorOptions = useCallback(
      async (values: (string | number)[]): Promise<SelectOption[]> => {
        if (!values || values.length === 0) return []
        try {
          const ids = values.map(Number).filter(Boolean)
          const data = await getRealEstateService().getInvestorDropdown({
            id__in: ids,
            page_size: ids.length || 1,
          })
          return (
            data?.results?.map((p) => ({
              label: p.name || p.code || String(p.id),
              value: p.id,
            })) ?? []
          )
        } catch {
          return []
        }
      },
      []
    )

    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened && initialValues) {
        reset({
          project: initialValues.project,
          investor: initialValues.investor,
          status: initialValues.status,
          sold: initialValues.sold,
          sales_allocation: initialValues.sales_allocation,
          code: initialValues.code,
          unit_number: initialValues.unit_number,
          deposit_month: initialValues.deposit_month,
          deposit_year: initialValues.deposit_year,
          deposit_date_from: initialValues.deposit_date_from,
          deposit_date_to: initialValues.deposit_date_to,
          transaction_sheet_date_from: initialValues.transaction_sheet_date_from,
          transaction_sheet_date_to: initialValues.transaction_sheet_date_to,
          f2_exchange: initialValues.f2_exchange,
          amt_agency_fee_min: initialValues.amt_agency_fee_min,
          amt_agency_fee_max: initialValues.amt_agency_fee_max,
          employee: initialValues.employee,
          collaborator: initialValues.collaborator,
          source_name: initialValues.source_name,
        })
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setFormKey((k) => k + 1)
          reset({
            project: undefined,
            investor: undefined,
            status: undefined,
            sold: undefined,
            sales_allocation: undefined,
            code: undefined,
            unit_number: undefined,
            deposit_month: undefined,
            deposit_year: undefined,
            deposit_date_from: undefined,
            deposit_date_to: undefined,
            transaction_sheet_date_from: undefined,
            transaction_sheet_date_to: undefined,
            f2_exchange: undefined,
            amt_agency_fee_min: undefined,
            amt_agency_fee_max: undefined,
            employee: undefined,
            collaborator: undefined,
            source_name: undefined,
          })
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = () => {}

    return (
      <Form key={formKey} handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={false}>
        <Grid columns="2" gap="4" width="100%">
          <FormController
            register={register}
            name="code"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Mã giao dịch',
              placeholder: 'Nhập mã giao dịch',
            }}
          />
          <FormController
            register={register}
            name="unit_number"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Mã bất động sản',
              placeholder: 'Nhập mã bất động sản',
            }}
          />
          <FormController
            register={register}
            name="investor"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Chủ đầu tư',
              placeholder: 'Chọn chủ đầu tư',
              loadOptions: loadInvestorOptions,
              loadInitialOptions: loadInitialInvestorOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="project"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="sales_allocation"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Thông tin bán hàng',
              placeholder: 'Chọn thông tin bán hàng',
              loadOptions: loadSalesAllocationOptions,
              loadInitialOptions: loadInitialSalesAllocationOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="status"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái',
              options: dealStatusOptions,
            }}
          />
          <FormController
            register={register}
            name="sold"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Đã bán',
              placeholder: 'Chọn trạng thái bán',
              options: [{ value: 'true', label: 'Đã bán' }],
              clearable: true,
            }}
          />

          <FormController
            register={register}
            name="deposit_month"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Tháng cọc',
              placeholder: 'Chọn tháng',
              options: MONTH_OPTIONS,
            }}
          />
          <FormController
            register={register}
            name="deposit_year"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Năm cọc',
              placeholder: 'Chọn năm',
              options: YEAR_OPTIONS,
            }}
          />

          <FormController
            register={register}
            name="deposit_date_from"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày cọc từ',
              placeholder: 'Chọn ngày cọc từ',
              allowManualInput: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="deposit_date_to"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày cọc đến',
              placeholder: 'Chọn ngày cọc đến',
              allowManualInput: true,
              clearable: true,
            }}
          />

          <FormController
            register={register}
            name="transaction_sheet_date_from"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày làm phiếu TTGD từ',
              placeholder: 'Chọn ngày làm phiếu TTGD từ',
              allowManualInput: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="transaction_sheet_date_to"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày làm phiếu TTGD đến',
              placeholder: 'Chọn ngày làm phiếu TTGD đến',
              allowManualInput: true,
              clearable: true,
            }}
          />

          <FormController
            register={register}
            name="employee"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Nhân viên giao dịch',
              placeholder: 'Chọn nhân viên',
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              enableSearch: true,
              clearable: true,
              multiple: true,
            }}
          />
          <FormController
            register={register}
            name="collaborator"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Cộng tác viên',
              placeholder: 'Chọn cộng tác viên',
              loadOptions: loadCollaboratorOptions,
              loadInitialOptions: loadInitialCollaboratorOptions,
              enableSearch: true,
              clearable: true,
            }}
          />

          <FormController
            register={register}
            name="f2_exchange"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Đại lý lấy hàng (F2)',
              placeholder: 'Chọn đại lý lấy hàng',
              loadOptions: loadExchangeOptions,
              loadInitialOptions: loadInitialExchangeOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
          <FormController
            register={register}
            name="source_name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên nguồn',
              placeholder: 'Nhập tên nguồn',
            }}
          />

          <FormController
            register={register}
            name="amt_agency_fee_min"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Phí đại lý tối thiểu',
              placeholder: 'Nhập số tiền (VND)',
              type: 'number',
            }}
          />
          <FormController
            register={register}
            name="amt_agency_fee_max"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Phí đại lý tối đa',
              placeholder: 'Nhập số tiền (VND)',
              type: 'number',
            }}
          />
        </Grid>
      </Form>
    )
  }
)

DealFilterForm.displayName = 'DealFilterForm'

export default DealFilterForm
