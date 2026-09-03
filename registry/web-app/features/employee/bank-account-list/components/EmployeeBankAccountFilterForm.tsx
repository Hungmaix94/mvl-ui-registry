import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { useBanks } from '@/services/common-service'

/** Frontend-only account-type filter values mapped to the `is_primary` boolean API param */
export const ACCOUNT_TYPE_FILTER = {
  PRIMARY: 'true',
  NON_PRIMARY: 'false',
} as const

export type AccountTypeFilter = (typeof ACCOUNT_TYPE_FILTER)[keyof typeof ACCOUNT_TYPE_FILTER]

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountTypeFilter; label: string }> = [
  { value: ACCOUNT_TYPE_FILTER.PRIMARY, label: 'Tài khoản mặc định' },
  { value: ACCOUNT_TYPE_FILTER.NON_PRIMARY, label: 'Không phải tài khoản mặc định' },
]

export type EmployeeBankAccountFilterFormData = {
  bank?: number
  is_primary?: AccountTypeFilter
}

export type EmployeeBankAccountFilterFormRef = {
  clearForm: () => void
  getValues: () => EmployeeBankAccountFilterFormData
}

type EmployeeBankAccountFilterFormProps = {
  initialValues?: EmployeeBankAccountFilterFormData
  /** When true, the form resets to initialValues (URL state) on next dialog open */
  isOpen?: boolean
}

const Schema = z.object({
  bank: z.number().optional(),
  is_primary: z.enum([ACCOUNT_TYPE_FILTER.PRIMARY, ACCOUNT_TYPE_FILTER.NON_PRIMARY]).optional(),
})

const EmployeeBankAccountFilterForm = forwardRef<
  EmployeeBankAccountFilterFormRef,
  EmployeeBankAccountFilterFormProps
>(({ initialValues, isOpen }, ref) => {
  const prevIsOpenRef = useRef(false)

  const { data: banksData } = useBanks({ page_size: 1000 })
  const bankOptions = useMemo(
    () => (banksData?.results || []).map((bank) => ({ value: bank.id, label: bank.name })),
    [banksData?.results]
  )

  const { register, control, handleSubmit, reset, getValues } =
    useForm<EmployeeBankAccountFilterFormData>({
      resolver: zodResolver(Schema),
      defaultValues: {
        bank: initialValues?.bank,
        is_primary: initialValues?.is_primary,
      },
    })

  // Sync form from URL only when the dialog just opened
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = !!isOpen
    if (justOpened) {
      reset({
        bank: initialValues?.bank,
        is_primary: initialValues?.is_primary,
      })
    }
  }, [isOpen, initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset({ bank: undefined, is_primary: undefined }, { keepDefaultValues: false })
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  // Submission is driven by the parent via ref
  const onSubmit = (_data: EmployeeBankAccountFilterFormData) => {}

  return (
    <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction={'column'} gap={'5'}>
        <FormController
          register={register}
          control={control}
          name="bank"
          Field={Select}
          fieldProps={{
            label: 'Ngân hàng',
            placeholder: 'Chọn ngân hàng',
            options: bankOptions,
            searchPlaceholder: 'Tìm kiếm ngân hàng...',
            enableSearch: true,
            isClearable: true,
          }}
        />

        <FormController
          register={register}
          control={control}
          name="is_primary"
          Field={Select}
          fieldProps={{
            label: 'Loại tài khoản',
            placeholder: 'Chọn loại tài khoản',
            options: ACCOUNT_TYPE_OPTIONS,
            isClearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})

EmployeeBankAccountFilterForm.displayName = 'EmployeeBankAccountFilterForm'

export default EmployeeBankAccountFilterForm
