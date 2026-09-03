import { forwardRef, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField, Select } from '@/components/ui'
import { Checkbox } from '@/components/ui/checkbox'
import { useSaleAllocationLoadOptions } from '@/features/project/sale-allocations/services/useSaleAllocationLoadOptions'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { parse } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { formatDateToApi } from '@/utils/date-utils'

const numericField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}, z.number().nullable().optional()) as z.ZodType<number | null | undefined, z.ZodTypeDef, any>

const f2PeriodSchema = z.object({
  exchange: z.number().nullable().optional(),
  effective_from: z.string().min(1, 'Vui lòng chọn ngày bắt đầu hiệu lực'),
  effective_to: z.string().nullable().optional(),
  pct_f2_commission: numericField,
  amt_f2_commission: numericField,
  is_f2_commission_include_vat: z.boolean().nullable().optional(),

  pct_f2_bonus: numericField,
  amt_f2_bonus: numericField,
  is_f2_bonus_include_vat: z.boolean().nullable().optional(),

  pct_f2_inventory_hold: numericField,

  pct_mv_bonus_to_f2: numericField,
  amt_mv_bonus_to_f2: numericField,
})

export type F2PeriodFormValues = z.infer<typeof f2PeriodSchema>

export type TbcF2FormRef = {
  handleSubmit: (onSubmit: (data: any) => void) => () => void
  setError: (name: keyof F2PeriodFormValues, error: { type?: string; message: string }) => void
}

type Props = {
  initialValues?: any
  initialDateRange?: DateRange
  exchangeId?: number
  exchangeName?: string
}

import { FormCombinedRateField } from '@/components/commons/FormCombinedRateField'

function VatCheckbox({ form, catKey }: { form: any; catKey: string }) {
  return (
    <div className="mt-2">
      <FormController
        register={form.register}
        control={form.control}
        name={`is_${catKey}_include_vat`}
        Field={Checkbox as any}
        fieldProps={{
          label: 'Gồm VAT',
        }}
      />
    </div>
  )
}

export const ProjectProductInventoryTbcF2Form = forwardRef<TbcF2FormRef, Props>(
  ({ initialValues, initialDateRange, exchangeId, exchangeName }, ref) => {
    const { loadExchangeOptions } = useSaleAllocationLoadOptions()
    const needsExchangeSelect = !exchangeId

    const form = useForm<F2PeriodFormValues>({
      resolver: zodResolver(f2PeriodSchema),
      defaultValues: {
        exchange: exchangeId || null,
        is_f2_commission_include_vat: true,
        is_f2_bonus_include_vat: true,

        effective_from: initialDateRange?.from ? formatDateToApi(initialDateRange.from) : undefined,
        effective_to: initialDateRange?.to ? formatDateToApi(initialDateRange.to) : undefined,
        ...initialValues,
      },
    })

    useImperativeHandle(ref, () => ({
      setError: form.setError,
      handleSubmit: (onSubmit) => {
        return form.handleSubmit((values) => {
          // Validate exchange is selected when not pre-set
          const selectedExchange = exchangeId || values.exchange
          if (!selectedExchange) {
            form.setError('exchange', { message: 'Vui lòng chọn sàn liên kết' })
            return
          }

          const formattedFrom = values.effective_from
            ? formatDateToApi(values.effective_from) || null
            : null
          const formattedTo = values.effective_to
            ? formatDateToApi(values.effective_to) || null
            : null

          // Send flat payload - API endpoint handles single record
          const { exchange: _exchange, ...rest } = values
          const payload = {
            ...rest,
            exchange: Number(selectedExchange),
            effective_from: formattedFrom,
            effective_to: formattedTo,
          }
          onSubmit(payload)
        })
      },
    }))

    const effectiveFromVal = form.watch('effective_from')
    const effectiveFromDate = effectiveFromVal
      ? parse(effectiveFromVal, 'dd/MM/yyyy', new Date())
      : undefined
    const disabledDaysForToDate =
      effectiveFromDate && !isNaN(effectiveFromDate.getTime())
        ? { before: effectiveFromDate }
        : undefined

    return (
      <FormProvider {...form}>
        <form className="flex w-full flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin thời gian
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormController
                register={form.register}
                control={form.control}
                name="effective_from"
                Field={DatePicker as any}
                fieldProps={{
                  placeholder: 'dd/MM/yyyy',
                  label: 'Ngày bắt đầu hiệu lực',
                  clearable: true,
                }}
              />
              <FormController
                register={form.register}
                control={form.control}
                name="effective_to"
                Field={DatePicker as any}
                fieldProps={{
                  placeholder: 'dd/MM/yyyy',
                  label: 'Ngày kết thúc hiệu lực',
                  disabledDays: disabledDaysForToDate,
                  clearable: true,
                }}
              />
            </div>
          </div>

          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin cấu hình sàn liên kết
              </h3>
            </div>

            <div className="mb-6 max-w-[calc(50%-0.5rem)]">
              {needsExchangeSelect ? (
                <FormController<F2PeriodFormValues, any>
                  register={form.register}
                  control={form.control}
                  name="exchange"
                  Field={Select}
                  fieldProps={{
                    label: 'Sàn liên kết',
                    loadOptions: loadExchangeOptions,
                    enableSearch: true,
                    searchPlaceholder: 'Tìm sàn...',
                    placeholder: 'Chọn sàn liên kết...',
                    required: true,
                  }}
                />
              ) : (
                <TextField
                  value={exchangeName || ''}
                  label="Sàn liên kết"
                  disabled
                  readOnly
                  placeholder="Không có thông tin sàn"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div className="flex flex-col">
                <FormCombinedRateField
                  pctName="pct_f2_commission"
                  amtName="amt_f2_commission"
                  form={form}
                  label="Hoa hồng sàn liên kết"
                />
                <VatCheckbox form={form} catKey="f2_commission" />
              </div>

              <div className="flex flex-col">
                <FormCombinedRateField
                  pctName="pct_f2_bonus"
                  amtName="amt_f2_bonus"
                  form={form}
                  label="Thưởng từ CĐT"
                />
                <VatCheckbox form={form} catKey="f2_bonus" />
              </div>

              <div className="flex flex-col">
                <FormCombinedRateField
                  pctName="pct_f2_inventory_hold"
                  amtName="amt_f2_inventory_hold"
                  form={form}
                  label="Tỷ lệ giữ giỏ hàng"
                  pctOnly
                />
              </div>
              {/* "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2) ẩn khỏi UI (ClickUp 86eycwqq1);
                  field giữ ở schema để không mất giá trị cũ khi sửa. */}
            </div>
          </div>
        </form>
      </FormProvider>
    )
  }
)

ProjectProductInventoryTbcF2Form.displayName = 'ProjectProductInventoryTbcF2Form'
