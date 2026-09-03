import { useEffect, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog'
import FormController from '@/components/ui/form/FormController'
import { CurrencyInput, Select, TextArea, TextField } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  useHoldMonthlySummary,
  useMonthlySummary,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryRole } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatCurrencyVND } from '@/utils'
import {
  CommissionHoldTaxBase as TaxBase,
  CommissionHoldReason as CommissionHoldReason,
} from '@/constants/api-schema-aliases'

function getRawPreTaxAmount(summary: any, role: MonthlySummaryRole): number {
  if (role === 'sales') return Number(summary.sale_total || 0)
  if (role === 'f2') return Number(summary.f2_total || 0)
  if (role === 'collaborators') return Number(summary.pre_tax_total || 0)
  // 'management' / 'employees' rơi vào nhánh dưới: từ khi HHQL gộp vào màn Quản lý, một quản lý
  // chỉ có KPI/HHQL sẽ lấy `pre_tax_total` (sale_total = 0) — đúng tổng của chính dòng đó.
  return Number(
    summary.sale_total || summary.f2_total || summary.pre_tax_total || summary.hhql_total || 0
  )
}

function calculateBaseAmount(
  summary: any,
  role: MonthlySummaryRole,
  taxBase: 'PRE_TAX' | 'POST_TAX',
  propBaseAmount?: number
): number {
  if (propBaseAmount !== undefined) return propBaseAmount
  const rawPreTax = getRawPreTaxAmount(summary, role)
  if (taxBase === TaxBase.POST_TAX) {
    const pit = Number(summary.pit_amount || 0)
    return Math.max(0, rawPreTax - pit)
  }
  return rawPreTax
}

const schema = z
  .object({
    input_type: z.enum(['AMOUNT', 'PERCENTAGE']),
    percentage: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z
        .number({
          invalid_type_error: 'Tỷ lệ phải là một số',
        })
        .optional()
    ),
    amount: z.preprocess(
      (val) => (val === '' || val === undefined ? undefined : Number(val)),
      z
        .number({
          invalid_type_error: 'Vui lòng nhập số tiền',
          required_error: 'Vui lòng nhập số tiền',
        })
        .min(1, 'Số tiền phải lớn hơn 0')
    ),
    tax_base: z.enum(['PRE_TAX', 'POST_TAX']),
    reason: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.input_type === 'PERCENTAGE') {
      if (
        data.percentage === undefined ||
        isNaN(data.percentage) ||
        data.percentage <= 0 ||
        data.percentage > 100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tỷ lệ phải lớn hơn 0% và không vượt quá 100%',
          path: ['percentage'],
        })
      }
    }
    if (data.reason === 'OTHER') {
      if (!data.note || !data.note.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng nhập ghi chú khi chọn lý do Khác',
          path: ['note'],
        })
      }
    }
  })

type Props = {
  isOpen: boolean
  onClose: () => void
  summaryId: number
  role: MonthlySummaryRole
  currentAmount?: number
  currentTaxBase?: 'PRE_TAX' | 'POST_TAX'
  currentReason?: string
  currentNote?: string
  onSuccess?: () => void
  baseAmount?: number
}

export const CommMonthlySummaryHoldDialog = ({
  isOpen,
  onClose,
  summaryId,
  role,
  currentAmount = 0,
  currentTaxBase = 'PRE_TAX',
  currentReason,
  currentNote,
  onSuccess,
  baseAmount: propBaseAmount,
}: Props) => {
  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES],
  })

  const { data: summaryDetail } = useMonthlySummary(role, summaryId, { enabled: isOpen })
  const summary = (summaryDetail || {}) as any

  const initialBaseAmount = calculateBaseAmount(summary, role, currentTaxBase, propBaseAmount)

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      input_type: 'AMOUNT',
      amount: currentAmount > 0 ? currentAmount : undefined,
      percentage:
        currentAmount > 0 && initialBaseAmount > 0
          ? Math.round((currentAmount / initialBaseAmount) * 100)
          : undefined,
      tax_base: currentTaxBase,
      reason:
        currentReason ||
        (currentTaxBase === TaxBase.PRE_TAX
          ? CommissionHoldReason.CARRYOVER
          : CommissionHoldReason.MISSING_BROKER_CERT),
      note: currentNote || '',
    },
  })

  const formTaxBase = form.watch('tax_base')

  const baseAmount = useMemo(() => {
    return calculateBaseAmount(summary, role, formTaxBase, propBaseAmount)
  }, [summary, role, formTaxBase, propBaseAmount])

  const reasonOptions = useMemo(() => {
    const original =
      keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_HOLD_HOLD_REASON_CHOICES) || []

    const allowed =
      formTaxBase === TaxBase.PRE_TAX
        ? [CommissionHoldReason.CARRYOVER, CommissionHoldReason.OTHER]
        : [CommissionHoldReason.MISSING_BROKER_CERT, CommissionHoldReason.OTHER]

    return original
      .filter((opt) => allowed.includes(opt.value))
      .map((opt) => {
        if (opt.value === CommissionHoldReason.CARRYOVER) {
          return { ...opt, label: 'Chưa nhận kỳ này' }
        }
        if (opt.value === CommissionHoldReason.OTHER) {
          return { ...opt, label: 'Khác' }
        }
        return opt
      })
  }, [keysMapOptions, formTaxBase])

  // Update reason value when tax_base changes dynamically
  useEffect(() => {
    const currentReason = form.getValues('reason')
    if (formTaxBase === TaxBase.PRE_TAX) {
      if (
        currentReason !== CommissionHoldReason.CARRYOVER &&
        currentReason !== CommissionHoldReason.OTHER
      ) {
        form.setValue('reason', CommissionHoldReason.CARRYOVER, { shouldValidate: true })
      }
    } else {
      if (
        currentReason !== CommissionHoldReason.MISSING_BROKER_CERT &&
        currentReason !== CommissionHoldReason.OTHER
      ) {
        form.setValue('reason', CommissionHoldReason.MISSING_BROKER_CERT, { shouldValidate: true })
      }
    }
  }, [formTaxBase, form])

  useEffect(() => {
    if (isOpen) {
      const initBase = calculateBaseAmount(summary, role, currentTaxBase, propBaseAmount)
      const calculatedPct =
        currentAmount > 0 && initBase > 0 ? Math.round((currentAmount / initBase) * 100) : undefined
      form.reset({
        input_type: 'AMOUNT',
        amount: currentAmount > 0 ? currentAmount : undefined,
        percentage: calculatedPct,
        tax_base: currentTaxBase,
        reason:
          currentReason ||
          (currentTaxBase === TaxBase.PRE_TAX
            ? CommissionHoldReason.CARRYOVER
            : CommissionHoldReason.MISSING_BROKER_CERT),
        note: currentNote || '',
      })
    }
  }, [
    isOpen,
    currentAmount,
    currentTaxBase,
    currentReason,
    currentNote,
    summary,
    role,
    propBaseAmount,
  ])

  const inputType = form.watch('input_type')
  const formPercentage = form.watch('percentage')
  const formAmount = form.watch('amount')
  const selectedReason = form.watch('reason')
  const isNoteRequired = selectedReason === 'OTHER'

  useEffect(() => {
    if (inputType === 'PERCENTAGE' && baseAmount > 0 && formPercentage !== undefined) {
      const calculatedAmount = Math.round((formPercentage * baseAmount) / 100)
      if (calculatedAmount !== formAmount) {
        form.setValue('amount', calculatedAmount, { shouldValidate: true })
      }
    }
  }, [formPercentage, inputType, baseAmount, form, formAmount])

  useEffect(() => {
    if (inputType === 'AMOUNT' && baseAmount > 0 && formAmount !== undefined) {
      const calculatedPct = Math.round((formAmount / baseAmount) * 100)
      if (calculatedPct !== formPercentage) {
        form.setValue('percentage', calculatedPct, { shouldValidate: true })
      }
    }
  }, [formAmount, inputType, baseAmount, form, formPercentage])

  const { mutateAsync: holdSummary, isPending } = useHoldMonthlySummary()

  const onSubmit = async (data: any) => {
    try {
      await holdSummary({
        role,
        id: summaryId,
        data: {
          amount: String(data.amount),
          tax_base: data.tax_base as any,
          hold_reason: (data.reason || 'MANUAL') as any,
          note: data.note || '',
        },
      })
      toastService.success('Đã cập nhật thông tin tạm giữ hoa hồng')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toastService.error(extractErrorMessage(error))
      throw error
    }
  }

  const handleConfirm = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      const validationError = new Error('Validation failed')
      ;(validationError as any).isValidationError = true
      throw validationError
    }
    await form.handleSubmit(onSubmit)()
  }

  return (
    <AppDialog
      variant="custom"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Cập nhật tạm giữ hoa hồng"
      content={
        <FormProvider {...form}>
          <form id="hold-summary-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormController
              control={form.control}
              register={form.register}
              name="tax_base"
              Field={Select}
              fieldProps={{
                label: 'Loại tạm giữ',
                options: [
                  { value: TaxBase.PRE_TAX, label: 'Tạm giữ trước thuế (giảm thu nhập tính thuế)' },
                  { value: TaxBase.POST_TAX, label: 'Tạm giữ sau thuế (khấu trừ vào thực nhận)' },
                ],
                placeholder: 'Chọn loại tạm giữ...',
                required: true,
              }}
            />
            <div data-field-name="input_type" className="flex flex-col gap-2">
              <div className="flex items-start gap-1.5">
                <label className="typo-body-base-semibold text-neutral-90">Phương thức nhập</label>
                <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
              </div>
              <div className="inline-flex self-start rounded-md bg-black/5 p-0.5" role="tablist">
                <button
                  role="tab"
                  type="button"
                  className={`cursor-pointer rounded-[4px] border-none px-3 py-1 text-[11px] font-medium transition-all ${
                    inputType === 'PERCENTAGE'
                      ? 'text-action-primary-red-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-content-dark-3 hover:text-content-dark-1 bg-transparent'
                  }`}
                  onClick={() => form.setValue('input_type', 'PERCENTAGE', { shouldDirty: true })}
                >
                  % tỷ lệ
                </button>
                <button
                  role="tab"
                  type="button"
                  className={`cursor-pointer rounded-[4px] border-none px-3 py-1 text-[11px] font-medium transition-all ${
                    inputType === 'AMOUNT'
                      ? 'text-action-primary-red-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-content-dark-3 hover:text-content-dark-1 bg-transparent'
                  }`}
                  onClick={() => form.setValue('input_type', 'AMOUNT', { shouldDirty: true })}
                >
                  VND cố định
                </button>
              </div>
            </div>
            {inputType === 'PERCENTAGE' ? (
              <div className="space-y-2">
                <FormController
                  control={form.control}
                  register={form.register}
                  name="percentage"
                  Field={TextField}
                  fieldProps={{
                    label: 'Giá trị mới',
                    placeholder: 'Nhập tỷ lệ từ 0 đến 100...',
                    required: true,
                    type: 'number',
                    min: 0,
                    max: 100,
                    suffix: '%',
                  }}
                />
                <div className="text-xs font-medium text-neutral-500">
                  Số tiền tính toán tương đương:{' '}
                  <span className="font-semibold text-neutral-800">
                    {formatCurrencyVND(formAmount || 0).replace(/\s*₫/, '')} đ
                  </span>
                </div>
              </div>
            ) : (
              <FormController
                control={form.control}
                register={form.register}
                name="amount"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Giá trị mới',
                  placeholder: 'Nhập số tiền...',
                  required: true,
                  min: 0,
                  suffix: 'đ',
                }}
              />
            )}
            <FormController
              control={form.control}
              register={form.register}
              name="reason"
              Field={Select}
              fieldProps={{
                label: 'Lý do giữ',
                options: reasonOptions,
                placeholder: 'Chọn lý do...',
              }}
            />
            <FormController
              control={form.control}
              register={form.register}
              name="note"
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú thêm',
                placeholder: 'Nhập diễn giải...',
                rows: 3,
                required: isNoteRequired,
              }}
            />
          </form>
        </FormProvider>
      }
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={isPending}
      isHideCancelButton={false}
    />
  )
}
