import { forwardRef, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextArea, FileUpload } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { scrollToFirstError } from '@/utils/form-utils'
import { isBefore, isEqual, parse } from 'date-fns'
import { TBCManagementRateCategory, TBCManagementRateRole } from '@/api/schema'
import { TBCManagementRateTable } from './TBCManagementRateTable'
import { seedRates } from './tbc-management-helpers'

const dateStringSchema = z.string().nullable().optional()

const numericField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}, z.number().nullable().optional())

// Categories that accept only `pct` (amt must be null)
export const PCT_ONLY_CATEGORIES: TBCManagementRateCategory[] = [
  TBCManagementRateCategory.agency_fee,
  TBCManagementRateCategory.project_bonus,
]

// Categories that accept either `pct` or `amt` (XOR)
export const PCT_OR_AMT_CATEGORIES: TBCManagementRateCategory[] = [
  TBCManagementRateCategory.investor_bonus,
  TBCManagementRateCategory.mv_bonus,
]

export const MANAGEMENT_ROLES: { value: TBCManagementRateRole; label: string }[] = [
  { value: TBCManagementRateRole.ceo, label: 'Tổng Giám đốc' },
  { value: TBCManagementRateRole.deputy_ceo, label: 'Phó Tổng Giám đốc' },
  { value: TBCManagementRateRole.project_director, label: 'Giám đốc Dự án' },
  { value: TBCManagementRateRole.sales_director, label: 'Giám đốc Kinh doanh' },
  { value: TBCManagementRateRole.sales_manager, label: 'Trưởng phòng Kinh doanh' },
  { value: TBCManagementRateRole.head_sales_secretary, label: 'Trưởng phòng Thư ký Kinh doanh' },
  { value: TBCManagementRateRole.project_secretary, label: 'Thư ký Dự án' },
]

export const tbcManagementRateSchema = z
  .object({
    role: z.nativeEnum(TBCManagementRateRole),
    category: z.nativeEnum(TBCManagementRateCategory),
    pct: numericField,
    amt: numericField,
    pct_role_total: numericField,
  })
  .superRefine((data, ctx) => {
    if (PCT_ONLY_CATEGORIES.includes(data.category) && data.amt !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mục này chỉ cho phép nhập tỉ lệ %',
        path: ['amt'],
      })
    }
    if (PCT_OR_AMT_CATEGORIES.includes(data.category) && data.pct !== null && data.amt !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chỉ chọn 1 trong 2: % hoặc số tiền',
        path: ['pct'],
      })
    }
    if (data.pct_role_total != null) {
      // Scoped by ROLE only. The category clause is deliberately gone: the secretary
      // rate now also sits on the bonus categories, and each carve is computed on the
      // base of its own category (backend constraint tbc_mgmt_rate_role_total_scope).
      if (data.role !== TBCManagementRateRole.project_secretary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tổng vị trí chỉ áp dụng cho Thư ký Dự án',
          path: ['pct_role_total'],
        })
      } else if (data.pct == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cần nhập tỉ lệ cá nhân trước khi nhập tổng vị trí',
          path: ['pct_role_total'],
        })
      } else if (data.pct_role_total < data.pct) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tổng vị trí phải lớn hơn hoặc bằng tỉ lệ cá nhân',
          path: ['pct_role_total'],
        })
      }
    }
  })

export type TbcManagementRateValues = z.infer<typeof tbcManagementRateSchema>

export const tbcManagementSchema = z
  .object({
    id: z.number().optional(),
    effective_from: dateStringSchema,
    effective_to: dateStringSchema,
    note: z.string().nullable().optional(),
    rates: z.array(tbcManagementRateSchema).default([]),

    attachment_ids: z.array(z.number()).optional(),
    attachment_tokens: z.array(z.string()).optional(),
    attachments: z.array(z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.effective_from && data.effective_to) {
      const fromDate = parse(data.effective_from, 'dd/MM/yyyy', new Date())
      const toDate = parse(data.effective_to, 'dd/MM/yyyy', new Date())
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        if (isBefore(toDate, fromDate) || isEqual(toDate, fromDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ngày kết thúc phải sau ngày bắt đầu',
            path: ['effective_to'],
          })
        }
      }
    }
  })

// numericField is exported for use in the upcoming TBCManagementRateTable.
export { numericField }

export type TbcManagementFormValues = z.infer<typeof tbcManagementSchema>

export type TbcManagementFormRef = {
  getValues: () => TbcManagementFormValues
  handleSubmit: (
    onSubmit: (data: TbcManagementFormValues) => void | Promise<void>
  ) => () => Promise<void>
  setError: (name: keyof TbcManagementFormValues, error: { type?: string; message: string }) => void
}

type Props = {
  initialValues?: Partial<TbcManagementFormValues>
  onSubmit: (data: TbcManagementFormValues) => void
  isSubmitting?: boolean
  isReadOnly?: boolean
}

export const SaleAllocationTbcManagementForm = forwardRef<TbcManagementFormRef, Props>(
  ({ initialValues, onSubmit, isReadOnly = false }, ref) => {
    const form = useForm<TbcManagementFormValues>({
      resolver: zodResolver(tbcManagementSchema) as any,
      defaultValues: {
        ...initialValues,
        rates: seedRates(initialValues?.rates as any),
        attachment_ids: [],
        attachment_tokens: [],
        attachments: [],
      },
    })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      handleSubmit: (onSubmitFn: (data: TbcManagementFormValues) => void | Promise<void>) =>
        form.handleSubmit(onSubmitFn as any, (errors) => {
          console.log('FORM ERRORS:', errors)
          scrollToFirstError(errors)
        }),
      setError: form.setError,
    }))

    const handleSubmit = async (values: TbcManagementFormValues) => {
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
                Cấu hình Thưởng HH quản lý cơ bản
              </h3>
            </div>
            <TBCManagementRateTable isReadOnly={isReadOnly} />
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

SaleAllocationTbcManagementForm.displayName = 'SaleAllocationTbcManagementForm'
