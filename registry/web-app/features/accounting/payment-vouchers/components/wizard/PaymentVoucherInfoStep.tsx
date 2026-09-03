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
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { AccountingPeriodStatus } from '@/api/schema'
import { useAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import {
  collaboratorService,
  type Collaborator,
} from '@/features/accounting/collaborators/services/collaborator-service'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PayeeType,
} from '../../constants/payment-voucher-constants'
import { StepCard } from './StepCard'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'

type Props = {
  control: Control<PaymentVoucherWizardValues>
  register: UseFormRegister<PaymentVoucherWizardValues>
  watch: UseFormWatch<PaymentVoucherWizardValues>
  setValue: UseFormSetValue<PaymentVoucherWizardValues>
  isEdit?: boolean
  voucherCode?: string
}

export function PaymentVoucherInfoStep({
  control,
  register,
  watch,
  setValue,
  isEdit,
  voucherCode,
}: Props) {
  const { keysMapOptions } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE],
  })
  const payeeOptions = keysMapOptions.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE) ?? []

  const { loadEmployeeOptions, loadInitialEmployeeOptions, getCachedEmployeeById } =
    useEmployeeSelect({ valueType: 'id' })
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()
  const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  const { data: periodsData } = useAccountingPeriods({ page_size: 50 })

  // The list mixes open, soft-closed and hard-closed periods with nothing to tell them
  // apart, so picking a closed one looked fine until the voucher refused to save.
  const PERIOD_STATUS_LABEL: Record<string, string> = {
    [AccountingPeriodStatus.SOFT_CLOSED]: 'đã khóa mềm',
    [AccountingPeriodStatus.HARD_CLOSED]: 'đã khóa',
  }
  const periodOptions = (periodsData?.results ?? []).map((p) => {
    const period = `${String(p.year).padStart(4, '0')}/${String(p.month).padStart(2, '0')}`
    const note = PERIOD_STATUS_LABEL[p.status ?? '']
    return { value: String(p.id), label: note ? `${period} — ${note}` : period }
  })

  const payeeType = watch('payee_type')

  const clearPayee = () => {
    setValue('payee_name', '', { shouldValidate: true })
    setValue('payee_employee', null, { shouldValidate: true })
    setValue('payee_collaborator', null, { shouldValidate: true })
    setValue('payee_exchange', null, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thông tin phiếu */}
      <StepCard stepNum={1} title="Thông tin phiếu">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isEdit && (
            <div className="flex flex-col">
              <TextField label="Mã phiếu chi" value={voucherCode ?? ''} disabled />
            </div>
          )}
          <FormController
            register={register}
            name="voucher_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày lập phiếu',
              required: true,
              allowManualInput: true,
              clearable: true,
              placeholder: 'DD/MM/YYYY',
              value: parseDateFromApi(watch('voucher_date')),
              onChange: (val: string | null | undefined) =>
                setValue('voucher_date', formatDateToApi(val ?? undefined), {
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
            Thông tin đối tác / Người nhận
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormController
              register={register}
              name="payee_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại đối tượng',
                required: true,
                options: payeeOptions,
                placeholder: 'Chọn loại đối tượng',
                value: watch('payee_type'),
                onChange: (next: string | string[] | null) => {
                  const raw = Array.isArray(next) ? next[0] : next
                  setValue('payee_type', raw as any, { shouldValidate: true })
                  clearPayee()
                },
              }}
            />

            {payeeType === PayeeType.EMPLOYEE && (
              <Controller
                name="payee_employee"
                control={control}
                render={({ field, fieldState }) => (
                  <div data-field-name="payee_employee">
                    <Select
                      label="Nhân viên"
                      required
                      placeholder="Tìm kiếm nhân viên..."
                      searchPlaceholder="Nhập mã hoặc tên nhân viên..."
                      enableSearch
                      value={field.value != null ? String(field.value) : null}
                      loadOptions={loadEmployeeOptions}
                      loadInitialOptions={loadInitialEmployeeOptions}
                      clearable
                      error={fieldState.error?.message}
                      onChange={(next) => {
                        const raw = Array.isArray(next) ? next[0] : next
                        const id = raw != null && raw !== '' ? Number(raw) : null
                        field.onChange(id)
                        if (id) {
                          const emp = getCachedEmployeeById(id)
                          if (emp)
                            setValue('payee_name', emp.fullname ?? '', { shouldValidate: true })
                        } else {
                          setValue('payee_name', '', { shouldValidate: true })
                        }
                      }}
                    />
                  </div>
                )}
              />
            )}

            {payeeType === PayeeType.COLLABORATOR && (
              <Controller
                name="payee_collaborator"
                control={control}
                render={({ field, fieldState }) => (
                  <div data-field-name="payee_collaborator">
                    <Select
                      label="Cộng tác viên"
                      required
                      placeholder="Tìm kiếm cộng tác viên..."
                      searchPlaceholder="Nhập mã hoặc tên cộng tác viên..."
                      enableSearch
                      value={field.value != null ? String(field.value) : null}
                      loadOptions={loadCollaboratorOptions}
                      loadInitialOptions={loadInitialCollaboratorOptions}
                      clearable
                      error={fieldState.error?.message}
                      onChange={(next) => {
                        const raw = Array.isArray(next) ? next[0] : next
                        const id = raw != null && raw !== '' ? Number(raw) : null
                        field.onChange(id)
                        if (id) {
                          collaboratorService
                            .getCollaborator(id)
                            .then((ctv: Collaborator) => {
                              setValue('payee_name', ctv?.name ?? '', { shouldValidate: true })
                            })
                            .catch(() => {})
                        } else {
                          setValue('payee_name', '', { shouldValidate: true })
                        }
                      }}
                    />
                  </div>
                )}
              />
            )}

            {payeeType === PayeeType.EXCHANGE && (
              <Controller
                name="payee_exchange"
                control={control}
                render={({ field, fieldState }) => (
                  <div data-field-name="payee_exchange">
                    <Select
                      label="Sàn giao dịch"
                      required
                      placeholder="Tìm kiếm sàn giao dịch..."
                      searchPlaceholder="Nhập tên sàn giao dịch..."
                      enableSearch
                      value={field.value != null ? String(field.value) : null}
                      loadOptions={loadExchangeOptions}
                      loadInitialOptions={loadInitialExchangeOptions}
                      clearable
                      error={fieldState.error?.message}
                      onChangeOption={(option: any) => {
                        if (!option) {
                          field.onChange(null)
                          setValue('payee_name', '', { shouldValidate: true })
                          return
                        }
                        const id = option.value != null ? Number(option.value) : null
                        field.onChange(id)
                        setValue('payee_name', option.label ?? '', { shouldValidate: true })
                      }}
                    />
                  </div>
                )}
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormController
              register={register}
              name="payee_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên người nhận',
                required: true,
                placeholder: 'Nhập tên người nhận',
              }}
            />
          </div>
        </div>
      </StepCard>
    </div>
  )
}
