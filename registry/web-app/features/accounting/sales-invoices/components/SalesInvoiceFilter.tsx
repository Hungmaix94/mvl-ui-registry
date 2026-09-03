import { forwardRef, useCallback, useImperativeHandle, useEffect, useMemo } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { SOURCE_TYPE_OPTIONS } from '@/features/accounting/sales-invoices/types/sales-invoice-types'
import { ReconciliationSourceType as SourceType } from '@/constants/api-schema-aliases'

export type SalesInvoiceFilterFormData = {
  status__in?: string[]
  investor?: string
  /** CR STT47: khoảng ngày hóa đơn, map thẳng sang `invoice_date_after` / `_before` của API. */
  invoice_date_after?: Date | null
  invoice_date_before?: Date | null
  source_exchange?: string
  source_type?: string
}

/*
 * Ba tiêu chí đã bị GỠ khỏi dialog (CR 86eyqrn7k vòng 2, 25/08/2026) — đừng thêm lại:
 *
 * - `external_invoice_no` ("Số hóa đơn thực tế") và `customer_tax_code` ("MST khách hàng"):
 *   **trùng hoàn toàn** với ô Tìm kiếm ngoài toolbar, vì `search_fields` của BE đã gồm cả hai
 *   (`code · external_invoice_no · customer_name · customer_tax_code`). MST còn tệ hơn: bảng
 *   không có cột MST nên lọc xong người dùng không đối chiếu được kết quả với thứ mình vừa gõ.
 * - `investor_reconciliation_sheet` ("Phiếu đối chiếu CĐT"): thay bằng việc gõ thẳng MÃ phiếu
 *   vào ô Tìm kiếm — BE đã nhận `investor_reconciliation_sheet__code` trong `search_fields`
 *   (PR backend #3404). Kế toán cầm mã phiếu trong tay thì gõ luôn, không phải mở dialog rồi
 *   dò trong dropdown.
 */

export type SalesInvoiceFilterRef = {
  getValues: () => SalesInvoiceFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: SalesInvoiceFilterFormData
  isOpen?: boolean
  /** Giới hạn ngày chọn được theo kỳ kế toán đang mở trên toolbar (CR STT47). */
  minDate?: Date
  maxDate?: Date
}

export const SalesInvoiceFilter = forwardRef<SalesInvoiceFilterRef, Props>(
  ({ initialValues, isOpen, minDate, maxDate }, ref) => {
    const form = useForm<SalesInvoiceFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register, watch, setValue } = form

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.SALES_INVOICE_STATUS_CHOICES],
    })

    const statusOptions = useMemo(() => {
      const opts =
        keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.SALES_INVOICE_STATUS_CHOICES) || []
      return opts.map((opt) => {
        let label = opt.label
        if (opt.value === 'PAID' && label === 'Paid') label = 'Đã thanh toán'
        return { ...opt, label }
      })
    }, [keysMapOptions])

    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
    })
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

    // "Sàn F0" CHỈ có nghĩa khi nguồn là F0. Trước đây ô này ẩn khi chọn "Trực tiếp" nhưng vẫn
    // hiện lúc CHƯA chọn nguồn — mà lúc đó người dùng có thể chọn một sàn rồi để nguồn trống,
    // ra một tổ hợp không nói lên điều gì. Nay ô chỉ xuất hiện đúng khi `source_type` = F0.
    const sourceType = watch('source_type')
    const isF0Source = sourceType === SourceType.F0

    // An ma van giu gia tri thi Ap dung se ghi bo loc vo hinh len URL. Chay ca luc mount nen
    // link chia se mang san cap mau thuan cung duoc don.
    useEffect(() => {
      if (!isF0Source && form.getValues('source_exchange')) {
        setValue('source_exchange', '')
      }
    }, [isF0Source, form, setValue])

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      // "Xoá bộ lọc" bỏ luôn mọi ô tick trạng thái — tức là XEM TẤT CẢ, gồm cả hoá đơn đã huỷ.
      // Cố ý không reset về tập mặc định: người dùng bấm Xoá là muốn hết ràng buộc, và họ nhìn
      // thấy ngay các ô trống nên không có luật ngầm nào.
      clearForm: () =>
        form.reset({
          status__in: [],
          investor: '',
          invoice_date_after: null,
          invoice_date_before: null,
          source_exchange: '',
          source_type: '',
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

          {/*
            Chiếm trọn một hàng: nhóm ô tick chảy ngang rồi tự xuống dòng, nhét vào ô 1/3 thì
            8 trạng thái xuống thành 8 dòng và dialog cao gấp đôi.
          */}
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

          <FormController<SalesInvoiceFilterFormData, any>
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

          <FormController<SalesInvoiceFilterFormData, any>
            register={register}
            control={control}
            name="source_type"
            Field={Select}
            fieldProps={{
              label: 'Loại nguồn',
              placeholder: 'Chọn loại nguồn',
              options: SOURCE_TYPE_OPTIONS as unknown as { value: string; label: string }[],
              clearable: true,
            }}
          />

          {/* Chỉ hiện khi nguồn ĐÚNG là F0 — xem ghi chú ở `isF0Source`. */}
          {isF0Source && (
            <FormController<SalesInvoiceFilterFormData, any>
              register={register}
              control={control}
              name="source_exchange"
              Field={Select}
              fieldProps={{
                label: 'Sàn F0',
                placeholder: 'Chọn sàn F0',
                loadOptions: loadExchangeOptions,
                loadInitialOptions: loadInitialExchangeOptions,
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

SalesInvoiceFilter.displayName = 'SalesInvoiceFilter'

export default SalesInvoiceFilter
