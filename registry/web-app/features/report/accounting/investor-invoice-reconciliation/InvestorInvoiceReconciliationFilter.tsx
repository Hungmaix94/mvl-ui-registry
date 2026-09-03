import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useCallback,
  type ComponentProps,
} from 'react'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { parse } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Checkbox, Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { DATE_SERVER_FORMAT } from '@/constants/date-format'
import { formatDateToApi } from '@/utils/date-utils'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useDealSelect } from '@/hooks/useDealSelect'
import { useProject } from '@/services/realestate-service'

export type InvestorInvoiceReconciliationFilterFormData = {
  project?: string
  investor?: string
  deal?: string
  contract_date_from?: string
  contract_date_to?: string
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với contract_date_from/to, cộng thêm (AND). */
  transaction_sheet_date_from?: string
  transaction_sheet_date_to?: string
  /**
   * CR 86eyhhgdv — chỉ giữ căn còn phải đối chiếu (`Còn lại` > 0).
   *
   * Mặc định TẮT, khác với `has_debt` của báo cáo dự án (mặc định BẬT): so sánh ở đây là
   * CHẶT nên bật lên sẽ giấu luôn cả dòng ÂM (căn đã xuất hoá đơn vượt) — đó là dấu hiệu
   * bất thường kế toán cần nhìn thấy, không được tự ý ẩn đi khi người dùng chưa yêu cầu.
   */
  has_remaining?: boolean
}

function parseDateRange(from?: string, to?: string): DateRange | undefined {
  if (!from && !to) return undefined
  try {
    return {
      from: from ? parse(from, DATE_SERVER_FORMAT, new Date()) : undefined,
      to: to ? parse(to, DATE_SERVER_FORMAT, new Date()) : undefined,
    }
  } catch {
    return undefined
  }
}

/**
 * Ô tick BẮT BUỘC vào RHF dưới dạng boolean, không được là `undefined`.
 *
 * `has_remaining` là optional trong props, mà `Checkbox` truyền thẳng giá trị xuống
 * `checked` của Radix — `undefined` khiến Radix chạy UNCONTROLLED và tự giữ state riêng.
 * Từ đó quyền sở hữu giá trị chia đôi giữa Radix và RHF, kèm cảnh báo
 * "Checkbox is changing from uncontrolled to controlled" ngay lần tick đầu tiên.
 */
function withCheckboxDefaults(
  values?: InvestorInvoiceReconciliationFilterFormData
): InvestorInvoiceReconciliationFilterFormData {
  return { ...values, has_remaining: values?.has_remaining ?? false }
}

export type InvestorInvoiceReconciliationFilterRef = {
  getValues: () => InvestorInvoiceReconciliationFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: InvestorInvoiceReconciliationFilterFormData
  isOpen?: boolean
}

export const InvestorInvoiceReconciliationFilter = forwardRef<
  InvestorInvoiceReconciliationFilterRef,
  Props
>(({ initialValues, isOpen }, ref) => {
  const form = useForm<InvestorInvoiceReconciliationFilterFormData>({
    defaultValues: withCheckboxDefaults(initialValues),
  })
  const { control, register, setValue, getValues } = form

  // Khoảng ngày ký HĐ cọc (contract_date_from/to) — mặc định để trống = không lọc.
  const contractFrom = useWatch({ control, name: 'contract_date_from' })
  const contractTo = useWatch({ control, name: 'contract_date_to' })
  const contractDateRange = parseDateRange(contractFrom, contractTo)
  const handleContractDateChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue('contract_date_from', range?.from ? formatDateToApi(range.from) : '', {
        shouldDirty: false,
      })
      setValue('contract_date_to', range?.to ? formatDateToApi(range.to) : '', {
        shouldDirty: false,
      })
    },
    [setValue]
  )

  // Ngày làm phiếu TTGD — ĐỘC LẬP với khoảng ngày ký HĐ cọc ở trên, cộng thêm (AND).
  const transactionSheetFrom = useWatch({ control, name: 'transaction_sheet_date_from' })
  const transactionSheetTo = useWatch({ control, name: 'transaction_sheet_date_to' })
  const transactionSheetDateRange = parseDateRange(transactionSheetFrom, transactionSheetTo)
  const handleTransactionSheetDateChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue('transaction_sheet_date_from', range?.from ? formatDateToApi(range.from) : '', {
        shouldDirty: false,
      })
      setValue('transaction_sheet_date_to', range?.to ? formatDateToApi(range.to) : '', {
        shouldDirty: false,
      })
    },
    [setValue]
  )

  // "Chủ đầu tư" và "Căn hộ" phụ thuộc dự án đã chọn: một dự án thuộc đúng một CĐT,
  // và danh sách căn phải nằm trong dự án đó.
  const projectValue = useWatch({ control, name: 'project' })
  const projectId = Number(projectValue || 0)
  const isProjectSelected = projectId > 0

  const { data: projectDetail } = useProject(projectId)
  const projectInvestorId = projectDetail?.investor?.id

  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
    valueType: 'id',
  })
  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadDealOptions, loadInitialDealOptions } = useDealSelect({
    projectId: isProjectSelected ? projectId : undefined,
  })

  useEffect(() => {
    if (isOpen && initialValues) form.reset(withCheckboxDefaults(initialValues))
  }, [isOpen, initialValues, form])

  // Khi người dùng đổi dự án: reset CĐT (được suy ra lại từ dự án) và căn hộ
  // (phải thuộc dự án mới). Bỏ qua lần mount đầu để không xoá giá trị hydrate từ URL.
  const prevProjectRef = useRef(projectValue)
  useEffect(() => {
    if (prevProjectRef.current === projectValue) return
    prevProjectRef.current = projectValue
    setValue('investor', '')
    setValue('deal', '')
  }, [projectValue, setValue])

  // Auto-fill "Chủ đầu tư" theo CĐT của dự án đã chọn.
  useEffect(() => {
    if (!isProjectSelected || projectInvestorId == null) return
    const next = String(projectInvestorId)
    if (getValues('investor') !== next) setValue('investor', next)
  }, [isProjectSelected, projectInvestorId, getValues, setValue])

  useImperativeHandle(ref, () => ({
    getValues: () => form.getValues(),
    clearForm: () =>
      form.reset({
        project: '',
        investor: '',
        deal: '',
        contract_date_from: '',
        contract_date_to: '',
        transaction_sheet_date_from: '',
        transaction_sheet_date_to: '',
        has_remaining: false,
      }),
  }))

  return (
    <FormProvider {...form}>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormController<InvestorInvoiceReconciliationFilterFormData, any>
          register={register}
          control={control}
          name="project"
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

        <FormController<InvestorInvoiceReconciliationFilterFormData, any>
          register={register}
          control={control}
          name="investor"
          Field={Select}
          fieldProps={{
            label: 'Chủ đầu tư',
            placeholder: 'Chọn CĐT',
            loadOptions: loadInvestorOptions,
            loadInitialOptions: loadInitialInvestorOptions,
            enableSearch: true,
            clearable: true,
            disabled: isProjectSelected,
          }}
        />

        <FormController<InvestorInvoiceReconciliationFilterFormData, any>
          key={`deal-${projectValue ?? 'all'}`}
          register={register}
          control={control}
          name="deal"
          Field={Select}
          fieldProps={{
            label: 'Căn hộ (Deal)',
            placeholder: 'Chọn căn hộ',
            loadOptions: loadDealOptions,
            loadInitialOptions: loadInitialDealOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <div className="md:col-span-2 lg:col-span-3">
          <DateRangePicker
            label={'Ngày ký HĐ cọc'}
            value={contractDateRange}
            onChange={handleContractDateChange}
            showQuickSelect={true}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <DateRangePicker
            label={'Ngày làm phiếu TTGD'}
            value={transactionSheetDateRange}
            onChange={handleTransactionSheetDateChange}
            showQuickSelect={true}
          />
        </div>

        {/* Ô tick phải có tiêu đề vùng dữ liệu như mọi field khác trong dialog, nếu không nó
            trôi lơ lửng và người dùng không biết nó đang lọc theo cột nào. Tiêu đề dùng đúng
            typography của `Select`/`DateRangePicker` — là `span` chứ không phải `label` vì
            `Checkbox` đã tự gắn `<label htmlFor>` của riêng nó, hai label cho một control sẽ
            làm trình đọc màn hình đọc lặp.

            Chữ trên ô tick trùng ĐÚNG dòng bộ lọc trong file Excel BE xuất ra, để kế toán
            đối chiếu màn hình với file tải về mà không phải suy diễn. */}
        <div className="flex w-full flex-col gap-2">
          <span className="typo-body-base-semibold text-neutral-90">Số tiền còn lại</span>
          <FormController<
            InvestorInvoiceReconciliationFilterFormData,
            ComponentProps<typeof Checkbox>
          >
            register={register}
            control={control}
            name="has_remaining"
            Field={Checkbox}
            fieldProps={{ label: 'Chỉ hiện dòng còn lại > 0' }}
          />
        </div>
      </div>
    </FormProvider>
  )
})

InvestorInvoiceReconciliationFilter.displayName = 'InvestorInvoiceReconciliationFilter'

export default InvestorInvoiceReconciliationFilter
