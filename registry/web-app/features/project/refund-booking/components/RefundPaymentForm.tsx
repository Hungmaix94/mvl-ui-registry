import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Text } from '@radix-ui/themes'
import { Button, CurrencyInput, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { formatCurrencyVND } from '@/utils'
import { formatDateToApi } from '@/utils/date-utils'
import { RETAINED_REASON_OPTIONS } from '../types/refund-payment-types'

/**
 * Bước "xác nhận đã chi" — một form cho CẢ hoàn đặt chỗ lẫn hoàn cọc.
 *
 * BE cố tình cho hai endpoint dùng chung một shape payload, nên FE cũng chỉ nên
 * có một form: hai bản sao sẽ lệch nhau ngay ở lần sửa quy tắc đầu tiên.
 *
 * Kế hoạch: backend/docs/plans/plan_sales_refund_cashflow_20260812.md §13b.3
 */

export type RefundPaymentFormValues = {
  paidAmount: number
  paidAt: string
  mvBankName: string
  mvAccountNumber: string
  mvAccountName: string
  bankRef: string
  retainedReason: string
  retainedNote: string
  note: string
}

type Props = {
  /** Số đã duyệt. Khoá cứng: BE bắt buộc chi đúng số này (BR-14). */
  approvedAmount: number
  /** Phần giữ lại, BE đã tính sẵn. > 0 thì bắt buộc chọn lý do. */
  retainedAmount?: number
  onSubmit: (values: RefundPaymentFormValues) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

// date-utils là nơi duy nhất được phép chạm date-fns (AGENTS.md § Date & Time).
const today = () => formatDateToApi(new Date())

export const RefundPaymentForm = ({
  approvedAmount,
  retainedAmount = 0,
  onSubmit,
  onCancel,
  loading,
}: Props) => {
  const needsRetainedReason = retainedAmount > 0

  const schema = useMemo(
    () =>
      z
        .object({
          paidAmount: z
            .number({ required_error: 'Vui lòng nhập số tiền đã chi' })
            // Chặn ngay ở client thay vì để BE trả 400: người dùng cần biết vì sao
            // ngay tại ô nhập, và biết luôn đường đi tiếp.
            .refine((value) => value === approvedAmount, {
              message: 'Phải chi đúng số đã duyệt. Muốn chi ít hơn, hãy từ chối phiếu, sửa số tiền hoàn rồi duyệt lại.',
            }),
          paidAt: z
            .string()
            .min(1, 'Vui lòng chọn ngày chi')
            .refine((value) => value <= today(), { message: 'Ngày chi không được ở tương lai' }),
          mvBankName: z.string().trim().min(1, 'Vui lòng chọn ngân hàng'),
          mvAccountNumber: z.string().trim().min(1, 'Vui lòng nhập số tài khoản công ty'),
          mvAccountName: z.string().trim(),
          bankRef: z.string().trim(),
          retainedReason: needsRetainedReason
            ? z.string().trim().min(1, 'Vui lòng chọn lý do giữ lại')
            : z.string().trim(),
          retainedNote: z.string().trim(),
          note: z.string().trim(),
        })
        // Bằng chứng: số UNC HOẶC file đính kèm. BE kiểm lại điều này, đây chỉ là
        // để người dùng không phải submit mới biết.
        .refine((values) => values.bankRef.length > 0, {
          path: ['bankRef'],
          message: 'Phải có số UNC (hoặc đính kèm chứng từ ở màn chi tiết)',
        }),
    [approvedAmount, needsRetainedReason]
  )

  const form = useForm<RefundPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paidAmount: approvedAmount,
      paidAt: today(),
      mvBankName: '',
      mvAccountNumber: '',
      mvAccountName: '',
      bankRef: '',
      retainedReason: '',
      retainedNote: '',
      note: '',
    },
  })

  const { submit: handleFormSubmit, isSubmitting } = useSubmitOnce(
    async (values: RefundPaymentFormValues) => {
      try {
        await onSubmit(values)
      } catch (err) {
        // Caller đã toast. Bắt ở đây để không thành unhandled rejection —
        // `Form` gọi onSubmit mà không await.
        console.error(err)
      }
    }
  )

  const isBusy = loading || isSubmitting || form.formState.isSubmitting

  return (
    <Form loading={isBusy} onSubmit={handleFormSubmit} handleSubmit={form.handleSubmit as any}>
      <Flex direction="column" gap="4" className="p-4">
        <Flex justify="between" className="rounded-md bg-gray-50 px-3 py-2">
          <Text size="2" color="gray">
            Số tiền phải chi
          </Text>
          <Text size="2" weight="bold">
            {formatCurrencyVND(approvedAmount)}
          </Text>
        </Flex>

        <FormController
          register={form.register}
          name="paidAmount"
          control={form.control}
          Field={CurrencyInput as any}
          fieldProps={{ label: 'Số tiền đã chi', required: true, disabled: isBusy }}
        />

        <FormController
          register={form.register}
          name="paidAt"
          control={form.control}
          Field={DatePicker as any}
          fieldProps={{ label: 'Ngày chi', required: true, disabled: isBusy }}
        />

        <Text size="2" weight="medium" className="mt-2">
          Tài khoản công ty chi ra
        </Text>
        <FormController
          register={form.register}
          name="mvBankName"
          control={form.control}
          Field={TextField as any}
          fieldProps={{ label: 'Ngân hàng', required: true, disabled: isBusy }}
        />
        <FormController
          register={form.register}
          name="mvAccountNumber"
          control={form.control}
          Field={TextField as any}
          fieldProps={{ label: 'Số tài khoản', required: true, disabled: isBusy }}
        />
        <FormController
          register={form.register}
          name="mvAccountName"
          control={form.control}
          Field={TextField as any}
          fieldProps={{ label: 'Chủ tài khoản', disabled: isBusy }}
        />

        {needsRetainedReason && (
          <>
            <Flex justify="between" className="rounded-md bg-amber-50 px-3 py-2">
              <Text size="2" color="gray">
                Số tiền giữ lại
              </Text>
              <Text size="2" weight="bold">
                {formatCurrencyVND(retainedAmount)}
              </Text>
            </Flex>
            <FormController
              register={form.register}
              name="retainedReason"
              control={form.control}
              Field={Select as any}
              fieldProps={{
                label: 'Lý do giữ lại',
                required: true,
                options: RETAINED_REASON_OPTIONS,
                disabled: isBusy,
              }}
            />
            <FormController
              register={form.register}
              name="retainedNote"
              control={form.control}
              Field={TextArea as any}
              fieldProps={{ label: 'Diễn giải', rows: 2, disabled: isBusy }}
            />
          </>
        )}

        <Text size="2" weight="medium" className="mt-2">
          Chứng từ
        </Text>
        <FormController
          register={form.register}
          name="bankRef"
          control={form.control}
          Field={TextField as any}
          fieldProps={{ label: 'Số UNC / mã giao dịch', disabled: isBusy }}
        />

        <FormController
          register={form.register}
          name="note"
          control={form.control}
          Field={TextArea as any}
          fieldProps={{ label: 'Ghi chú', rows: 2, disabled: isBusy }}
        />

        <Flex gap="3" justify="end" className="mt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>
            Hủy
          </Button>
          <Button type="submit" loading={isBusy} disabled={isBusy}>
            Xác nhận đã chi
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RefundPaymentForm
