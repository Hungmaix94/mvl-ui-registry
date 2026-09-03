import { forwardRef, useCallback, useImperativeHandle, useEffect, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import { Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'

export type ReceiptFilterFormData = {
  status?: string
  payment_method?: string
  payer_investor?: string
  payer_type?: string
  /** CR STT47: khoảng ngày thu tiền, map thẳng sang `receipt_date_after` / `_before` của API. */
  receipt_date_after?: Date | null
  receipt_date_before?: Date | null
  payer_tax_code?: string
}

// For backwards compatibility with old ReceiptVoucherListPage
export type ReceiptVoucherFilterFormData = ReceiptFilterFormData

export type ReceiptVoucherFilterRef = {
  getValues: () => ReceiptFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: ReceiptFilterFormData
  isOpen?: boolean
  /** Giới hạn ngày chọn được theo kỳ kế toán đang mở trên toolbar (CR STT47). */
  minDate?: Date
  maxDate?: Date
}

export const ReceiptVoucherFilter = forwardRef<any, Props>(
  ({ initialValues, isOpen, minDate, maxDate }, ref) => {
    const form = useForm<ReceiptFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register, watch, setValue } = form

    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect()

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [
        APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_STATUS_CHOICES,
        APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES,
        APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES,
      ],
    })

    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_STATUS_CHOICES) ?? []
    const payerTypeOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES) ?? []
    const paymentMethodOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES) ?? []

    const payerType = watch('payer_type')

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useEffect(() => {
      if (payerType && payerType !== 'INVESTOR') {
        form.setValue('payer_investor', undefined)
      }
    }, [payerType, form])

    const receiptDateAfter = watch('receipt_date_after')
    const receiptDateBefore = watch('receipt_date_before')

    // useMemo, không dựng inline: DateRangePicker đồng bộ state nội bộ theo `value`, nên một object
    // mới mỗi lần render sẽ khiến effect chạy lại vô hạn.
    const dateRangeValue = useMemo<DateRange | undefined>(
      () =>
        receiptDateAfter || receiptDateBefore
          ? { from: receiptDateAfter ?? undefined, to: receiptDateBefore ?? undefined }
          : undefined,
      [receiptDateAfter, receiptDateBefore]
    )

    const handleDateRangeChange = useCallback(
      (range: DateRange | undefined | null) => {
        setValue('receipt_date_after', range?.from ?? null)
        setValue('receipt_date_before', range?.to ?? null)
      },
      [setValue]
    )

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () =>
        form.reset({
          status: '',
          payment_method: '',
          payer_investor: '',
          payer_type: '',
          receipt_date_after: null,
          receipt_date_before: null,
          payer_tax_code: '',
        }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Khoảng ngày chiếm trọn một hàng: nhét vào ô 1/3 thì chuỗi
              "DD/MM/YYYY - DD/MM/YYYY" xuống dòng và ô cao hơn mọi ô bên cạnh. */}
          <div className="md:col-span-2 lg:col-span-3">
            <DateRangePicker
              label="Ngày thu tiền"
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>

          <FormController<ReceiptFilterFormData, any>
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái',
              options: statusOptions,
              clearable: true,
            }}
          />
          <FormController<ReceiptFilterFormData, any>
            register={register}
            control={control}
            name="payment_method"
            Field={Select}
            fieldProps={{
              label: 'Hình thức thanh toán',
              placeholder: 'Chọn hình thức',
              options: paymentMethodOptions,
              clearable: true,
            }}
          />
          <FormController<ReceiptFilterFormData, any>
            register={register}
            control={control}
            name="payer_type"
            Field={Select}
            fieldProps={{
              label: 'Phân loại đối tác',
              placeholder: 'Chọn phân loại',
              options: payerTypeOptions,
              clearable: true,
            }}
          />
          {(!payerType || payerType === 'INVESTOR') && (
            <FormController<ReceiptFilterFormData, any>
              register={register}
              control={control}
              name="payer_investor"
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
          )}
          <FormController<ReceiptFilterFormData, any>
            register={register}
            control={control}
            name="payer_tax_code"
            Field={TextField}
            fieldProps={{
              label: 'Mã số thuế',
              placeholder: 'Nhập mã số thuế',
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

ReceiptVoucherFilter.displayName = 'ReceiptVoucherFilter'

export default ReceiptVoucherFilter
