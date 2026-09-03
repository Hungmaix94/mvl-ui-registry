import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DateRange } from 'react-day-picker'
import { Checkbox } from '@/components/ui/checkbox'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'

const numericField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}, z.number().nullable().optional()) as z.ZodType<number | null | undefined, z.ZodTypeDef, any>

const f2PeriodSchema = z.object({
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

export type F2PeriodDialogProps = {
  initialDateRange?: DateRange
  initialValues?: Partial<F2PeriodFormValues>
  isEditing?: boolean
  onApply: (range: { from: Date; to: Date | null }, values: F2PeriodFormValues) => void
}

export type F2PeriodDialogRef = {
  submit: () => boolean | Promise<boolean>
}

import { FormCombinedRateField } from '@/components/commons/FormCombinedRateField'

function CategoryVatField({ catKey, form }: { catKey: string; form: any }) {
  return (
    <div className="flex-1 pt-6">
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

export const F2PeriodDialog = forwardRef<F2PeriodDialogRef, F2PeriodDialogProps>(
  ({ initialDateRange, initialValues, isEditing, onApply }, ref) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
    const [dateError, setDateError] = useState<string>('')

    const form = useForm<F2PeriodFormValues>({
      resolver: zodResolver(f2PeriodSchema),
      defaultValues: {
        is_f2_commission_include_vat: true,
        is_f2_bonus_include_vat: true,

        ...initialValues,
      },
    })

    const handleApply = async () => {
      if (!dateRange?.from) {
        setDateError('Vui lòng chọn thời gian Từ ngày')
        return false
      }

      if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
        setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc')
        return false
      }

      setDateError('')

      const isValid = await form.trigger()
      if (!isValid) return false

      const values = form.getValues()
      onApply({ from: dateRange.from, to: dateRange.to || null }, values)
      return true
    }

    useImperativeHandle(ref, () => ({
      submit: handleApply,
    }))

    return (
      <FormProvider {...form}>
        <div className="flex flex-col gap-6 pt-4 pb-2">
          {/* Thông tin thời gian */}
          <div className="flex flex-col gap-4">
            <h3 className="text-text-primary-default text-base font-semibold">
              Thông tin thời gian
            </h3>
            <DateRangePicker
              label="Khoảng thời gian áp dụng"
              required
              value={dateRange}
              onChange={(val) => {
                setDateRange(val || undefined)
                setDateError('')
              }}
              error={dateError}
            />
          </div>

          {/* Thông tin cấu hình F2 */}
          {!isEditing && (
            <div className="flex flex-col gap-4 border-t pt-4">
              <h3 className="text-text-primary-default text-base font-semibold">
                Cấu hình Hoa hồng & Thưởng
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormCombinedRateField
                  pctName="pct_f2_commission"
                  amtName="amt_f2_commission"
                  form={form}
                  label="Hoa hồng sàn liên kết"
                />
                <CategoryVatField catKey="f2_commission" form={form} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormCombinedRateField
                  pctName="pct_f2_bonus"
                  amtName="amt_f2_bonus"
                  form={form}
                  label="Thưởng từ CĐT"
                />
                <CategoryVatField catKey="f2_bonus" form={form} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          )}
        </div>
      </FormProvider>
    )
  }
)
