import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
// `counterparty_type` của input-invoice dùng chung enum với `payee_type` của payment-voucher —
// `--dedupe-enums` gộp làm một, nên alias mang tên phiếu chi nhưng là đúng tập giá trị cần ở đây.
import { PaymentVoucherPayeeType as CounterpartyType } from '@/constants/api-schema-aliases'

export type InputInvoiceFilterFormData = {
  /**
   * Đổi từ `status` đơn sang `status__in` nhiều giá trị (CR 86eyqrn7k vòng 2) — nhóm ô tick, cùng
   * hình dạng với màn Hoá đơn bán ra. BE nhận `status__in` sẵn.
   */
  status__in?: string[]
  investor?: string
  collaborator?: string
  counterparty_type?: string
  exchange?: string
  /** CR STT47: khoảng ngày hóa đơn, map thẳng sang `invoice_date_after` / `_before` của API. */
  invoice_date_after?: Date | null
  invoice_date_before?: Date | null
}

/*
 * Hai tiêu chí đã bị GỠ khỏi dialog (CR 86eyqrn7k vòng 2, 25/08/2026) — đừng thêm lại:
 * `external_invoice_no` ("Số hóa đơn thực tế") và `tax_code` ("Mã số thuế"). Cả hai **trùng
 * hoàn toàn** với ô Tìm kiếm ngoài toolbar: `search_fields` của BE gồm
 * `code · supplier_name · external_invoice_no · seller_name · seller_tax_code`, và từ PR backend
 * #3404 có thêm `f2_reconciliation_sheet__code` nên gõ mã phiếu đối chiếu vào đó cũng ra.
 * Bảng cũng không có cột MST, nên lọc theo MST xong người dùng không đối chiếu được kết quả.
 */

export type InputInvoiceFilterRef = {
  getValues: () => InputInvoiceFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: InputInvoiceFilterFormData
  isOpen?: boolean
  /** Giới hạn ngày chọn được theo kỳ kế toán đang mở trên toolbar (CR STT47). */
  minDate?: Date
  maxDate?: Date
}

export const InputInvoiceFilter = forwardRef<InputInvoiceFilterRef, Props>(
  ({ initialValues, isOpen, minDate, maxDate }, ref) => {
    const form = useForm<InputInvoiceFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register, watch, setValue } = form

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [
        APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_STATUS_CHOICES,
        APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_COUNTERPARTY_TYPE_CHOICES,
      ],
    })

    const statusOptions = useMemo(() => {
      const opts =
        keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_STATUS_CHOICES) || []
      return opts.map((opt) => {
        let label = opt.label
        if (opt.value === 'PAID' && label === 'Paid') label = 'Đã thanh toán'
        if (opt.value === 'PARTIAL' && label.includes('{model_name}')) label = 'Một phần'
        return { ...opt, label }
      })
    }, [keysMapOptions])

    const counterpartyTypeOptions = useMemo(() => {
      return (
        keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_COUNTERPARTY_TYPE_CHOICES) ||
        []
      )
    }, [keysMapOptions])

    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
    })

    const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()

    const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({
      valueType: 'id',
    })

    const invoiceDateAfter = watch('invoice_date_after')
    const invoiceDateBefore = watch('invoice_date_before')

    // useMemo, không dựng inline: DateRangePicker đồng bộ state nội bộ theo `value`, nên một object
    // mới mỗi lần render sẽ khiến effect chạy lại vô hạn.
    const dateRangeValue = useMemo<DateRange | undefined>(
      () =>
        invoiceDateAfter || invoiceDateBefore
          ? { from: invoiceDateAfter ?? undefined, to: invoiceDateBefore ?? undefined }
          : undefined,
      [invoiceDateAfter, invoiceDateBefore]
    )

    const handleDateRangeChange = useCallback(
      (range: DateRange | undefined | null) => {
        setValue('invoice_date_after', range?.from ?? null)
        setValue('invoice_date_before', range?.to ?? null)
      },
      [setValue]
    )

    // `counterparty_type` quyet dinh doi tac nam o bang nao: EXCHANGE -> `exchange`,
    // COLLABORATOR -> `collaborator`. EMPLOYEE/SUPPLIER khong co FK nao de loc.
    const counterpartyType = watch('counterparty_type')

    const partnerField = useMemo(() => {
      switch (counterpartyType) {
        case CounterpartyType.EXCHANGE:
          return {
            name: 'exchange' as const,
            label: 'Sàn giao dịch',
            placeholder: 'Chọn sàn',
            loadOptions: loadExchangeOptions,
            loadInitialOptions: loadInitialExchangeOptions,
          }
        case CounterpartyType.COLLABORATOR:
          return {
            name: 'collaborator' as const,
            label: 'Cộng tác viên',
            placeholder: 'Chọn CTV',
            loadOptions: loadCollaboratorOptions,
            loadInitialOptions: loadInitialCollaboratorOptions,
          }
        default:
          return null
      }
    }, [
      counterpartyType,
      loadExchangeOptions,
      loadInitialExchangeOptions,
      loadCollaboratorOptions,
      loadInitialCollaboratorOptions,
    ])

    // Doi tac khong con khop loai thi phai XOA, khong chi an di: an ma van giu gia tri thi
    // Ap dung se ghi mot bo loc vo hinh len URL va danh sach ra rong ma nguoi dung khong hieu
    // vi sao. Chay ca luc mount nen link chia se mang san cap mau thuan cung duoc don.
    useEffect(() => {
      if (partnerField?.name !== 'exchange' && form.getValues('exchange')) {
        setValue('exchange', '')
      }
      if (partnerField?.name !== 'collaborator' && form.getValues('collaborator')) {
        setValue('collaborator', '')
      }
    }, [partnerField, form, setValue])

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      // "Xoá bộ lọc" bỏ luôn mọi ô tick trạng thái — tức XEM TẤT CẢ, gồm cả hoá đơn đã huỷ.
      clearForm: () =>
        form.reset({
          status__in: [],
          investor: '',
          collaborator: '',
          counterparty_type: '',
          exchange: '',
          invoice_date_after: null,
          invoice_date_before: null,
        }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Khoang ngay chiem tron mot hang: nhet vao o 1/3 thi chuoi
              "DD/MM/YYYY - DD/MM/YYYY" xuong dong va o cao hon moi o ben canh. */}
          <div className="md:col-span-2 lg:col-span-3">
            <DateRangePicker
              label="Ngày hóa đơn"
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>

          {/* Chiếm trọn một hàng — xem ghi chú cùng nội dung ở `SalesInvoiceFilter`. */}
          <div className="md:col-span-2 lg:col-span-3">
            <Controller
              control={control}
              name="status__in"
              render={({ field }) => (
                <CheckboxGroupField
                  label="Trạng thái"
                  options={statusOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <FormController<InputInvoiceFilterFormData, any>
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
            }}
          />

          {/* Chon loai truoc, roi moi hien dung mot o doi tac tuong ung — de canh nhau ca ba
              thi nguoi dung dat duoc to hop khong bao gio co ket qua (loai = San + chon CTV). */}
          <FormController<InputInvoiceFilterFormData, any>
            register={register}
            control={control}
            name="counterparty_type"
            Field={Select}
            fieldProps={{
              label: 'Phân loại đối tác',
              placeholder: 'Chọn phân loại',
              options: counterpartyTypeOptions,
              clearable: true,
            }}
          />

          {partnerField && (
            <FormController<InputInvoiceFilterFormData, any>
              key={partnerField.name}
              register={register}
              control={control}
              name={partnerField.name}
              Field={Select}
              fieldProps={{
                label: partnerField.label,
                placeholder: partnerField.placeholder,
                loadOptions: partnerField.loadOptions,
                loadInitialOptions: partnerField.loadInitialOptions,
                enableSearch: true,
                clearable: true,
              }}
            />
          )}
        </div>
      </FormProvider>
    )
  }
)

InputInvoiceFilter.displayName = 'InputInvoiceFilter'

export default InputInvoiceFilter
