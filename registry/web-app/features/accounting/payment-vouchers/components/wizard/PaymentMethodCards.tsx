import { Control, UseFormRegister } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController'
import { Select, TextField, CurrencyInput } from '@/components/ui'
import { IconBank, IconMoney } from '@/assets/icons'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'

export function BankMethodCard({
  register,
  control,
  bankAccountOptions,
  amountLocked = false,
  hideAmount = false,
}: {
  register: UseFormRegister<PaymentVoucherWizardValues>
  control: Control<PaymentVoucherWizardValues>
  bankAccountOptions: { value: string; label: string }[]
  /** F2 settlement: the total is the collected gross, not a figure to type. */
  amountLocked?: boolean
  /** During the collect the amount is not known yet — omit the field entirely. */
  hideAmount?: boolean
}) {
  return (
    <div className="border-border-1 mt-2 rounded-lg border bg-gray-50/30 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <span className="border-border-1 flex h-6 w-6 items-center justify-center rounded border bg-white text-gray-500 shadow-sm">
          <IconBank className="h-3.5 w-3.5" />
        </span>
        Phần Chuyển khoản
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormController
          register={register}
          name="from_bank_account"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Tài khoản chi',
            required: true,
            options: bankAccountOptions,
            placeholder: 'Chọn tài khoản',
            clearable: true,
          }}
        />
        {!hideAmount && (
          <FormController
            register={register}
            name="bank_amount"
            control={control}
            Field={CurrencyInput}
            fieldProps={{
              label: 'Số tiền',
              required: true,
              placeholder: amountLocked ? undefined : 'Nhập số tiền',
              disabled: amountLocked,
              caption: amountLocked ? 'Bằng tổng hóa đơn đã thu thập' : undefined,
            }}
          />
        )}
        <FormController
          register={register}
          name="bank_ref"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mã tham chiếu ngân hàng',
            placeholder: 'Nhập mã giao dịch',
          }}
        />
      </div>
    </div>
  )
}

export function CashMethodCard({
  register,
  control,
  amountLocked = false,
  hideAmount = false,
}: {
  register: UseFormRegister<PaymentVoucherWizardValues>
  control: Control<PaymentVoucherWizardValues>
  amountLocked?: boolean
  hideAmount?: boolean
}) {
  return (
    <div className="border-border-1 mt-2 rounded-lg border bg-gray-50/30 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <span className="border-border-1 flex h-6 w-6 items-center justify-center rounded border bg-white text-gray-500 shadow-sm">
          <IconMoney className="h-3.5 w-3.5" />
        </span>
        Phần Tiền mặt
      </div>
      {hideAmount ? (
        <p className="text-content-dark-3 text-[13px]">
          Số tiền tự tính từ các hóa đơn được chọn ở trên.
        </p>
      ) : (
        <FormController
          register={register}
          name="cash_amount"
          control={control}
          Field={CurrencyInput}
          fieldProps={{
            label: 'Số tiền',
            required: true,
            placeholder: amountLocked ? undefined : 'Nhập số tiền',
            disabled: amountLocked,
            caption: amountLocked ? 'Bằng tổng hóa đơn đã thu thập' : undefined,
          }}
        />
      )}
    </div>
  )
}
