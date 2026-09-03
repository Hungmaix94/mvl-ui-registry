import { forwardRef, useImperativeHandle } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField, Select, RateInput, RadioGroup } from '@/components/ui'
import type { ResolvedRateValue } from '@/components/ui'
import { useSaleAllocationLoadOptions } from '@/features/project/sale-allocations/services/useSaleAllocationLoadOptions'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { parse } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { formatDateToApi } from '@/utils/date-utils'
import { fromRateSpec, toRateSpecPayload } from '@/utils/rate-spec'
import ReconVatToggle from '@/features/sales/_shared/reconciliation/ReconVatToggle'
import { FormMoneyPercentField } from '@/components/commons/FormMoneyPercentField'
import { FieldLabelWithNote } from '@/components/commons/FieldLabelWithNote'

const numericField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}, z.number().nullable().optional()) as z.ZodType<number | null | undefined, z.ZodTypeDef, any>

const f2PeriodSchema = z
  .object({
    exchange: z.number().nullable().optional(),
    exchange_tier: z.enum(['F1', 'F2'], {
      required_error: 'Vui lòng chọn loại sàn liên kết (F1 hoặc F2)',
    }),
    effective_from: z.string().min(1, 'Vui lòng chọn ngày bắt đầu hiệu lực'),
    effective_to: z.string().nullable().optional(),
    pct_f2_commission: numericField,
    amt_f2_commission: numericField,
    /**
     * Giá trị resolved từ RateInput cho "Hoa hồng sàn liên kết". Field UI tạm thời —
     * lúc submit map sang `f2_commission_spec` (nguồn sự thật) + cache pct/amt.
     */
    f2_commission_rate: z.custom<ResolvedRateValue>().nullish(),
    is_f2_commission_include_vat: z.boolean().nullable().optional(),

    pct_f2_bonus: numericField,
    amt_f2_bonus: numericField,
    is_f2_bonus_include_vat: z.boolean().nullable().optional(),

    pct_f2_inventory_hold: numericField,
  })
  .superRefine((val, ctx) => {
    if (val.f2_commission_rate?.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: val.f2_commission_rate.error,
        path: ['f2_commission_rate'],
      })
    }
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

export const SaleAllocationTbcF2Form = forwardRef<TbcF2FormRef, Props>(
  ({ initialValues, initialDateRange, exchangeId, exchangeName }, ref) => {
    const { loadExchangeOptions } = useSaleAllocationLoadOptions()
    const needsExchangeSelect = !exchangeId

    const form = useForm<F2PeriodFormValues>({
      resolver: zodResolver(f2PeriodSchema),
      defaultValues: {
        exchange: exchangeId || null,
        exchange_tier:
          initialValues?.exchange_tier || (initialValues?.pct_f2_inventory_hold ? 'F1' : 'F2'),
        is_f2_commission_include_vat: true,

        is_f2_bonus_include_vat: true,
        effective_from: initialDateRange?.from ? formatDateToApi(initialDateRange.from) : undefined,
        effective_to: initialDateRange?.to ? formatDateToApi(initialDateRange.to) : undefined,
        ...initialValues,
        f2_commission_rate: fromRateSpec(
          initialValues?.f2_commission_spec,
          initialValues?.pct_f2_commission,
          initialValues?.amt_f2_commission
        ),
      },
    })

    useImperativeHandle(ref, () => ({
      setError: form.setError,
      handleSubmit: (onSubmit) => {
        return form.handleSubmit(
          (values) => {
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

            // Send flat payload - API endpoint handles single record.
            // f2_commission_rate (UI-only) & exchange_tier (UI-only Radio) → map pct_f2_inventory_hold + f2_commission_spec.
            const { exchange: _exchange, f2_commission_rate, exchange_tier, ...rest } = values
            const f2Commission = toRateSpecPayload(f2_commission_rate)
            const finalHold = exchange_tier === 'F1' ? values.pct_f2_inventory_hold : null

            const payload = {
              ...rest,
              pct_f2_inventory_hold: finalHold,
              f2_commission_spec: f2Commission.spec,
              pct_f2_commission: f2Commission.pct,
              amt_f2_commission: f2Commission.amt,
              exchange: Number(selectedExchange),
              effective_from: formattedFrom,
              effective_to: formattedTo,
            }
            onSubmit(payload)
          },
          (errors) => {
            console.log('FORM ERRORS:', errors)
            // scrollToFirstError(errors)
          }
        )
      },
    }))

    const effectiveFromVal = form.watch('effective_from')
    const exchangeTierVal = form.watch('exchange_tier')
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
                  allowManualInput: true,
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
                  allowManualInput: true,
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

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
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

              <div>
                <Controller
                  control={form.control}
                  name="exchange_tier"
                  render={({ field, fieldState }) => (
                    <RadioGroup
                      id="exchange-tier"
                      label="Loại sàn liên kết"
                      required
                      disabled={false}
                      options={[
                        { label: 'Sàn F1 (Có giữ giỏ hàng)', value: 'F1' },
                        { label: 'Sàn F2 (Không giữ giỏ hàng)', value: 'F2' },
                      ]}
                      value={field.value ?? 'F2'}
                      onChange={(val) => {
                        field.onChange(val)
                        if (val === 'F2') {
                          form.setValue('pct_f2_inventory_hold', null)
                        }
                      }}
                      error={fieldState.error?.message}
                      className="mt-1 flex-row gap-6"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div className="flex flex-col gap-2">
                <Controller
                  control={form.control}
                  name="f2_commission_rate"
                  render={({ field, fieldState }) => (
                    <RateInput
                      label="Hoa hồng sàn liên kết"
                      tooltip="Nhập trực tiếp %, số tiền cố định (₫) trên mỗi giao dịch, hoặc phân số của một số gốc (vd 1/3 của 4% phí đại lý)."
                      note={
                        <span aria-hidden className="invisible">
                          spacer
                        </span>
                      }
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      capAt100
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="is_f2_commission_include_vat"
                  render={({ field: vatField }) => (
                    <ReconVatToggle
                      checked={!!vatField.value}
                      onChange={vatField.onChange}
                      labelAfter
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <FormMoneyPercentField
                  form={form}
                  pctName="pct_f2_bonus"
                  amtName="amt_f2_bonus"
                  label={
                    <FieldLabelWithNote
                      label="Thưởng F2"
                      note="Theo quy định của CĐT hoặc MV tự thưởng"
                    />
                  }
                />
                <Controller
                  control={form.control}
                  name="is_f2_bonus_include_vat"
                  render={({ field: vatField }) => (
                    <ReconVatToggle
                      checked={!!vatField.value}
                      onChange={vatField.onChange}
                      labelAfter
                    />
                  )}
                />
              </div>

              {exchangeTierVal === 'F1' && (
                <div className="flex flex-col">
                  <FormMoneyPercentField
                    form={form}
                    pctName="pct_f2_inventory_hold"
                    label="Tỷ lệ giữ giỏ hàng"
                    pctOnly
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    )
  }
)

SaleAllocationTbcF2Form.displayName = 'SaleAllocationTbcF2Form'
