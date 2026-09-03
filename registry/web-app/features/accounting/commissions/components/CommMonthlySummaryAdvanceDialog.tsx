import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog'
import FormController from '@/components/ui/form/FormController'
import { CurrencyInput, TextArea } from '@/components/ui'
import { useRequestAdvanceMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryRole } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

/**
 * Wording for anything that OPENS this dialog, so a trigger can never describe it as something
 * else. Bug 86eynz1a2: the manager list called it "Trừ hoàn ứng" and the CTV detail called it
 * "Sửa", while confirming here POSTs `request-advance` — it creates a new advance request and
 * sends it up the approval ladder. Neither deducts nor edits anything.
 */
export const ADVANCE_REQUEST_ACTION_LABEL = 'Đề xuất tạm ứng hoa hồng'

/** Same action, for triggers too narrow for the full label (inline buttons on a breakdown row). */
export const ADVANCE_REQUEST_ACTION_LABEL_SHORT = 'Đề xuất tạm ứng'

const schema = z.object({
  amount: z
    .number({
      invalid_type_error: 'Vui lòng nhập số tiền',
      required_error: 'Vui lòng nhập số tiền',
    })
    .min(1, 'Số tiền phải lớn hơn 0'),
  reason: z.string().min(1, 'Vui lòng nhập lý do'),
})

type FormData = z.infer<typeof schema>

type Props = {
  isOpen: boolean
  onClose: () => void
  summaryId: number
  role: MonthlySummaryRole
  onSuccess?: () => void
}

export const CommMonthlySummaryAdvanceDialog = ({
  isOpen,
  onClose,
  summaryId,
  role,
  onSuccess,
}: Props) => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      reason: '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: undefined,
        reason: '',
      })
    }
  }, [isOpen, form])

  const { mutateAsync: requestAdvance, isPending } = useRequestAdvanceMonthlySummary()

  const onSubmit = async (data: FormData) => {
    try {
      await requestAdvance({
        role,
        id: summaryId,
        data: {
          amount: String(data.amount),
          reason: data.reason,
        },
      })
      toastService.success('Đã gửi đề xuất tạm ứng hoa hồng thành công')
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
      title={ADVANCE_REQUEST_ACTION_LABEL}
      content={
        <FormProvider {...form}>
          <form
            id="request-advance-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormController
              control={form.control}
              register={form.register}
              name="amount"
              Field={CurrencyInput}
              fieldProps={{
                label: 'Số tiền tạm ứng',
                placeholder: 'Nhập số tiền...',
                required: true,
                min: 0,
                suffix: 'đ',
              }}
            />
            <FormController
              control={form.control}
              register={form.register}
              name="reason"
              Field={TextArea}
              fieldProps={{
                label: 'Lý do / Diễn giải',
                placeholder: 'Nhập lý do tạm ứng...',
                required: true,
                rows: 3,
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
