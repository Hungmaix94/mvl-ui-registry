import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'

export type RecruitmentRequestFilterFormRef = {
  clearForm: () => void
  getValues?: () => RecruitmentRequestFilterFormValues
  getRawValues?: () => RecruitmentRequestFilterFormValues
}

type RecruitmentRequestFilterFormProps = {
  initialValues?: Record<string, any>
}

type TDateRange = {
  from?: Date
  to?: Date
}

export type RecruitmentRequestFilterFormValues = {
  date_range?: TDateRange | null
  branch_id?: number
  block_id?: number
  department_id?: number
  recruitment_type?: string
  status?: string[]
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  recruitment_type: z.string().optional(),
  status: z.array(z.string()).optional(),
  date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
})

const RecruitmentRequestFilterForm = forwardRef<
  RecruitmentRequestFilterFormRef,
  RecruitmentRequestFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE, APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS],
  })

  const recruitmentTypeOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE)
        ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE) || []
        : [],
    [keysMapOptions]
  )

  const statusOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS)
        ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS) || []
        : [],
    [keysMapOptions]
  )

  const { control, reset, getValues, handleSubmit, watch, setValue, register } =
    useForm<RecruitmentRequestFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        recruitment_type: initialValues?.recruitment_type || undefined,
        status: initialValues?.status || [],
        date_range: initialValues?.date_range || null,
      },
    })

  const [formKey, setFormKey] = useState(0)

  // Khi initialValues thay đổi → reset form
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      reset({
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        recruitment_type: initialValues?.recruitment_type || undefined,
        status: initialValues?.status || [],
        date_range: initialValues?.date_range || null,
      })
    }
  }, [initialValues, reset])

  // expose các hàm public ra ngoài
  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        recruitment_type: undefined,
        status: [],
        date_range: null,
      })
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => {
      return getValues()
    },
    getValues: () => {
      const values = getValues()
      const apiParams: Record<string, any> = {}

      if (values.branch_id) apiParams.branch_id = values.branch_id
      if (values.block_id) apiParams.block_id = values.block_id
      if (values.department_id) apiParams.department_id = values.department_id

      if (values.recruitment_type) apiParams.recruitment_type = values.recruitment_type

      if (values.status?.length)
        apiParams.status = values.status.length === 1 ? values.status[0] : values.status

      if (values.date_range?.from) apiParams.from_date = formatDateToApi(values.date_range.from)
      if (values.date_range?.to) apiParams.to_date = formatDateToApi(values.date_range.to)

      return apiParams
    },
  }))

  // Khi người dùng chọn branch/block/department
  const handleCascadeChange = useCallback(
    (data: any) => {
      const current = getValues()

      if (data.branch_id && data.branch_id !== current.branch_id)
        setValue('branch_id', data.branch_id, { shouldDirty: false })

      if (data.block_id && data.block_id !== current.block_id)
        setValue('block_id', data.block_id, { shouldDirty: false })

      if (data.department_id && data.department_id !== current.department_id)
        setValue('department_id', data.department_id, { shouldDirty: false })
    },
    [setValue, getValues]
  )

  const [isLoading, setIsLoading] = useState(false)
  const selectedStatuses = watch('status')

  const handleCheckboxChange = (field: 'status', value: string, checked: boolean) => {
    const current = watch(field) || []
    if (checked) {
      setValue(field, [...current, value])
    } else {
      setValue(
        field,
        current.filter((v) => v !== value)
      )
    }
  }

  const onSubmit = async (_data: RecruitmentRequestFilterFormValues) => {
    setIsLoading(true)
    try {
      // Gửi API filter (nếu có)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={isLoading}>
      <Flex direction="column" gap="5">
        {/* Date range */}
        <div className="flex flex-col gap-2 space-y-2">
          <label className="typo-body-base-semibold text-content-dark-2 mb-0">
            Khoảng thời gian
          </label>
          <FormController
            name="date_range"
            control={control}
            register={register}
            Field={DateRangePicker}
            fieldProps={{ className: 'w-full' }}
          />
        </div>

        {/* CascadeSelectGroupOrganization */}
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: initialValues?.branch_id?.toString(),
                  block: initialValues?.block_id?.toString(),
                  department: initialValues?.department_id?.toString(),
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          skipValidation
          showEmployee={false}
        />

        {/* Recruitment Type */}
        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Loại tuyển dụng</label>
          <FormController
            name="recruitment_type"
            control={control}
            register={register}
            Field={Select}
            fieldProps={{
              options: recruitmentTypeOptions,
              placeholder: 'Chọn loại tuyển dụng',
              clearable: true,
            }}
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
          <div className="flex flex-wrap gap-[26px]">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={selectedStatuses?.includes(option.value)}
                  onCheckedChange={(checked: any) =>
                    handleCheckboxChange('status', option.value, Boolean(checked))
                  }
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

RecruitmentRequestFilterForm.displayName = 'RecruitmentRequestFilterForm'
export default RecruitmentRequestFilterForm
