import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DateRange } from 'react-day-picker'

import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import useAppConstant from '@/hooks/useAppConstant'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import {
  paymentVoucherFilterSchema,
  type PaymentVoucherFilterValues,
  DEFAULT_PAYMENT_VOUCHER_FILTER,
} from '@/features/accounting/payment-vouchers/types/payment-voucher-types'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PayeeType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'

export type PaymentVoucherFilterFormRef = {
  clearForm: () => void
  getValues: () => PaymentVoucherFilterValues
}

type PaymentVoucherFilterFormProps = {
  initialValues?: Partial<PaymentVoucherFilterValues>
}

// Field ID người chi tương ứng cho từng loại đối tác. SUPPLIER không có param lọc ở BE → không xuất hiện.
type RecipientFieldName = 'payee_employee' | 'payee_collaborator' | 'payee_exchange'

type RecipientConfig = {
  name: RecipientFieldName
  loadOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialOptions: (values: (string | number)[]) => Promise<SelectOption[]>
}

const PaymentVoucherFilterForm = forwardRef<
  PaymentVoucherFilterFormRef,
  PaymentVoucherFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { keysMap, keysMapOptions } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [
      PAYMENT_VOUCHER_CONSTANT_KEYS.STATUS,
      PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD,
      PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE,
    ],
  })

  const statusOptions = keysMapOptions.get(PAYMENT_VOUCHER_CONSTANT_KEYS.STATUS) ?? []
  const methodOptions = keysMapOptions.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD) ?? []
  const payeeOptions = keysMapOptions.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE) ?? []
  const payeeTypeLabels = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE) as
    | Record<string, string>
    | undefined

  const { register, control, handleSubmit, reset, getValues, setValue } =
    useForm<PaymentVoucherFilterValues>({
      resolver: zodResolver(paymentVoucherFilterSchema) as any,
      defaultValues: { ...DEFAULT_PAYMENT_VOUCHER_FILTER, ...initialValues },
    })

  const voucherDateAfter = useWatch({ control, name: 'voucher_date_after' })
  const voucherDateBefore = useWatch({ control, name: 'voucher_date_before' })

  // useMemo, không dựng inline: DateRangePicker đồng bộ state nội bộ theo `value`, nên một object
  // mới mỗi lần render sẽ khiến effect chạy lại vô hạn.
  const dateRangeValue = useMemo<DateRange | undefined>(
    () =>
      voucherDateAfter || voucherDateBefore
        ? { from: voucherDateAfter ?? undefined, to: voucherDateBefore ?? undefined }
        : undefined,
    [voucherDateAfter, voucherDateBefore]
  )

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue('voucher_date_after', range?.from ?? null)
      setValue('voucher_date_before', range?.to ?? null)
    },
    [setValue]
  )

  const payeeType = useWatch({ control, name: 'payee_type' })

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect()
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()
  const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  // Người chi phụ thuộc loại đối tác. Chưa chọn loại / SUPPLIER → không render controller.
  const recipientConfig = useMemo<RecipientConfig | null>(() => {
    switch (payeeType) {
      case PayeeType.EMPLOYEE:
        return {
          name: 'payee_employee',
          loadOptions: loadEmployeeOptions,
          loadInitialOptions: loadInitialEmployeeOptions,
        }
      case PayeeType.COLLABORATOR:
        return {
          name: 'payee_collaborator',
          loadOptions: loadCollaboratorOptions,
          loadInitialOptions: loadInitialCollaboratorOptions,
        }
      case PayeeType.EXCHANGE:
        return {
          name: 'payee_exchange',
          loadOptions: loadExchangeOptions,
          loadInitialOptions: loadInitialExchangeOptions,
        }
      default:
        return null
    }
  }, [
    payeeType,
    loadEmployeeOptions,
    loadInitialEmployeeOptions,
    loadCollaboratorOptions,
    loadInitialCollaboratorOptions,
    loadExchangeOptions,
    loadInitialExchangeOptions,
  ])

  const recipientLabel = payeeType ? (payeeTypeLabels?.[payeeType] ?? '') : ''

  useEffect(() => {
    reset({ ...DEFAULT_PAYMENT_VOUCHER_FILTER, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_PAYMENT_VOUCHER_FILTER)
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  const onSubmit = useCallback(() => {}, [])

  return (
    <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <DateRangePicker
            key={`voucher-date-${formKey}`}
            label="Ngày chi"
            value={dateRangeValue}
            onChange={handleDateRangeChange}
          />
        </div>

        <FormController
          key={`status-${formKey}`}
          register={register}
          name="status"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Chọn trạng thái',
            clearable: true,
          }}
        />

        <FormController
          key={`payment_method-${formKey}`}
          register={register}
          name="payment_method"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Hình thức thanh toán',
            options: methodOptions,
            placeholder: 'Chọn hình thức',
            clearable: true,
          }}
        />

        <FormController
          key={`payee_type-${formKey}`}
          register={register}
          name="payee_type"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Loại đối tác',
            options: payeeOptions,
            placeholder: 'Chọn loại đối tác',
            clearable: true,
          }}
        />

        {recipientConfig && (
          <FormController
            key={`recipient-${payeeType}-${formKey}`}
            register={register}
            name={recipientConfig.name}
            control={control}
            Field={Select}
            fieldProps={{
              label: recipientLabel,
              placeholder: recipientLabel ? `Chọn ${recipientLabel.toLowerCase()}` : 'Chọn',
              loadOptions: recipientConfig.loadOptions,
              loadInitialOptions: recipientConfig.loadInitialOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
        )}
      </div>
    </Form>
  )
})

PaymentVoucherFilterForm.displayName = 'PaymentVoucherFilterForm'

export default PaymentVoucherFilterForm
