import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  kpiCommissionRuleFilterSchema,
  type KpiCommissionRuleFilterValues,
  DEFAULT_KPI_COMMISSION_RULE_FILTER_VALUES,
} from '../../types/kpi-commission-rule-types'

export type KpiCommissionRuleFilterFormRef = {
  clearForm: () => void
  getValues: () => KpiCommissionRuleFilterValues
}

type KpiCommissionRuleFilterFormProps = {
  initialValues?: Partial<KpiCommissionRuleFilterValues>
}

const KpiCommissionRuleFilterForm = forwardRef<
  KpiCommissionRuleFilterFormRef,
  KpiCommissionRuleFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS,
      APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE,
    ],
  })

  const statusOptions = keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS) || []
  const roleOptions = keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE) || []

  const { register, control, handleSubmit, reset, getValues } =
    useForm<KpiCommissionRuleFilterValues>({
      resolver: zodResolver(kpiCommissionRuleFilterSchema),
      defaultValues: {
        ...DEFAULT_KPI_COMMISSION_RULE_FILTER_VALUES,
        ...initialValues,
      },
    })

  useEffect(() => {
    reset({ ...DEFAULT_KPI_COMMISSION_RULE_FILTER_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_KPI_COMMISSION_RULE_FILTER_VALUES)
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
          key={`target_role-${formKey}`}
          register={register}
          name="target_role"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Đối tượng áp dụng',
            options: roleOptions,
            placeholder: 'Chọn đối tượng',
            clearable: true,
          }}
        />
        <FormController
          key={`status-${formKey}`}
          register={register}
          name="status"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Chọn trạng thái',
            clearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})

KpiCommissionRuleFilterForm.displayName = 'KpiCommissionRuleFilterForm'

export default KpiCommissionRuleFilterForm
