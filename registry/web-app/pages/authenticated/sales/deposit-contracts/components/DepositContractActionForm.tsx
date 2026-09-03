import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import { Button, TextArea, CurrencyInput, TextField, Select } from '@/components/ui'
import { Text } from '@radix-ui/themes'
import { formatCurrencyVND } from '@/utils'
import { RETAINED_REASON_OPTIONS } from '@/features/project/refund-booking/types/refund-payment-types'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import useBankOptions from '@/hooks/useBankOptions'
import {
  BANK_ACCOUNT_NUMBER_FORMAT_MESSAGE,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_MESSAGE,
  BANK_ACCOUNT_NUMBER_PATTERN,
} from '@/utils/bank-account-number'

/** Khớp `DepositContract.refund_payee_account_name` — `CharField(max_length=250)` bên BE. */
const PAYEE_ACCOUNT_NAME_MAX_LENGTH = 250

const RefundAmountInput = ({
  defaultValue,
  onChange,
  error,
  disabled,
}: {
  defaultValue?: number
  onChange: (val: number | undefined) => void
  error?: string
  disabled?: boolean
}) => {
  const [val, setVal] = useState<number | undefined>(defaultValue)
  return (
    <CurrencyInput
      label="Số tiền hoàn"
      placeholder="Nhập số tiền hoàn..."
      value={val}
      onChange={(newVal: number | undefined) => {
        setVal(newVal)
        onChange(newVal)
      }}
      error={error}
      disabled={disabled}
      required
    />
  )
}

/**
 * Ô "Ngân hàng" của khối tài khoản khách nhận tiền hoàn.
 *
 * Trước 24/08/2026 đây là `TextField` nhập tay (ClickUp 86eyqjbtb): mỗi người gõ một kiểu
 * ("VCB" / "Vietcombank" / "NH Ngoại thương") nên giá trị lưu xuống không đối chiếu được với
 * danh mục ngân hàng, còn uỷ nhiệm chi xuất ra thì mang tên ngân hàng không chuẩn. Nay chọn
 * từ danh mục qua hook dùng chung — giống luồng hoàn tiền đặt chỗ (`RefundBookingForm`) và
 * ô "Ngân hàng chuyển tiền" của chính form tạo hợp đồng cọc.
 *
 * Giá trị lưu xuống vẫn là chuỗi `bank.name`, khớp `refund_payee_bank_name` (`CharField` bên
 * BE) — dropdown chỉ ràng buộc đầu vào, không đổi kiểu dữ liệu.
 *
 * Hook được gọi trong chính component này thay vì ở form cha để danh mục ngân hàng chỉ tải khi
 * hộp thoại Hoàn tiền mở: các hộp thoại Duyệt / Từ chối / Huỷ dùng chung form này nhưng không
 * có khối tài khoản nhận. Không truyền `currentValue` vì form luôn mở ở trạng thái trống —
 * không có giá trị cũ nhập tay nào cần giữ lại.
 */
const RefundPayeeBankSelect = ({
  name,
  value,
  onChange,
  error,
  disabled,
}: {
  /**
   * Do `FormController` trải `{...field}` xuống. Phải chuyển tiếp: `Select` đặt `id={name}` lên
   * trigger và render `<label htmlFor={name}>`, nên nuốt mất `name` là nhãn "Ngân hàng" hết trỏ
   * vào đâu. Các call site `Select` khác không lộ ra chuyện này vì chúng trải thẳng `field` vào
   * `Select`; ở đây có một lớp component chen giữa.
   */
  name?: string
  value?: string
  onChange: (val: string) => void
  error?: string
  disabled?: boolean
}) => {
  const { bankOptions, isLoadingBanks } = useBankOptions()
  return (
    <Select
      name={name}
      label="Ngân hàng"
      required
      options={bankOptions}
      isLoading={isLoadingBanks}
      value={value || null}
      onChange={(next) => onChange(typeof next === 'string' ? next : '')}
      error={error}
      disabled={disabled}
      enableSearch
      searchPlaceholder="Tìm ngân hàng"
      placeholder="Chọn ngân hàng"
    />
  )
}

export type DepositContractActionFormValues = {
  note: string
  refundedAmount?: number
  // Hoàn cọc từ 12/08/2026: endpoint quyết định tiền quay về đâu nên phải hỏi,
  // và phải nêu lý do khi giữ lại một phần.
  refundPayeeAccountName?: string
  refundPayeeAccountNumber?: string
  refundPayeeBankName?: string
  retainedReason?: string
  retainedNote?: string
}

type DepositContractActionFormProps = {
  requireNote?: boolean
  showRefundAmount?: boolean
  /** Tổng tiền cọc, để tính phần giữ lại ngay khi người dùng gõ số hoàn. */
  totalDepositAmount?: number
  maxRefundAmount?: number
  confirmText?: string
  cancelText?: string
  onSubmit: (data: DepositContractActionFormValues) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export const DepositContractActionForm = ({
  requireNote,
  showRefundAmount,
  totalDepositAmount,
  maxRefundAmount,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onSubmit,
  onCancel,
  loading,
}: DepositContractActionFormProps) => {
  const schema = z
    .object({
      note: requireNote
        ? z.string().trim().min(1, 'Vui lòng nhập lý do/ghi chú')
        : z.string().trim(),
      refundedAmount: showRefundAmount
        ? z
            .number({ required_error: 'Vui lòng nhập số tiền hoàn' })
            .min(1, 'Số tiền hoàn phải lớn hơn 0')
            .max(
              maxRefundAmount || Infinity,
              'Số tiền hoàn không được vượt quá số tiền cọc hiện có'
            )
        : z.number().optional(),
      refundPayeeAccountName: showRefundAmount
        ? z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập chủ tài khoản nhận')
            .max(
              PAYEE_ACCOUNT_NAME_MAX_LENGTH,
              `Chủ tài khoản không vượt quá ${PAYEE_ACCOUNT_NAME_MAX_LENGTH} ký tự`
            )
        : z.string().trim().optional(),
      // Ba luật chạy theo thứ tự này là cố ý: bỏ trống phải nghe "chưa nhập" chứ không phải
      // "sai khuôn dạng". `.trim()` đứng trước nên dấu cách hai đầu không tự biến ô thành sai.
      refundPayeeAccountNumber: showRefundAmount
        ? z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập số tài khoản nhận')
            .max(BANK_ACCOUNT_NUMBER_MAX_LENGTH, BANK_ACCOUNT_NUMBER_MAX_MESSAGE)
            .regex(BANK_ACCOUNT_NUMBER_PATTERN, BANK_ACCOUNT_NUMBER_FORMAT_MESSAGE)
        : z.string().trim().optional(),
      refundPayeeBankName: showRefundAmount
        ? z.string().trim().min(1, 'Vui lòng chọn ngân hàng nhận')
        : z.string().trim().optional(),
      retainedReason: z.string().trim().optional(),
      retainedNote: z.string().trim().optional(),
    })
    // Giữ lại > 0 thì phải nêu lý do. Tính tại chỗ theo số vừa gõ, thay vì đợi
    // BE trả 400 — người dùng cần thấy ô lý do bật lên ngay khi hoàn thiếu.
    .refine(
      (values) =>
        !showRefundAmount ||
        !totalDepositAmount ||
        (values.refundedAmount ?? 0) >= totalDepositAmount ||
        Boolean(values.retainedReason),
      { path: ['retainedReason'], message: 'Hoàn thiếu thì phải nêu lý do giữ lại' }
    )

  const form = useForm<DepositContractActionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      note: '',
      refundedAmount: undefined,
      refundPayeeAccountName: '',
      refundPayeeAccountNumber: '',
      refundPayeeBankName: '',
      retainedReason: '',
      retainedNote: '',
    },
  })

  // API hủy/hoàn cọc chạy rất lâu (đo được ~30s trên dev). Trước đây form không tự khóa trong
  // lúc chờ nên nút vẫn bấm được và không có spinner — người dùng tưởng hộp thoại bị treo rồi
  // bấm "Hủy bỏ" nhiều lần (ClickUp 86eyfapdx). Cờ khóa phải do form tự giữ: `content` của dialog
  // là ReactNode tĩnh nằm trong dialog store nên prop `loading` truyền sau đó không tới được.
  const { submit: handleFormSubmit, isSubmitting } = useSubmitOnce(
    async (data: DepositContractActionFormValues) => {
      try {
        await onSubmit(data)
      } catch (err) {
        // Caller đã toast lỗi rồi. Bắt ở đây để lỗi không rơi thành unhandled rejection —
        // `Form` gọi onSubmit mà không await.
        console.error(err)
      }
    }
  )

  // `useSubmitOnce` chốt cửa bằng ref (chặn đồng bộ), còn `formState.isSubmitting` của RHF bật
  // ngay đầu `handleSubmit` nên phủ luôn khoảng thời gian resolver zod đang chạy. Hai cờ bù nhau.
  const isBusy = loading || isSubmitting || form.formState.isSubmitting
  const watchedRefund = form.watch('refundedAmount')
  const retainedAmount = Math.max((totalDepositAmount ?? 0) - (watchedRefund ?? 0), 0)

  return (
    <Form loading={isBusy} onSubmit={handleFormSubmit} handleSubmit={form.handleSubmit as any}>
      <Flex direction="column" gap="4" className="p-4">
        {requireNote && (
          <FormController
            register={form.register}
            name="note"
            control={form.control}
            Field={TextArea as any}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập lý do/ghi chú...',
              rows: 4,
              disabled: isBusy,
            }}
          />
        )}
        {!requireNote && (
          <FormController
            register={form.register}
            name="note"
            control={form.control}
            Field={TextArea as any}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập lý do/ghi chú (không bắt buộc)...',
              rows: 4,
              disabled: isBusy,
            }}
          />
        )}

        {showRefundAmount && (
          <>
            <FormController
              register={form.register}
              name="refundedAmount"
              control={form.control}
              Field={RefundAmountInput as any}
              fieldProps={{
                disabled: isBusy,
              }}
            />

            <Text size="2" weight="medium">
              Tài khoản khách nhận tiền hoàn
            </Text>
            <FormController
              register={form.register}
              name="refundPayeeBankName"
              control={form.control}
              Field={RefundPayeeBankSelect as any}
              fieldProps={{ disabled: isBusy }}
            />
            <FormController
              register={form.register}
              name="refundPayeeAccountNumber"
              control={form.control}
              Field={TextField as any}
              fieldProps={{ label: 'Số tài khoản', required: true, disabled: isBusy }}
            />
            <FormController
              register={form.register}
              name="refundPayeeAccountName"
              control={form.control}
              Field={TextField as any}
              fieldProps={{ label: 'Chủ tài khoản', required: true, disabled: isBusy }}
            />

            {retainedAmount > 0 && (
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
          </>
        )}
      </Flex>

      <Flex gap="3" justify="end" className="mt-4 border-t border-gray-200 p-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>
          {cancelText}
        </Button>
        <Button type="submit" variant="primary" disabled={isBusy} loading={isBusy}>
          {confirmText}
        </Button>
      </Flex>
    </Form>
  )
}
