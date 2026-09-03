import { Select } from '@/components/ui'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useCallback } from 'react'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'

export type UserActionTrackingFilterFormRef = {
  clearForm: () => void
  getValues: () => UserActionTrackingFilterFormData
  resetToInitialValues: () => void
}

type UserActionTrackingFilterFormProps = {
  initialValues?: Record<string, any>
}

type TDateRange = {
  from?: Date
  to?: Date
}

type UserActionTrackingFilterFormData = {
  employeeCodes: string[]
  dateRange?: TDateRange | null
  actions?: string[]
  object_types?: string[]
}

const Schema = z.object({
  employeeCodes: z.array(z.string()),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  actions: z.array(z.string()).optional(),
  object_types: z.array(z.string()).optional(),
})

const UserActionTrackingFilterForm = forwardRef<
  UserActionTrackingFilterFormRef,
  UserActionTrackingFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'audit_logging',
    keys: [APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE, APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION],
  })

  // Used to force re-render Select components when form is cleared
  const [formKey, setFormKey] = useState(0)

  const { actionOptions, objectTypeOptions } = useMemo(
    () => ({
      actionOptions: (keysMapOptions.get(APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION) || []).filter(
        (option) => option.value !== 'IMPORT' && option.value !== 'EXPORT'
      ),
      objectTypeOptions: keysMapOptions.get(APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE) || [],
    }),
    [keysMapOptions]
  )

  const getDefaultValues = useCallback(
    (values?: Record<string, any>): UserActionTrackingFilterFormData => ({
      employeeCodes: values?.employeeCodes || [],
      dateRange: values?.dateRange || null,
      actions: values?.actions || undefined,
      object_types: values?.object_types || undefined,
    }),
    []
  )

  const { control, handleSubmit, register, reset, getValues } =
    useForm<UserActionTrackingFilterFormData>({
      resolver: zodResolver(Schema) as any,
      defaultValues: getDefaultValues(initialValues),
    })

  // Reset form when initialValues change (when dialog reopens with new URL values)
  useEffect(() => {
    reset(getDefaultValues(initialValues))
    setFormKey((k) => k + 1)
  }, [initialValues, reset, getDefaultValues])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset({
          employeeCodes: [],
          dateRange: null,
          actions: undefined,
          object_types: undefined,
        })
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
      resetToInitialValues: () => {
        reset(getDefaultValues(initialValues))
        setFormKey((k) => k + 1)
      },
    }),
    [reset, getValues, getDefaultValues, initialValues]
  )

  // Use employee select hook for load on scrolling
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'code',
    pageSize: PAGE_SIZE,
    fields: ['code', 'id', 'fullname'],
  })

  const onSubmit = () => {
    // Form submission handled by parent component via ref
  }

  return (
    <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction={'column'} gap={'4'}>
        <div className="space-y-2">
          <FormController
            key={`employeeCodes-${formKey}`}
            register={register}
            name="employeeCodes"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Mã nhân viên',
              multiple: true,
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              triggerVariant: 'chips',
              maxChips: 3,
              placeholder: 'Nhập hoặc chọn người thực hiện',
              searchPlaceholder: 'Tìm kiếm mã nhân viên...',
              enableSearch: true,
              className: 'w-full',
              pageSize: PAGE_SIZE,
            }}
          />
        </div>

        <div className="space-y-2">
          <FormController
            key={`dateRange-${formKey}`}
            register={register}
            name="dateRange"
            control={control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Chọn khoảng thời gian',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </div>

        <div className="space-y-2">
          <FormController
            key={`actions-${formKey}`}
            register={register}
            name="actions"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Loại hành động',
              placeholder: 'Chọn loại hành động',
              options: actionOptions,
              searchPlaceholder: 'Tìm kiếm loại hành động...',
              enableSearch: true,
              multiple: true,
              triggerVariant: 'chips',
              maxChips: 5,
            }}
          />
        </div>

        <div className="space-y-2">
          <FormController
            key={`object_types-${formKey}`}
            register={register}
            name="object_types"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Loại đối tượng',
              placeholder: 'Chọn loại đối tượng',
              options: objectTypeOptions,
              searchPlaceholder: 'Tìm kiếm loại đối tượng...',
              enableSearch: true,
              multiple: true,
              triggerVariant: 'chips',
              maxChips: 5,
            }}
          />
        </div>
      </Flex>
    </Form>
  )
})

UserActionTrackingFilterForm.displayName = 'UserActionTrackingFilterForm'

export default UserActionTrackingFilterForm
