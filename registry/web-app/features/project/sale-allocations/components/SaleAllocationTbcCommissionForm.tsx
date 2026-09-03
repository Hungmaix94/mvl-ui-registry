import { forwardRef, useImperativeHandle } from 'react'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea } from '@/components/ui'
import ReconVatToggle from '@/features/sales/_shared/reconciliation/ReconVatToggle'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { FileUpload } from '@/components/ui'
import { scrollToFirstError } from '@/utils/form-utils'
import { isBefore, parse } from 'date-fns'
import { FormMoneyPercentField } from '@/components/commons/FormMoneyPercentField'
import { FieldLabelWithNote } from '@/components/commons/FieldLabelWithNote'

const dateStringSchema = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().nullable().optional()
)

const numericField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}, z.number().nullable().optional())

export const tbcCommissionSchema = z
  .object({
    id: z.number().optional(),
    effective_from: dateStringSchema,
    effective_to: dateStringSchema,
    note: z.string().nullable().optional(),

    pct_agency_fee: numericField,
    amt_agency_fee: numericField,
    is_agency_fee_include_vat: z.boolean().nullable().optional(),

    pct_investor_bonus: numericField,
    amt_investor_bonus: numericField,
    is_investor_bonus_include_vat: z.boolean().nullable().optional(),

    pct_shared_bonus: numericField,
    amt_shared_bonus: numericField,
    is_shared_bonus_include_vat: z.boolean().nullable().optional(),

    pct_sale_commission: numericField,
    amt_sale_commission: numericField,
    is_sale_commission_include_vat: z.boolean().nullable().optional(),

    pct_investor_bonus_to_sale: numericField,
    amt_investor_bonus_to_sale: numericField,
    is_investor_bonus_to_sale_include_vat: z.boolean().nullable().optional(),

    // Thưởng MV: chỉ có số tiền (mặc định trống = dự án không có thưởng nền).
    amt_staff_incentive: numericField,

    pct_revenue: numericField,
    amt_revenue: numericField,

    // Linked-exchange (SLK) KPI revenue basis — master-agent projects (% XOR fixed VND)
    pct_kpi_revenue_slk: numericField,
    amt_kpi_revenue_slk: numericField,

    attachment_ids: z.array(z.number()).optional(),
    attachment_tokens: z.array(z.string()).optional(),
    attachments: z.array(z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.effective_from && data.effective_to) {
      const fromDate = parse(data.effective_from, 'dd/MM/yyyy', new Date())
      const toDate = parse(data.effective_to, 'dd/MM/yyyy', new Date())
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        if (isBefore(toDate, fromDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ngày kết thúc phải sau ngày bắt đầu',
            path: ['effective_to'],
          })
        }
      }
    }

    // Phí đại lý (% trên doanh số) luôn phải >= Tỷ lệ doanh thu (%).
    // Chỉ so sánh khi cả hai cùng nhập ở dạng % (bỏ qua khi nhập số tiền hoặc bỏ trống).
    if (
      data.pct_agency_fee != null &&
      data.pct_revenue != null &&
      data.pct_revenue > data.pct_agency_fee
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tỷ lệ doanh thu không được lớn hơn Phí đại lý',
        path: ['pct_revenue'],
      })
    }
  })

export type TbcCommissionFormValues = z.infer<typeof tbcCommissionSchema>

export type TbcCommissionFormRef = {
  getValues: () => TbcCommissionFormValues
  handleSubmit: (
    onSubmit: (data: TbcCommissionFormValues) => void | Promise<void>
  ) => () => Promise<void>
  setError: (name: keyof TbcCommissionFormValues, error: { type?: string; message: string }) => void
}

type Props = {
  initialValues?: Partial<TbcCommissionFormValues>
  onSubmit: (data: TbcCommissionFormValues) => void
  isSubmitting?: boolean
  isReadOnly?: boolean
}

export const SaleAllocationTbcCommissionForm = forwardRef<TbcCommissionFormRef, Props>(
  ({ initialValues, onSubmit, isReadOnly = false }, ref) => {
    const form = useForm<TbcCommissionFormValues>({
      resolver: zodResolver(tbcCommissionSchema) as any,
      defaultValues: {
        is_agency_fee_include_vat: true,
        is_investor_bonus_include_vat: true,
        is_shared_bonus_include_vat: true,
        is_sale_commission_include_vat: true,
        is_investor_bonus_to_sale_include_vat: true,
        attachment_ids: [],
        attachment_tokens: [],
        attachments: [],
        ...initialValues,
      },
    })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      handleSubmit: (onSubmitFn: (data: TbcCommissionFormValues) => void | Promise<void>) =>
        form.handleSubmit(onSubmitFn as any, (errors) => {
          console.log('FORM ERRORS:', errors)
          scrollToFirstError(errors)
        }),
      setError: form.setError,
    }))

    const handleSubmit = async (values: TbcCommissionFormValues) => {
      await onSubmit(values)
    }

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
        <form onSubmit={form.handleSubmit(handleSubmit, scrollToFirstError)} className="space-y-6">
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
                  disabled: isReadOnly,
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
                  disabled: isReadOnly,
                  disabledDays: disabledDaysForToDate,
                  clearable: true,
                }}
              />
            </div>
          </div>

          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Cấu hình Phí và Thưởng
              </h3>
            </div>

            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              {/* Phí đại lý & Phí đại lý tăng thêm */}
              <FormMoneyPercentField
                pctName="pct_agency_fee"
                amtName="amt_agency_fee"
                form={form}
                label="Phí đại lý"
                disabled={isReadOnly}
              />
              <FormMoneyPercentField
                pctName="pct_investor_bonus"
                amtName="amt_investor_bonus"
                form={form}
                label="Phí đại lý tăng thêm"
                disabled={isReadOnly}
              />
              <CategoryVatField catKey="agency_fee" form={form} isReadOnly={isReadOnly} />
              <CategoryVatField catKey="investor_bonus" form={form} isReadOnly={isReadOnly} />

              {/* Thưởng đại lý (XOR % / số tiền) */}
              <FormMoneyPercentField
                pctName="pct_shared_bonus"
                amtName="amt_shared_bonus"
                form={form}
                label="Thưởng đại lý"
                disabled={isReadOnly}
              />
              <div aria-hidden="true" />
              <CategoryVatField catKey="shared_bonus" form={form} isReadOnly={isReadOnly} />
              <div aria-hidden="true" />

              {/* Hoa hồng Sale & Chủ đầu tư thưởng Sale */}
              <FormMoneyPercentField
                pctName="pct_sale_commission"
                amtName="amt_sale_commission"
                form={form}
                label={
                  <FieldLabelWithNote
                    label="HH nhân viên bán hàng"
                    note={
                      <span aria-hidden className="invisible">
                        spacer
                      </span>
                    }
                  />
                }
                disabled={isReadOnly}
              />
              <FormMoneyPercentField
                pctName="pct_investor_bonus_to_sale"
                amtName="amt_investor_bonus_to_sale"
                form={form}
                label={
                  <FieldLabelWithNote
                    label="Thưởng cho sale"
                    note="Theo quy định của CĐT hoặc của MV tự thưởng"
                  />
                }
                disabled={isReadOnly}
              />

              <FormMoneyPercentField
                pctName="amt_staff_incentive"
                amtName="amt_staff_incentive"
                amtOnly
                form={form}
                label={
                  <FieldLabelWithNote
                    label="Thưởng MV"
                    note="Mức nền của dự án cho mỗi giao dịch; thường để trống và đặt bằng LAD"
                  />
                }
                disabled={isReadOnly}
              />

              {/* Doanh thu */}
              <FormMoneyPercentField
                pctName="pct_revenue"
                amtName="amt_revenue"
                form={form}
                label="Tỷ lệ doanh thu"
                disabled={isReadOnly}
              />

              {/* Doanh thu KPI Sàn liên kết (dự án tổng đại lý) */}
              <FormMoneyPercentField
                pctName="pct_kpi_revenue_slk"
                amtName="amt_kpi_revenue_slk"
                form={form}
                label={
                  <FieldLabelWithNote
                    label="Doanh thu KPI Sàn liên kết"
                    note="Chỉ dùng cho dự án MV làm tổng đại lý. Bỏ trống = tính theo phí đại lý CĐT."
                  />
                }
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div className="bg-surface-primary-default mb-6">
            <FormController
              register={form.register}
              control={form.control}
              name="note"
              Field={TextArea}
              fieldProps={{
                placeholder: 'Nhập ghi chú...',
                rows: 3,
                label: 'Ghi chú',
                disabled: isReadOnly,
              }}
            />
          </div>

          {/* Tài liệu đính kèm */}
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">Tài liệu đính kèm</h3>
            </div>
            <FormController
              register={form.register}
              control={form.control}
              name="attachment_tokens"
              Field={FileUpload as any}
              fieldProps={{
                multiple: true,
                required: false,
                purpose: 'project_sale_allocation',
                hiddenLabel: true,
                existingFiles: form.watch('attachments') || [],
                onKeptExistingIdsChange: (ids: number[]) => form.setValue('attachment_ids', ids),
                disabled: isReadOnly,
              }}
            />
          </div>
        </form>
      </FormProvider>
    )
  }
)

SaleAllocationTbcCommissionForm.displayName = 'SaleAllocationTbcCommissionForm'
function CategoryVatField({
  catKey,
  form,
  isReadOnly,
}: {
  catKey: string
  form: any
  isReadOnly?: boolean
}) {
  return (
    <div className="flex-1">
      <Controller
        control={form.control}
        name={`is_${catKey}_include_vat`}
        render={({ field }) => (
          <ReconVatToggle
            checked={!!field.value}
            onChange={field.onChange}
            disabled={isReadOnly}
            labelAfter
          />
        )}
      />
    </div>
  )
}
