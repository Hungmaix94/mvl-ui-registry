import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

// Chỉ những trạng thái mà API get-list thực sự hỗ trợ lọc
const LIST_API_STATUSES = Object.values(MonthlyStatus) as string[]

export type CommCtvMonthlyFilterFormData = {
  status?: string
  beneficiary_collaborator?: string
}

export type CommCtvMonthlyFilterRef = {
  getValues: () => CommCtvMonthlyFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommCtvMonthlyFilterFormData
  isOpen: boolean
}

export const CommCtvMonthlyFilter = forwardRef<CommCtvMonthlyFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<CommCtvMonthlyFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register, reset, getValues } = form

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES],
    })
    const statusOptions = (
      keysMapOptions.get(
        APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
      ) || []
    ).filter((option) => LIST_API_STATUSES.includes(String(option.value)))

    const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () => reset({ status: undefined, beneficiary_collaborator: undefined }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="1" gap="4" className="w-full">
          <FormController<
            CommCtvMonthlyFilterFormData,
            SelectProps<{ label: string; value: string | number }>
          >
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Tất cả trạng thái',
              options: statusOptions || [],
            }}
          />

          <FormController<CommCtvMonthlyFilterFormData, any>
            register={register}
            control={control}
            name="beneficiary_collaborator"
            Field={Select}
            fieldProps={{
              label: 'CTV thụ hưởng',
              placeholder: 'Chọn cộng tác viên',
              loadOptions: loadCollaboratorOptions,
              loadInitialOptions: loadInitialCollaboratorOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

CommCtvMonthlyFilter.displayName = 'CommCtvMonthlyFilter'

export default CommCtvMonthlyFilter
