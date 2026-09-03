import { useCallback, useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { FormCaption } from '@/components/ui/form'
import { Button, TextField, Select, Checkbox } from '@/components/ui'
import {
  useBanks,
  useCreateBankAccount,
  useUpdateBankAccount,
  type BankAccount,
} from '@/services/common-service'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'
import {
  bankAccountSchema,
  type BankAccountFormData,
} from '@/features/employee/management/view-details/tab-general/bank-account/schemas/bank-account-schema.ts'

type BankAccountFormProps = {
  employee: { id: number; fullname?: string }
  mode: 'add' | 'edit'
  initialValues?: BankAccount
  onSuccess?: () => void
}

export default function BankAccountForm({
  employee,
  mode = 'add',
  initialValues,
  onSuccess,
}: BankAccountFormProps) {
  const { displayClose } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const createBankAccountMutation = useCreateBankAccount()
  const updateBankAccountMutation = useUpdateBankAccount()
  const invalidateQueries = useInvalidateQueries()

  // Fetch banks for dropdown
  const { data: banksData } = useBanks()
  const banks = useMemo(() => banksData?.results || [], [banksData?.results])

  const bankOptions = useMemo(
    () => banks.map((bank) => ({ value: bank.id, label: bank.name })),
    [banks]
  )

  const { register, control, handleSubmit, reset, setError } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    mode: 'onTouched',
    defaultValues: {
      bank_id: (initialValues?.bank?.id ?? undefined) as number | undefined,
      account_number: initialValues?.account_number || '',
      account_name: initialValues?.account_name || employee.fullname || '',
      is_primary: initialValues?.is_primary || false,
    },
  })

  // Update form when initialValues change (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      reset({
        bank_id: (initialValues.bank?.id ?? undefined) as number | undefined,
        account_number: initialValues.account_number || '',
        account_name: initialValues.account_name || '',
        is_primary: initialValues.is_primary || false,
      })
    }
  }, [mode, initialValues, reset])

  const onSubmit = useCallback(
    async (data: BankAccountFormData) => {
      try {
        if (!data.bank_id || data.bank_id <= 0) {
          showErrorToast('Vui lòng chọn ngân hàng')
          return
        }

        const payload = {
          employee_id: employee.id,
          bank_id: data.bank_id as number,
          account_number: data.account_number.trim(),
          account_name: data.account_name.trim(),
          is_primary: data.is_primary || false,
        }

        if (mode === 'edit' && initialValues?.id) {
          await updateBankAccountMutation.mutateAsync({
            id: initialValues.id,
            data: payload,
          })
          showSuccessToast('Cập nhật tài khoản ngân hàng thành công')
        } else {
          await createBankAccountMutation.mutateAsync(payload)
          showSuccessToast('Thêm tài khoản ngân hàng thành công')
        }

        // Invalidate queries to refresh bank accounts list
        await invalidateQueries.invalidateByPrefix('hrm')

        // Call onSuccess callback if provided
        onSuccess?.()

        // Close dialog
        displayClose()
      } catch (error: any) {
        // Handle server validation errors and set them to form fields
        // handleApiError will try multiple error structures automatically
        handleApiError(error, setError)
      }
    },
    [
      employee.id,
      mode,
      initialValues,
      createBankAccountMutation,
      updateBankAccountMutation,
      showSuccessToast,
      invalidateQueries,
      onSuccess,
      displayClose,
      setError,
    ]
  )

  const isLoading =
    mode === 'add' ? createBankAccountMutation.isPending : updateBankAccountMutation.isPending

  return (
    <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 p-6">
        {/* Bank Selection */}
        <FormController
          register={register}
          name="bank_id"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Tên ngân hàng',
            required: true,
            placeholder: 'Chọn tên ngân hàng',
            options: bankOptions,
            searchPlaceholder: 'Tìm kiếm ngân hàng...',
            disabled: isLoading,
            enableSearch: true,
          }}
        />

        {/* Account Number */}
        <FormController
          register={register}
          name="account_number"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Số tài khoản',
            required: true,
            placeholder: 'Nhập số tài khoản',
            disabled: isLoading,
          }}
        />

        {/* Account Holder Name */}
        <FormController
          register={register}
          name="account_name"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Chủ tài khoản',
            placeholder: 'Nhập tên chủ tài khoản',
            disabled: isLoading,
            required: true,
          }}
        />

        {/* Is Primary Account */}
        <div className="flex flex-col items-start gap-2">
          <div className="text-neutral-90 typo-body-base-semibold">Loại tài khoản</div>
          <Controller
            name="is_primary"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                  label="Tài khoản mặc định"
                  disabled={isLoading}
                />
                <FormCaption error={fieldState.error?.message} disabled={isLoading} />
              </div>
            )}
          />
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={displayClose}
            disabled={isLoading}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isLoading} className={'w-[150px]'}>
            {mode === 'add' ? 'Thêm' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Form>
  )
}
