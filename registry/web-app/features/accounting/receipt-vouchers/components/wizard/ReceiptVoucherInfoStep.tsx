import { useState } from 'react'
import {
  Control,
  Controller,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { Select, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { getRealEstateService } from '@/services/realestate-service'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { IconMoney, IconBank, IconWarningcircle } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { BankMethodCard, CashMethodCard } from '../PaymentMethodCards'
import { useAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import { StepCard } from './StepCard'
import { loadPayerSuggestions as loadPayerSuggestionsForType } from '../../utils/payer-suggestions'
import type { ReceiptVoucherFormValues } from '../../schemas/receipt-voucher-schema'
import { AccountingPeriodStatus } from '@/api/schema'

type Props = {
  control: Control<ReceiptVoucherFormValues>
  register: UseFormRegister<ReceiptVoucherFormValues>
  watch: UseFormWatch<ReceiptVoucherFormValues>
  setValue: UseFormSetValue<ReceiptVoucherFormValues>
  isEdit?: boolean
  voucherCode?: string
}

export function ReceiptVoucherInfoStep({
  control,
  register,
  watch,
  setValue,
  isEdit,
  voucherCode,
}: Props) {
  const bankAmt = watch('bank_on') ? Number(watch('bank_amount') || 0) : 0
  const cashAmt = watch('cash_on') ? Number(watch('cash_amount') || 0) : 0
  const totalReceipt = bankAmt + cashAmt

  const getInitialPayerValue = () => {
    const pType = watch('payer_type')
    const pName = watch('payer_name')
    const pTaxCode = watch('payer_tax_code')

    if (!pName) return null

    if (pType === 'INVESTOR') {
      return JSON.stringify({
        type: 'INVESTOR',
        id: watch('payer_investor'),
        name: pName,
        tax_code: pTaxCode || '',
      })
    }
    if (pType === 'EXCHANGE') {
      return JSON.stringify({
        type: 'EXCHANGE',
        id: watch('payer_exchange'),
        name: pName,
        tax_code: pTaxCode || '',
      })
    }
    return null
  }

  const [selectedPayerValue, setSelectedPayerValue] = useState<string | null>(getInitialPayerValue)

  // TODO: replace with real API calls once backend adds exchange/collaborator filters to
  // sales-invoices and commission-payables endpoints.

  const { data: periodsData } = useAccountingPeriods({
    page_size: 50,
    status: isEdit ? undefined : AccountingPeriodStatus.OPEN,
  })
  const { data: bankAccountsData } = useBankAccounts({ page_size: 50 })

  const periodOptions = (periodsData?.results ?? []).map((p) => ({
    value: String(p.id),
    label: `${String(p.year).padStart(4, '0')}/${String(p.month).padStart(2, '0')}`,
  }))

  const bankAccountOptions = (bankAccountsData?.results ?? []).map((b: any) => ({
    value: String(b.id),
    label: `${b.account_number}${b.account_name ? ` - ${b.account_name}` : ''}`,
  }))

  const loadPayerSuggestions = ({ query, page = 1, pageSize = 10 }: any) =>
    loadPayerSuggestionsForType({ payerType: watch('payer_type'), query, page, pageSize })

  const handlePayerSelect = (item: any) => {
    if (!item) {
      handlePayerClear()
      return
    }
    try {
      const data = JSON.parse(item.value)
      setSelectedPayerValue(item.value)
      setValue('payer_name', data.name, { shouldValidate: true })
      setValue('payer_type', data.type, { shouldValidate: true })
      setValue('payer_tax_code', data.tax_code || '', { shouldValidate: true })

      if (data.type === 'INVESTOR') {
        setValue('payer_investor', data.id, { shouldValidate: true })
        setValue('payer_exchange', null, { shouldValidate: true })
        setValue('payer_collaborator', null, { shouldValidate: true })
      } else if (data.type === 'EXCHANGE') {
        setValue('payer_investor', null, { shouldValidate: true })
        setValue('payer_exchange', data.id, { shouldValidate: true })
        setValue('payer_collaborator', null, { shouldValidate: true })
        // Endpoint dropdown nguồn sàn không trả tax_code (schema ExchangeDropdown chỉ có
        // id/code/name/is_source/is_sale_exchange) ⇒ lấy thêm từ detail để giữ nguyên
        // hành vi tự điền MST vốn có.
        if (!data.tax_code && data.id) {
          void getRealEstateService()
            .getSourceExchange(Number(data.id))
            .then((detail) => {
              setValue('payer_tax_code', detail?.tax_code || '', { shouldValidate: true })
            })
            .catch((err) => {
              console.error('Failed to load source exchange tax code:', err)
            })
        }
      } else if (data.type === 'COLLABORATOR') {
        setValue('payer_investor', null, { shouldValidate: true })
        setValue('payer_exchange', null, { shouldValidate: true })
        setValue('payer_collaborator', data.id, { shouldValidate: true })
      }
    } catch (err) {
      console.error('Failed to parse payer select value', err)
    }
  }

  const handlePayerClear = () => {
    setValue('payer_name', '', { shouldValidate: true })
    // Keep the selected payer_type, just clear the specific payer ID and other text fields
    setValue('payer_investor', null, { shouldValidate: true })
    setValue('payer_exchange', null, { shouldValidate: true })
    setValue('payer_collaborator', null, { shouldValidate: true })
    setValue('payer_tax_code', '', { shouldValidate: true })
    setValue('payer_account', '', { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thông tin phiếu */}
      <StepCard stepNum={1} title="Thông tin phiếu">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isEdit && (
            <div className="flex flex-col">
              <TextField label="Mã phiếu thu" value={voucherCode ?? ''} disabled />
            </div>
          )}
          <FormController
            register={register}
            name="receipt_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày thu tiền',
              required: true,
              allowManualInput: true,
              clearable: true,
              placeholder: 'DD/MM/YYYY',
              value: parseDateFromApi(watch('receipt_date')),
              onChange: (val: string | null | undefined) =>
                setValue('receipt_date', formatDateToApi(val ?? undefined), {
                  shouldValidate: true,
                }),
            }}
          />
          <FormController
            register={register}
            name="accounting_period"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Kỳ kế toán',
              required: true,
              options: periodOptions,
              placeholder: 'Chọn kỳ kế toán',
              value: watch('accounting_period') != null ? String(watch('accounting_period')) : null,
              onChange: (next: string | string[] | null) => {
                const raw = Array.isArray(next) ? next[0] : next
                setValue('accounting_period', raw ? Number(raw) : (undefined as any), {
                  shouldValidate: true,
                })
              },
            }}
          />
        </div>

        <div className="border-border-1 col-span-1 mt-2 border-t pt-4 md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Thông tin đối tác / Người nộp
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormController
              register={register}
              name="payer_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại đối tượng',
                required: true,
                options: [
                  { label: 'Chủ đầu tư', value: 'INVESTOR' },
                  { label: 'Sàn giao dịch', value: 'EXCHANGE' },
                ],
                value: watch('payer_type'),
                onChange: (next: string | string[] | null) => {
                  const raw = Array.isArray(next) ? next[0] : next
                  setValue('payer_type', raw as any, { shouldValidate: true })
                  setSelectedPayerValue(null)
                  setValue('payer_name', '', { shouldValidate: true })
                  setValue('payer_investor', null, { shouldValidate: true })
                  setValue('payer_exchange', null, { shouldValidate: true })
                  setValue('payer_collaborator', null, { shouldValidate: true })
                  setValue('payer_tax_code', '', { shouldValidate: true })
                  setValue('payer_account', '', { shouldValidate: true })
                },
              }}
            />
            <Select
              name="payer_search"
              label="Tìm kiếm đối tượng"
              required
              searchPlaceholder={`Nhập mã hoặc tên ${
                watch('payer_type') === 'INVESTOR' ? 'chủ đầu tư' : 'sàn'
              }...`}
              value={selectedPayerValue}
              loadOptions={loadPayerSuggestions}
              loadInitialOptions={async (values) => {
                return values.map((val) => {
                  try {
                    const data = JSON.parse(String(val))
                    const prefix =
                      data.type === 'INVESTOR'
                        ? '[Chủ đầu tư] '
                        : data.type === 'EXCHANGE'
                          ? '[Sàn] '
                          : ''
                    return {
                      label: `${prefix}${data.name}`,
                      value: String(val),
                    }
                  } catch {
                    return { label: 'Unknown', value: String(val) }
                  }
                })
              }}
              onChangeOption={handlePayerSelect}
              clearable
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormController
              register={register}
              name="payer_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên người nộp',
                required: true,
                placeholder: 'Nhập tên người nộp',
              }}
            />
            <FormController
              register={register}
              name="payer_tax_code"
              control={control}
              Field={TextField}
              fieldProps={{ label: 'Mã số thuế', placeholder: 'Nhập mã số thuế' }}
            />
            <div className="col-span-1 md:col-span-2">
              <FormController
                register={register}
                name="payer_account"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số tài khoản',
                  placeholder: 'Nhập số tài khoản người nộp',
                  onlyNumber: true,
                }}
              />
            </div>
          </div>
        </div>
      </StepCard>

      {/* Phương thức thanh toán */}
      <StepCard
        stepNum={2}
        title="Phương thức thanh toán"
        hint="Chọn hình thức thanh toán cho phiếu thu này"
      >
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
                    className={`mb-0.5 flex items-center gap-1.5 text-sm font-semibold ${field.value ? 'text-red-80' : 'text-gray-800'}`}
                  >
                    <IconBank className="h-4 w-4" /> Chuyển khoản
                  </div>
                  <div className="text-[13px] text-gray-500">Tiền về tài khoản công ty</div>
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
                    className={`mb-0.5 flex items-center gap-1.5 text-sm font-semibold ${field.value ? 'text-red-80' : 'text-gray-800'}`}
                  >
                    <IconMoney className="h-4 w-4" /> Tiền mặt
                  </div>
                  <div className="text-[13px] text-gray-500">Nộp vào quỹ tiền mặt</div>
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
            showTransactionRef={true}
          />
        )}

        {watch('cash_on') && <CashMethodCard register={register} control={control} />}

        {totalReceipt > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
              {watch('bank_on') && bankAmt > 0 && (
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(bankAmt / totalReceipt) * 100}%` }}
                />
              )}
              {watch('cash_on') && cashAmt > 0 && (
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${(cashAmt / totalReceipt) * 100}%` }}
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
                Tổng: {formatCurrencyVND(totalReceipt)} ₫
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
              <div className="mb-0.5 text-sm font-semibold text-gray-800">
                Chưa chọn phương thức
              </div>
              <div className="text-[13px] leading-snug text-gray-600">
                Cần chọn ít nhất 1 trong 2: Tiền mặt hoặc Chuyển khoản.
              </div>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  )
}
