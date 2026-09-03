import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { format } from 'date-fns'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { Checkbox } from '@/components/ui/checkbox'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { EmployeeCertificateType } from '@/constants/api-schema-aliases'
export type EmployeeCertificateFilterFormRef = {
  clearForm: () => void
  getValues: () => EmployeeCertificateFilterApiParams
}

type EmployeeCertificateFilterFormProps = {
  initialValues?: {
    certificate_type?: string[]
    branch_id?: number
    block_id?: number
    department_id?: number
    position?: number
    employee?: number
    expiry_date_range?: { from?: Date; to?: Date } | null
    status?: string[]
  }
}

type TDateRange = {
  from?: Date
  to?: Date
}

type EmployeeCertificateFilterFormValues = {
  certificate_type?: string[]
  branch_id?: number
  block_id?: number
  department_id?: number
  position?: number
  employee?: number
  expiry_date_range?: TDateRange | null
  status?: string[]
}

// API params returned from getValues
type EmployeeCertificateFilterApiParams = {
  certificate_types?: string
  branch_id?: number
  block_id?: number
  department_id?: number
  position?: number
  employee?: number
  expiry_date_from?: string
  expiry_date_to?: string
  status?: string | string[]
}

const Schema = z.object({
  certificate_type: z.array(z.string()).optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position: z.number().optional(),
  employee: z.number().optional(),
  expiry_date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  status: z.array(z.string()).optional(),
})

const EmployeeCertificateFilterForm = forwardRef<
  EmployeeCertificateFilterFormRef,
  EmployeeCertificateFilterFormProps
>(({ initialValues }, ref) => {
  // Get certificate type and status options from constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE,
      APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.STATUS,
    ],
  })

  const certificateTypeOptions = useMemo(() => {
    const options = keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE) || []
      : []

    // Sort "other" to the end
    const OTHER_VALUE = EmployeeCertificateType.other
    const otherIndex = options.findIndex((opt) => opt.value === OTHER_VALUE)

    if (otherIndex > -1) {
      const otherOption = options[otherIndex]
      const otherOptions = options.filter((opt) => opt.value !== OTHER_VALUE)
      return [...otherOptions, otherOption]
    }

    return options
  }, [keysMapOptions])

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.STATUS) || []
      : []
  }, [keysMapOptions])

  const { control, reset, getValues, watch, setValue, register } =
    useForm<EmployeeCertificateFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        certificate_type: initialValues?.certificate_type || [],
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        position: initialValues?.position || undefined,
        employee: initialValues?.employee || undefined,
        expiry_date_range: initialValues?.expiry_date_range || null,
        status: initialValues?.status || [],
      },
    })

  const [formKey, setFormKey] = useState(0)

  // Reset form when initialValues change (dialog reopen)
  useEffect(() => {
    reset({
      certificate_type: initialValues?.certificate_type || [],
      branch_id: initialValues?.branch_id || undefined,
      block_id: initialValues?.block_id || undefined,
      department_id: initialValues?.department_id || undefined,
      position: initialValues?.position || undefined,
      employee: initialValues?.employee || undefined,
      expiry_date_range: initialValues?.expiry_date_range || null,
      status: initialValues?.status || [],
    })
  }, [initialValues, reset])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        certificate_type: [],
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        position: undefined,
        employee: undefined,
        expiry_date_range: null,
        status: [],
      })
      setFormKey((prev) => prev + 1)
    },
    getValues: () => {
      const values = getValues()

      // Transform form values to API params
      const apiParams: EmployeeCertificateFilterApiParams = {}

      // Certificate types - join multiple values with comma
      if (values.certificate_type && values.certificate_type.length > 0) {
        apiParams.certificate_types = values.certificate_type.join(',')
      }

      // Organization structure - for URL badge counting
      if (values.branch_id) {
        apiParams.branch_id = values.branch_id
      }
      if (values.block_id) {
        apiParams.block_id = values.block_id
      }
      if (values.department_id) {
        apiParams.department_id = values.department_id
      }

      // Position
      if (values.position) {
        apiParams.position = values.position
      }

      // Employee - this is the actual API filter
      if (values.employee) {
        apiParams.employee = values.employee
      }

      // Expiry date range
      if (values.expiry_date_range?.from) {
        apiParams.expiry_date_from = format(values.expiry_date_range.from, DATE_SERVER_FORMAT)
      }
      if (values.expiry_date_range?.to) {
        apiParams.expiry_date_to = format(values.expiry_date_range.to, DATE_SERVER_FORMAT)
      }

      // Status
      if (values.status && values.status.length > 0) {
        apiParams.status = values.status.length === 1 ? values.status[0] : values.status
      }

      return apiParams
    },
  }))

  const selectedStatuses = watch('status')

  // Handle cascade organization change
  const handleCascadeChange = useCallback(
    (data: any) => {
      const current = getValues()

      if (data.branch_id && data.branch_id !== 0 && current.branch_id !== data.branch_id) {
        setValue('branch_id', data.branch_id, { shouldDirty: false })
      } else if (data.branch_id === 0 || data.branch_id === undefined) {
        setValue('branch_id', undefined, { shouldDirty: false })
      }

      if (data.block_id && data.block_id !== 0 && current.block_id !== data.block_id) {
        setValue('block_id', data.block_id, { shouldDirty: false })
      } else if (data.block_id === 0 || data.block_id === undefined) {
        setValue('block_id', undefined, { shouldDirty: false })
      }

      if (
        data.department_id &&
        data.department_id !== 0 &&
        current.department_id !== data.department_id
      ) {
        setValue('department_id', data.department_id, { shouldDirty: false })
      } else if (data.department_id === 0 || data.department_id === undefined) {
        setValue('department_id', undefined, { shouldDirty: false })
      }

      // Handle position change
      if (data.position_id !== undefined) {
        const positionChanged = data.position_id !== current.position

        if (data.position_id && data.position_id !== 0 && positionChanged) {
          setValue('position', data.position_id, { shouldDirty: false })

          // Clear employee when position changes
          if (current.employee && String(current.employee) !== String(data.employee_id)) {
            setValue('employee', undefined, { shouldDirty: false })
          }
        } else if (data.position_id === 0 || data.position_id === undefined) {
          setValue('position', undefined, { shouldDirty: false })
        }
      }

      // Handle employee change
      if (data.employee_id !== undefined) {
        if (data.employee_id && data.employee_id !== 0 && current.employee !== data.employee_id) {
          setValue('employee', data.employee_id, { shouldDirty: false })
        } else if (data.employee_id === 0) {
          setValue('employee', undefined, { shouldDirty: false })
        }
      }
    },
    [setValue, getValues]
  )

  const handleCheckboxChange = (
    field: 'certificate_type' | 'status',
    value: string,
    checked: boolean
  ) => {
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

  return (
    <Flex direction="column" gap="5">
      {/* Certificate Type - Multi-select Combobox */}
      <div className="flex flex-col gap-2">
        <FormController
          name="certificate_type"
          control={control}
          register={register}
          Field={Select}
          fieldProps={{
            label: 'Loại bằng cấp, chứng chỉ',
            placeholder: 'Nhập/chọn',
            multiple: true,
            options: certificateTypeOptions,
            className: 'w-full',
            searchable: true,
            triggerVariant: 'chips',
          }}
        />
      </div>

      {/* Organization Structure - Row 1: Branch, Block, Department */}
      <CascadeSelectGroupOrganization
        key={formKey}
        initialValues={
          formKey === 0
            ? {
                branch: initialValues?.branch_id?.toString(),
                block: initialValues?.block_id?.toString(),
                department: initialValues?.department_id?.toString(),
                employee: initialValues?.employee?.toString(),
                position: initialValues?.position?.toString(),
              }
            : undefined
        }
        onFormChange={handleCascadeChange}
        showEmployee
        employeeLabel={'Nhân viên'}
        showPosition
        layout="grid"
        skipValidation={true}
        className="gap-5"
      />

      {/* Status - Horizontal layout */}
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

      {/* Expiry Date Range */}
      <div className="flex flex-col gap-2">
        <FormController
          name="expiry_date_range"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Khoảng thời gian còn hiệu lực',
            className: 'w-full',
            showQuickSelect: true,
          }}
        />
      </div>
    </Flex>
  )
})

EmployeeCertificateFilterForm.displayName = 'EmployeeCertificateFilterForm'

export default EmployeeCertificateFilterForm
