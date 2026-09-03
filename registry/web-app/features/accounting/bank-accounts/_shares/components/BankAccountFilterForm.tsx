import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { useBranchSelect } from '@/hooks/useBranchSelect'
import {
  bankAccountFilterSchema,
  type BankAccountFilterValues,
  DEFAULT_BANK_ACCOUNT_FILTER_VALUES,
} from '@/features/accounting/bank-accounts/types/bank-account-types'

export type BankAccountFilterFormRef = {
  clearForm: () => void
  getValues: () => BankAccountFilterValues
}

type BankAccountFilterFormProps = {
  initialValues?: Partial<BankAccountFilterValues>
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Đã đóng' },
]

const DEFAULT_OPTIONS = [
  { value: 'true', label: 'Mặc định' },
  { value: 'false', label: 'Không phải mặc định' },
]

const BankAccountFilterForm = forwardRef<BankAccountFilterFormRef, BankAccountFilterFormProps>(
  ({ initialValues }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

    const { register, control, handleSubmit, reset, getValues } = useForm<BankAccountFilterValues>({
      resolver: zodResolver(bankAccountFilterSchema),
      defaultValues: {
        ...DEFAULT_BANK_ACCOUNT_FILTER_VALUES,
        ...initialValues,
      },
    })

    useEffect(() => {
      reset({ ...DEFAULT_BANK_ACCOUNT_FILTER_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset(DEFAULT_BANK_ACCOUNT_FILTER_VALUES)
          setFormKey((k) => k + 1)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = useCallback(() => {
      // Submission handled by parent via ref
    }, [])

    return (
      <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <FormController
            key={`branch-${formKey}`}
            register={register}
            name="branch"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Chi nhánh công ty',
              loadOptions: loadBranchOptions,
              loadInitialOptions: loadInitialBranchOptions,
              enableSearch: true,
              clearable: true,
              placeholder: 'Chọn chi nhánh',
            }}
          />
          <FormController
            key={`is_active-${formKey}`}
            register={register}
            name="is_active"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              options: STATUS_OPTIONS,
              placeholder: 'Chọn trạng thái',
              clearable: true,
            }}
          />
          <FormController
            key={`is_default-${formKey}`}
            register={register}
            name="is_default"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Mặc định',
              options: DEFAULT_OPTIONS,
              placeholder: 'Tất cả',
              clearable: true,
            }}
          />
        </Flex>
      </Form>
    )
  }
)

BankAccountFilterForm.displayName = 'BankAccountFilterForm'

export default BankAccountFilterForm
