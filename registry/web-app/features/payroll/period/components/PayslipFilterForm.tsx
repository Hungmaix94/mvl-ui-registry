import { useCallback, useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex, Text } from '@radix-ui/themes'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { Checkbox, Select } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useMemo } from 'react'

export type PayslipFilterFormData = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position?: number
  employee_id?: number
  need_resend_email?: string[]
  payslip_status?: string[]
}

export type PayslipFilterFormRef = {
  clearForm: () => void
  getValues: () => PayslipFilterFormData
}

type PayslipFilterFormProps = {
  initialValues?: PayslipFilterFormData
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position: z.number().optional(),
  employee_id: z.number().optional(),
  need_resend_email: z.array(z.string()).optional(),
  payslip_status: z.array(z.string()).optional(),
})

const PayslipFilterForm = forwardRef<PayslipFilterFormRef, PayslipFilterFormProps>(
  ({ initialValues }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const [shouldResetToInitial, setShouldResetToInitial] = useState(true)
    const [shouldClearCascade, setShouldClearCascade] = useState(false)

    const { keysMapOptions } = useAppConstant({
      module: 'payroll',
      keys: [APP_CONSTANT_KEY.PAYROLL.PAYROLL_SLIP_STATUS],
    })

    const needResendEmailOptions = [
      { label: 'Tất cả', value: 'all' },
      { label: 'Đã gửi', value: 'false' },
      { label: 'Cần gửi lại', value: 'true' },
    ]

    const payslipStatusOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.PAYROLL_SLIP_STATUS)
        ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.PAYROLL_SLIP_STATUS) || []
        : []
    }, [keysMapOptions])

    const { handleSubmit, reset, getValues, setValue, watch } = useForm<PayslipFilterFormData>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position: initialValues?.position,
        employee_id: initialValues?.employee_id,
        need_resend_email: initialValues?.need_resend_email || [],
        payslip_status: initialValues?.payslip_status || [],
      },
    })

    const watchedMailStatus = watch('need_resend_email') || []
    const watchedPayslipStatus = watch('payslip_status') || []

    // Update form values when initialValues change (e.g., dialog reopen)
    useEffect(() => {
      if (shouldResetToInitial && initialValues) {
        reset({
          branch_id: initialValues.branch_id,
          block_id: initialValues.block_id,
          department_id: initialValues.department_id,
          position: initialValues.position,
          employee_id: initialValues.employee_id,
          need_resend_email: initialValues.need_resend_email || [],
          payslip_status: initialValues.payslip_status || [],
        })
        // Reset formKey to trigger CascadeSelectGroupOrganization re-render with new values
        setFormKey((prev) => prev + 1)
        // Reset clear flag when initialValues change (dialog reopened with new values)
        setShouldClearCascade(false)
      }
    }, [initialValues, reset, shouldResetToInitial])

    const handleCascadeChange = useCallback(
      (data: any) => {
        setValue('branch_id', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined, {
          shouldDirty: true,
        })
        setValue('block_id', data.block_id && data.block_id !== 0 ? data.block_id : undefined, {
          shouldDirty: true,
        })
        setValue(
          'department_id',
          data.department_id && data.department_id !== 0 ? data.department_id : undefined,
          { shouldDirty: true }
        )
        if (data.position_id !== undefined) {
          const current = getValues()
          const positionChanged = data.position_id !== current.position
          if (data.position_id && data.position_id !== 0 && positionChanged) {
            setValue('position', data.position_id, { shouldDirty: true })
          } else if (!data.position_id || data.position_id === 0) {
            setValue('position', undefined, { shouldDirty: true })
          }
        }
        if (data.employee_id !== undefined) {
          const current = getValues()
          const employeeChanged = data.employee_id !== current.employee_id
          if (data.employee_id && data.employee_id !== 0 && employeeChanged) {
            setValue('employee_id', data.employee_id, { shouldDirty: true })
          } else if (!data.employee_id || data.employee_id === 0) {
            setValue('employee_id', undefined, { shouldDirty: true })
          }
        }
      },
      [setValue, getValues]
    )

    const handleCheckboxChange = (
      field: 'need_resend_email' | 'payslip_status',
      value: string,
      checked: boolean
    ) => {
      const currentValues = getValues(field) || []
      let newValues: string[]
      if (checked) {
        newValues = [...currentValues, value]
      } else {
        newValues = currentValues.filter((v) => v !== value)
      }
      setValue(field, newValues, { shouldDirty: true })
    }

    // Expose clearForm and getValues via ref
    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setShouldResetToInitial(false)
          setShouldClearCascade(true)
          setFormKey((prev) => prev + 1)
          const clearedValues = {
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            position: undefined,
            employee_id: undefined,
            need_resend_email: [],
            payslip_status: [],
          }
          reset(clearedValues as any, { keepDefaultValues: false, keepValues: false })
        },
        getValues: () => getValues(),
      }),
      [reset, getValues, formKey, initialValues, shouldClearCascade]
    )

    // Empty submit handler - form submission is handled by parent via ref
    const onSubmit = (_data: PayslipFilterFormData) => {}

    return (
      <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        <Flex direction={'column'} gap={'5'}>
          {/* Cascade Select: Branch, Block, Department, Position, Employee */}
          <CascadeSelectGroupOrganization
            key={formKey}
            initialValues={
              shouldClearCascade
                ? undefined
                : {
                    branch: initialValues?.branch_id?.toString(),
                    block: initialValues?.block_id?.toString(),
                    department: initialValues?.department_id?.toString(),
                    position: initialValues?.position?.toString(),
                    employee: initialValues?.employee_id?.toString(),
                  }
            }
            onFormChange={handleCascadeChange}
            showEmployee={true}
            showPosition
            employeeLabel={'Nhân viên'}
            layout="grid"
            skipValidation={true}
            className="gap-5"
          />

          {/* <Grid columns="2" gap="5"> */}
          {/* Mail Status */}
          <Flex direction="column" gap="3">
            <Text className="text-content-dark-2 typo-body-base-semibold">Trạng thái gửi mail</Text>
            <div className="w-full">
              <Select
                options={needResendEmailOptions}
                value={
                  watchedMailStatus.length === 0 || watchedMailStatus.length > 1
                    ? 'all'
                    : watchedMailStatus[0]
                }
                onChange={(val) => {
                  if (!val || val === 'all') {
                    setValue('need_resend_email', [])
                  } else {
                    setValue('need_resend_email', [val as string])
                  }
                }}
                placeholder="Chọn trạng thái"
                className="w-full"
              />
            </div>
          </Flex>

          {/* Payslip Status */}
          <Flex direction="column" gap="3">
            <Text className="text-content-dark-2 typo-body-base-semibold">
              Trạng thái phiếu lương
            </Text>
            <Flex gap="5" wrap="wrap">
              {payslipStatusOptions.map((option) => (
                <Flex key={option.value} align="center" gap="2">
                  <Checkbox
                    checked={watchedPayslipStatus.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange('payslip_status', option.value, checked === true)
                    }
                    id={`payslip-${option.value}`}
                  />
                  <label
                    htmlFor={`payslip-${option.value}`}
                    className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                  >
                    {option.label}
                  </label>
                </Flex>
              ))}
            </Flex>
          </Flex>
          {/* </Grid> */}
        </Flex>
      </Form>
    )
  }
)

PayslipFilterForm.displayName = 'PayslipFilterForm'

export default PayslipFilterForm
