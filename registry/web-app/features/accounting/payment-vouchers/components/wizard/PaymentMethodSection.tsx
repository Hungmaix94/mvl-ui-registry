import {
  Control,
  Controller,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { BankMethodCard, CashMethodCard } from './PaymentMethodCards'
import { IconWarningcircle, IconMoney, IconBank } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'

type Props = {
  watch: UseFormWatch<PaymentVoucherWizardValues>
  setValue: UseFormSetValue<PaymentVoucherWizardValues>
  control: Control<PaymentVoucherWizardValues>
  register: UseFormRegister<PaymentVoucherWizardValues>
  bankAccountOptions: { value: string; label: string }[]
  bankAmt: number
  cashAmt: number
  methodTotal: number
  /** F2 settlement: the amount is fixed by the collect, only the method is a choice. */
  amountLocked?: boolean
  /** Create-time collect: the amount does not exist yet, so do not render the field at all. */
  hideAmountFields?: boolean
}

export function PaymentMethodSection({
  watch,
  setValue,
  control,
  register,
  bankAccountOptions,
  bankAmt,
  cashAmt,
  methodTotal,
  amountLocked = false,
  hideAmountFields = false,
}: Props) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Controller
          name="bank_on"
          control={control}
          render={({ field }) => (
            <div
              data-field-name="bank_on"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all ${
                field.value
                  ? 'bg-red-10 border-red-60'
                  : 'border-border-1 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                if (!field.value) {
                  setValue('bank_on', true, { shouldValidate: true })
                  setValue('cash_on', false, { shouldValidate: true })
                }
              }}
            >
              <div
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                  field.value ? 'border-red-60' : 'border-gray-300 bg-white'
                }`}
              >
                {field.value && <div className="bg-red-60 h-2 w-2 rounded-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`mb-0.5 flex items-center gap-1.5 text-sm font-semibold ${
                    field.value ? 'text-red-80' : 'text-gray-800'
                  }`}
                >
                  <IconBank className="h-4 w-4" /> Chuyển khoản
                </div>
                <div className="text-[13px] text-gray-500">Chi từ tài khoản công ty</div>
              </div>
            </div>
          )}
        />
        <Controller
          name="cash_on"
          control={control}
          render={({ field }) => (
            <div
              data-field-name="cash_on"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all ${
                field.value
                  ? 'bg-red-10 border-red-60'
                  : 'border-border-1 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                if (!field.value) {
                  setValue('cash_on', true, { shouldValidate: true })
                  setValue('bank_on', false, { shouldValidate: true })
                }
              }}
            >
              <div
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                  field.value ? 'border-red-60' : 'border-gray-300 bg-white'
                }`}
              >
                {field.value && <div className="bg-red-60 h-2 w-2 rounded-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`mb-0.5 flex items-center gap-1.5 text-sm font-semibold ${
                    field.value ? 'text-red-80' : 'text-gray-800'
                  }`}
                >
                  <IconMoney className="h-4 w-4" /> Tiền mặt
                </div>
                <div className="text-[13px] text-gray-500">Chi từ quỹ tiền mặt</div>
              </div>
            </div>
          )}
        />
      </div>

      {watch('bank_on') && (
        <BankMethodCard
          register={register}
          control={control}
          bankAccountOptions={bankAccountOptions}
          amountLocked={amountLocked}
          hideAmount={hideAmountFields}
        />
      )}

      {watch('cash_on') && (
        <CashMethodCard
          register={register}
          control={control}
          amountLocked={amountLocked}
          hideAmount={hideAmountFields}
        />
      )}

      {methodTotal > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
            {watch('bank_on') && bankAmt > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(bankAmt / methodTotal) * 100}%` }}
              />
            )}
            {watch('cash_on') && cashAmt > 0 && (
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${(cashAmt / methodTotal) * 100}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {watch('bank_on') && bankAmt > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-blue-500" />
                Chuyển khoản · {formatCurrencyVND(bankAmt)} ₫
              </span>
            )}
            {watch('cash_on') && cashAmt > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-orange-500" />
                Tiền mặt · {formatCurrencyVND(cashAmt)} ₫
              </span>
            )}
            <span className="ml-auto text-[13px] font-semibold text-gray-800">
              Tổng: {formatCurrencyVND(methodTotal)} ₫
            </span>
          </div>
        </div>
      )}

      {!watch('bank_on') && !watch('cash_on') && (
        <div className="bg-red-10 border-red-30 mt-4 flex items-center gap-3.5 rounded-md border p-3.5">
          <div className="text-data-red-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <IconWarningcircle className="h-4 w-4" />
          </div>
          <div>
            <div className="mb-0.5 text-sm font-semibold text-gray-800">Chưa chọn phương thức</div>
            <div className="text-[13px] leading-snug text-gray-600">
              Cần chọn ít nhất 1 trong 2: Tiền mặt hoặc Chuyển khoản.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
