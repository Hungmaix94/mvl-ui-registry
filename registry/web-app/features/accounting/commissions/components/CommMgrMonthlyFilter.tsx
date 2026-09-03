import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

/** Mirrors the API query-param names, so the page can copy values straight onto the URL. */
export type CommMgrMonthlyFilterFormData = {
  status?: string | null
  branch?: number | null
  block?: number | null
  department?: number | null
  position?: number | null
  beneficiary_employee?: number | null
}

export type CommMgrMonthlyFilterRef = {
  getValues: () => CommMgrMonthlyFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommMgrMonthlyFilterFormData
  isOpen: boolean
}

const DEFAULT_FORM_VALUES: CommMgrMonthlyFilterFormData = {
  status: null,
  branch: null,
  block: null,
  department: null,
  position: null,
  beneficiary_employee: null,
}

/** `0` is how the cascade spells "nothing selected"; the URL wants the param gone instead. */
const toFilterId = (value?: number | null) => ((value ?? 0) > 0 ? (value as number) : null)

export const CommMgrMonthlyFilter = forwardRef<CommMgrMonthlyFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    // Bump-to-remount key: the cascade owns its own selection state, so an RHF `reset`
    // cannot empty it — only a remount can.
    const [formKey, setFormKey] = useState(0)
    // Set right after "Xoá bộ lọc" so the cascade seeds nothing and does not re-populate
    // itself from the stale URL params still sitting in `initialValues`.
    const [shouldClearCascade, setShouldClearCascade] = useState(false)

    const { control, register, reset, getValues, setValue } = useForm<CommMgrMonthlyFilterFormData>(
      {
        defaultValues: { ...DEFAULT_FORM_VALUES, ...initialValues },
      }
    )

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES],
    })
    const statusOptions = keysMapOptions.get(
      APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
    )

    useEffect(() => {
      if (!isOpen || !initialValues) return
      reset({ ...DEFAULT_FORM_VALUES, ...initialValues })
      setShouldClearCascade(false)
      setFormKey((k) => k + 1)
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => getValues(),
        clearForm: () => {
          reset(DEFAULT_FORM_VALUES)
          setShouldClearCascade(true)
          setFormKey((k) => k + 1)
        },
      }),
      [reset, getValues]
    )

    // The cascade emits `*_id` numbers (0 = unselected) and owns the whole org axis:
    // picking an employee back-fills their branch/khối/phòng ban/chức vụ, picking a parent
    // resets the levels below it. Mirroring every level here keeps the URL in step with both.
    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        setValue('branch', toFilterId(data.branch_id), { shouldDirty: true })
        setValue('block', toFilterId(data.block_id), { shouldDirty: true })
        setValue('department', toFilterId(data.department_id), { shouldDirty: true })
        setValue('position', toFilterId(data.position_id), { shouldDirty: true })
        setValue('beneficiary_employee', toFilterId(data.employee_id), { shouldDirty: true })
      },
      [setValue]
    )

    // The cascade hydrates from string ids — feed the current URL selection back on reopen.
    const cascadeInitialValues = useMemo(() => {
      if (shouldClearCascade) return undefined
      return {
        branch: initialValues?.branch ? String(initialValues.branch) : undefined,
        block: initialValues?.block ? String(initialValues.block) : undefined,
        department: initialValues?.department ? String(initialValues.department) : undefined,
        position: initialValues?.position ? String(initialValues.position) : undefined,
        employee: initialValues?.beneficiary_employee
          ? String(initialValues.beneficiary_employee)
          : undefined,
      }
    }, [initialValues, shouldClearCascade])

    return (
      <Flex direction="column" gap="4" className="w-full">
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeChange}
          showPosition
          showEmployee
          employeeLabel="Nhân viên thụ hưởng"
          skipValidation
          className="gap-4"
        />

        <FormController<
          CommMgrMonthlyFilterFormData,
          SelectProps<{ label: string; value: string | number }>
        >
          key={`status-${formKey}`}
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
      </Flex>
    )
  }
)

CommMgrMonthlyFilter.displayName = 'CommMgrMonthlyFilter'

export default CommMgrMonthlyFilter
