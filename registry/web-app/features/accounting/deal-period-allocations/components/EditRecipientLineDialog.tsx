import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog'
import FormController from '@/components/ui/form/FormController'
import { TextArea, Select } from '@/components/ui'
import { HOLD_REASON_OPTIONS } from '@/constants/commission'
import {
  usePartialUpdateRecipientAllocationLine,
  type RecipientAllocationLine,
} from '@/features/accounting/recipient-allocation-lines/services/recipient-allocation-line-service'
import toastService from '@/services/toast-service'

const buildSchema = (suggestedAmount: number) => {
  return z
    .object({
      // KHÔNG kẹp ở 0: một dòng ĐÒI LẠI mang số âm (BE thu hồi phần chi dư, 2026-08-06).
      // `min(0)` làm resolver fail vĩnh viễn trên dòng đó, tức không sửa nổi cả `hold_reason`
      // lẫn `override_reason` — hai field duy nhất còn ghi được ở dialog này.
      allocated_amount: z.number(),
      is_held: z.boolean().default(false),
      hold_amount: z.number().min(0, 'Số tiền không hợp lệ').default(0),
      hold_reason_type: z.string().default('CARRYOVER'),
      hold_reason_detail: z.string().default(''),
      override_reason: z.string().default(''),
    })
    .superRefine((data, ctx) => {
      if (data.is_held) {
        // `hold_amount` không còn sửa được ở màn này (BE khoá ghi) nên KHÔNG chặn theo
        // số tiền giữ — nếu chặn, dòng có is_held=true mà hold_amount=0 sẽ không bao giờ
        // lưu được lý do. Giữ lại rule cũ phòng khi BE mở lại field:
        // if (data.hold_amount <= 0) ctx.addIssue({ ..., path: ['hold_amount'] })
        if (
          data.hold_reason_type === 'OTHER' &&
          (!data.hold_reason_detail || !data.hold_reason_detail.trim())
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng nhập chi tiết lý do khác',
            path: ['hold_reason_detail'],
          })
        }
      }
      // So theo ĐỘ LỚN: với dòng đòi lại, -100 > -500 nghĩa là đòi ÍT hơn đề xuất, không phải
      // chi vượt — hỏi "lý do chi khác đề xuất" ở đó là sai ngữ nghĩa.
      if (Math.abs(data.allocated_amount) > Math.abs(suggestedAmount)) {
        if (!data.override_reason || data.override_reason.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng nhập lý do chi khác đề xuất (vì số tiền phân bổ lớn hơn đề xuất)',
            path: ['override_reason'],
          })
        }
      }
    })
}

type Props = {
  isOpen: boolean
  onClose: () => void
  recipientLine: RecipientAllocationLine | null
  recipientName: string
  onSuccess?: () => void
}

const parseInitialHoldReason = (reason: string | null | undefined) => {
  if (!reason) {
    return { type: 'CARRYOVER', detail: '' }
  }
  const matched = HOLD_REASON_OPTIONS.find((opt) => opt.value === reason)
  if (matched && reason !== 'OTHER') {
    return { type: reason, detail: '' }
  }
  return { type: 'OTHER', detail: reason }
}

export const EditRecipientLineDialog = ({
  isOpen,
  onClose,
  recipientLine,
  recipientName,
  onSuccess,
}: Props) => {
  const suggestedAmount = Number(recipientLine?.suggested_amount || 0)

  const schema = buildSchema(suggestedAmount)

  const initialReasonInfo = parseInitialHoldReason(recipientLine?.hold_reason)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      allocated_amount: Number(recipientLine?.allocated_amount || 0),
      is_held: recipientLine?.is_held || false,
      hold_amount: Number(recipientLine?.hold_amount || 0),
      hold_reason_type: initialReasonInfo.type,
      hold_reason_detail: initialReasonInfo.detail,
      override_reason: recipientLine?.override_reason || '',
    },
  })

  const isHeld = form.watch('is_held')
  const allocatedAmount = form.watch('allocated_amount')
  const holdReasonType = form.watch('hold_reason_type')

  useEffect(() => {
    if (isOpen && recipientLine) {
      const reasonInfo = parseInitialHoldReason(recipientLine.hold_reason)
      form.reset({
        allocated_amount: Number(recipientLine.allocated_amount || 0),
        is_held: recipientLine.is_held || false,
        hold_amount: Number(recipientLine.hold_amount || 0),
        hold_reason_type: reasonInfo.type,
        hold_reason_detail: reasonInfo.detail,
        override_reason: recipientLine.override_reason || '',
      })
    }
  }, [isOpen, recipientLine, form])

  const { mutateAsync: updateLine, isPending } = usePartialUpdateRecipientAllocationLine()

  const onSubmit = async (data: z.infer<ReturnType<typeof buildSchema>>) => {
    if (!recipientLine) return
    const finalReason =
      data.hold_reason_type === 'OTHER' ? data.hold_reason_detail : data.hold_reason_type
    try {
      await updateLine({
        id: recipientLine.id,
        data: {
          // BE 2026-07-28 (`fix/split-allocated-invariant`): `allocated_amount` /
          // `is_held` / `hold_amount` / `recipient_*` là READ-ONLY trên viewset RAL
          // generic — tiền chỉ đổi qua flow có guard (dial `set-period-progress`,
          // `split_by_recipient`, `hold-share`), PATCH thẳng vào đây bị từ chối.
          // Giữ lại code cũ phòng khi BE mở lại field (docs/ai/domain/accounting-vouchers-commissions.md).
          // allocated_amount: String(data.allocated_amount),
          // is_held: data.is_held,
          // hold_amount: String(data.hold_amount),
          hold_reason: finalReason || '',
          override_reason: data.override_reason || '',
        },
      })
      toastService.success('Cập nhật phân bổ thành công')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi cập nhật phân bổ')
    }
  }

  const handleConfirm = () => {
    form.handleSubmit(onSubmit)()
  }

  return (
    <AppDialog
      variant="custom"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Cập nhật phân bổ - ${recipientName}`}
      content={
        <FormProvider {...form}>
          <form
            id="edit-recipient-line-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="min-w-[450px] space-y-4"
          >
            {/* BE khoá ghi `allocated_amount` (READ-ONLY trên viewset RAL generic từ
                2026-07-28) — số tiền phân bổ chỉ đổi qua dial `set-period-progress` /
                `split_by_recipient`. Giữ lại ô nhập phòng khi BE mở lại field.
            <FormController
              control={form.control}
              register={form.register}
              name="allocated_amount"
              Field={CurrencyInput}
              fieldProps={{
                label: 'Số tiền phân bổ',
                placeholder: 'Nhập số tiền...',
                required: true,
                min: 0,
                suffix: 'đ',
              }}
            /> */}

            {allocatedAmount > suggestedAmount && (
              <FormController
                control={form.control}
                register={form.register}
                name="override_reason"
                Field={TextArea}
                fieldProps={{
                  label: 'Lý do chi khác đề xuất (Bắt buộc)',
                  placeholder: 'Nhập lý do override...',
                  required: true,
                  rows: 2,
                }}
              />
            )}

            {/* `is_held` + `hold_amount` cũng READ-ONLY (cùng đợt BE 2026-07-28) — bật/tắt
                tạm giữ và số tiền giữ đi qua `hold-share`. Chỉ còn sửa được LÝ DO giữ.
            <div className="flex items-center space-x-2 py-2">
              <Controller
                control={form.control}
                name="is_held"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="is_held_checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}
              />
              <label
                htmlFor="is_held_checkbox"
                className="text-content-dark-2 cursor-pointer text-sm font-semibold select-none"
              >
                Tạm giữ hoa hồng
              </label>
            </div> */}

            {isHeld && (
              <>
                {/* <FormController
                  control={form.control}
                  register={form.register}
                  name="hold_amount"
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Số tiền tạm giữ',
                    placeholder: 'Nhập số tiền...',
                    required: true,
                    min: 0,
                    suffix: 'đ',
                  }}
                /> */}
                <FormController
                  control={form.control}
                  register={form.register}
                  name="hold_reason_type"
                  Field={Select}
                  fieldProps={{
                    label: 'Lý do tạm giữ',
                    options: HOLD_REASON_OPTIONS,
                    required: true,
                  }}
                />
                {holdReasonType === 'OTHER' && (
                  <FormController
                    control={form.control}
                    register={form.register}
                    name="hold_reason_detail"
                    Field={TextArea}
                    fieldProps={{
                      label: 'Chi tiết lý do khác (Bắt buộc)',
                      placeholder: 'Nhập chi tiết lý do...',
                      required: true,
                      rows: 2,
                    }}
                  />
                )}
              </>
            )}
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
