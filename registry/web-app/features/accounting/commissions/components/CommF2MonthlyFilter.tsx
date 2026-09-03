import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

// Chỉ những trạng thái mà API get-list thực sự hỗ trợ lọc
const LIST_API_STATUSES = Object.values(MonthlyStatus) as string[]

export type CommF2MonthlyFilterFormData = {
  status?: string
  beneficiary_exchange?: string
}

export type CommF2MonthlyFilterRef = {
  getValues: () => CommF2MonthlyFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommF2MonthlyFilterFormData
  isOpen: boolean
}

export const CommF2MonthlyFilter = forwardRef<CommF2MonthlyFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<CommF2MonthlyFilterFormData>({
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

    const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({
      valueType: 'id',
    })

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () => reset({ status: undefined, beneficiary_exchange: undefined }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="1" gap="4" className="w-full">
          <FormController<
            CommF2MonthlyFilterFormData,
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

          <FormController<CommF2MonthlyFilterFormData, any>
            register={register}
            control={control}
            name="beneficiary_exchange"
            Field={Select}
            fieldProps={{
              label: 'Sàn thụ hưởng',
              placeholder: 'Chọn sàn giao dịch',
              loadOptions: loadExchangeOptions,
              loadInitialOptions: loadInitialExchangeOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

CommF2MonthlyFilter.displayName = 'CommF2MonthlyFilter'

export default CommF2MonthlyFilter
