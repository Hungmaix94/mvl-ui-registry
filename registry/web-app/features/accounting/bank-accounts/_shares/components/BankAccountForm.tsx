import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { Button, FullScreenLoading, Select, Switch, TextArea, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import {
  type CompanyBankAccountRequest,
  useBankAccount,
  useCreateBankAccount,
  useUpdateBankAccount,
} from '@/features/accounting/bank-accounts/services/bank-account-service'
import {
  bankAccountFormSchema,
  type BankAccountFormValues,
  DEFAULT_BANK_ACCOUNT_FORM_VALUES,
} from '@/features/accounting/bank-accounts/types/bank-account-types'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { useBanks } from '@/services/common-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface BankAccountFormProps {
  accountId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export default function BankAccountForm({ accountId, onSuccess, onCancel }: BankAccountFormProps) {
  const navigate = useNavigate()
  const isEditMode = !!accountId
  const isInitialized = useRef(false)

  const { data: account, isLoading: isLoadingAccount } = useBankAccount(accountId ?? 0)
  const createMutation = useCreateBankAccount()
  const updateMutation = useUpdateBankAccount()
  const invalidateQueries = useInvalidateQueries()
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  // Bank dropdown options (mirror: employee bank-account dialog "Tên ngân hàng" controller).
  // CompanyBankAccount.bank_name is a free-text string, so we use the bank's `name` as value.
  const { data: banksData } = useBanks()
  const bankOptions = useMemo(
    () => (banksData?.results || []).map((bank) => ({ value: bank.name, label: bank.name })),
    [banksData?.results]
  )

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema) as any,
    mode: 'onTouched',
    defaultValues: DEFAULT_BANK_ACCOUNT_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { isSubmitting },
  } = form

  const isDefault = watch('is_default')

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && account && !isInitialized.current) {
      reset({
        branch: account.branch,
        account_holder: account.account_holder,
        bank_name: account.bank_name,
        account_number: account.account_number,
        bank_branch_name: account.bank_branch_name || '',
        bank_swift_code: account.bank_swift_code || '',
        currency: account.currency,
        is_default: account.is_default,
        is_active: account.is_active ?? true,
        note: account.note || '',
      })
      isInitialized.current = true
    }
  }, [isEditMode, account, reset])

  const onSubmit = useCallback(
    async (values: BankAccountFormValues) => {
      try {
        const payload: CompanyBankAccountRequest = {
          branch: values.branch,
          account_holder: values.account_holder,
          bank_name: values.bank_name,
          account_number: values.account_number,
          bank_branch_name: values.bank_branch_name || undefined,
          bank_swift_code: values.bank_swift_code || undefined,
          currency: values.currency,
          is_default: values.is_default,
          is_active: values.is_active,
          note: values.note || undefined,
        }

        if (isEditMode && accountId) {
          await updateMutation.mutateAsync({ id: accountId, data: payload })
          toastService.success('Cập nhật tài khoản ngân hàng thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo tài khoản ngân hàng thành công')
        }

        await invalidateQueries.invalidateByPrefix('accounting/bank-accounts')

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT)
        }
      } catch (error: unknown) {
        handleApiError(error, setError as any)
      }
    },
    [
      isEditMode,
      accountId,
      updateMutation,
      createMutation,
      invalidateQueries,
      onSuccess,
      navigate,
      setError,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(withRememberedSearch(APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT))
    }
  }, [onCancel, navigate])

  if (isEditMode && isLoadingAccount) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (isEditMode && !account) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">
          Không tìm thấy tài khoản ngân hàng
        </p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full">
        {/* Section 1: Thông tin tài khoản */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin tài khoản</h2>

          <div className="grid grid-cols-2 gap-5">
            <Controller
              name="branch"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Select
                  label="Chi nhánh công ty"
                  required
                  loadOptions={loadBranchOptions}
                  loadInitialOptions={loadInitialBranchOptions}
                  enableSearch
                  clearable
                  placeholder="Chọn chi nhánh"
                  value={field.value || null}
                  onChange={(next) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    field.onChange(raw ? Number(raw) : 0)
                  }}
                  error={error?.message}
                />
              )}
            />
            <FormController
              register={register}
              name="account_holder"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Chủ tài khoản',
                required: true,
                placeholder: 'VD: CÔNG TY MVL',
                maxLength: 255,
                showCharacterCount: true,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="bank_name"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Tên ngân hàng',
                required: true,
                placeholder: 'Chọn tên ngân hàng',
                options: bankOptions,
                searchPlaceholder: 'Tìm kiếm ngân hàng...',
                enableSearch: true,
              }}
            />
            <FormController
              register={register}
              name="account_number"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Số tài khoản',
                required: true,
                placeholder: 'Nhập số tài khoản',
                maxLength: 50,
                showCharacterCount: true,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="bank_branch_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Chi nhánh ngân hàng',
                placeholder: 'VD: HCM',
                maxLength: 255,
              }}
            />
            <FormController
              register={register}
              name="bank_swift_code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'SWIFT code',
                placeholder: 'VD: BFTVVNVX',
                maxLength: 11,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="currency"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tiền tệ',
                required: true,
                placeholder: 'VD: VND, USD, EUR',
                maxLength: 10,
                caption: 'Mã ISO 4217 (VD: VND, USD, EUR)',
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        {/* Section 2: Thiết lập & Ghi chú */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thiết lập & Ghi chú</h2>

          <Controller
            name="is_default"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <Switch checked={!!field.value} onChange={field.onChange} />
                  <span className="typo-body-base-medium text-content-dark-1">
                    Đặt làm tài khoản mặc định
                  </span>
                </div>
                {isDefault && !isEditMode && (
                  <p className="typo-body-sm-regular text-action-primary-orange-default">
                    Hệ thống chỉ có 1 tài khoản mặc định. Khi bật, tài khoản đang mặc định sẽ bị bỏ
                    chọn.
                  </p>
                )}
              </div>
            )}
          />

          {isEditMode && (
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <Switch checked={!!field.value} onChange={field.onChange} />
                  <span className="typo-body-base-medium text-content-dark-1">Đang hoạt động</span>
                </div>
              )}
            />
          )}

          <FormController
            register={register}
            name="note"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Mô tả thêm về tài khoản...',
              rows: 4,
              maxCharacters: 2000,
              className: 'w-full',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
