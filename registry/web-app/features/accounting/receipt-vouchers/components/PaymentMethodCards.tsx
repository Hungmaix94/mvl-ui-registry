import { IconBank, IconMoney } from '@/assets/icons'
import FormController from '@/components/ui/form/FormController'
import { Select, TextField, CurrencyInput } from '@/components/ui'

export function BankMethodCard({
  register,
  control,
  bankAccountOptions,
  showTransactionRef = false,
}: {
  register: any
  control: any
  bankAccountOptions: { value: string; label: string }[]
  showTransactionRef?: boolean
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
          name="to_bank_account"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Tài khoản nhận',
            required: true,
            options: bankAccountOptions,
            placeholder: 'Chọn tài khoản',
            clearable: true,
          }}
        />
        <FormController
          register={register}
          name="bank_amount"
          control={control}
          Field={CurrencyInput}
          fieldProps={{ label: 'Số tiền', required: true, placeholder: 'Nhập số tiền' }}
        />
        {showTransactionRef && (
          <FormController
            register={register}
            name="bank_transaction_ref"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Mã tham chiếu ngân hàng',
              placeholder: 'Nhập mã giao dịch',
            }}
          />
        )}
      </div>
    </div>
  )
}

export function CashMethodCard({ register, control }: { register: any; control: any }) {
  return (
    <div className="border-border-1 mt-2 rounded-lg border bg-gray-50/30 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <span className="border-border-1 flex h-6 w-6 items-center justify-center rounded border bg-white text-gray-500 shadow-sm">
          <IconMoney className="h-3.5 w-3.5" />
        </span>
        Phần Tiền mặt
      </div>
      <FormController
        register={register}
        name="cash_amount"
        control={control}
        Field={CurrencyInput}
        fieldProps={{
          label: 'Số tiền',
          required: true,
          placeholder: 'Nhập số tiền',
        }}
      />
    </div>
  )
}
