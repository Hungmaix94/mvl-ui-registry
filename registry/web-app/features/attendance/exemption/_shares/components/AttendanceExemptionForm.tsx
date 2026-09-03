import { forwardRef, useCallback, useImperativeHandle, useMemo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectGroupRef,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { AttendanceExemption } from '@/features/attendance/services/attendance-exemption-service'

const attendanceExemptionSchema = z
  .object({
    branch_id: z.number(),
    block_id: z.number(),
    department_id: z.number(),
    employee_id: z.number().min(1, 'Vui lòng chọn nhân viên'),
    effective_date: z.preprocess(
      (val) => {
        if (!val || val === '' || val === null) return undefined
        if (val instanceof Date) return val
        if (typeof val === 'string') {
          // Handle DD/MM/YYYY format from DatePicker
          if (val.includes('/')) {
            const [day, month, year] = val.split('/')
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          return new Date(val)
        }
        return val
      },
      z.date({
        required_error: 'Ngày hiệu lực là bắt buộc',
        invalid_type_error: 'Ngày hiệu lực là bắt buộc',
      })
    ),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      return (
        data.branch_id > 0 && data.block_id > 0 && data.department_id > 0 && data.employee_id > 0
      )
    },
    {
      message: 'Vui lòng chọn đầy đủ Chi nhánh, Khối, Phòng ban và Nhân viên',
      path: ['employee_id'],
    }
  )

type AttendanceExemptionFormData = z.infer<typeof attendanceExemptionSchema>

export interface AttendanceExemptionFormProps {
  onSubmit: (data: AttendanceExemptionFormData) => Promise<void>
  initialData?: AttendanceExemption
}

export interface AttendanceExemptionFormRef {
  handleFormSubmit: () => void
}

export const AttendanceExemptionForm = forwardRef<
  AttendanceExemptionFormRef,
  AttendanceExemptionFormProps
>(function AttendanceExemptionForm({ onSubmit, initialData }, ref) {
  const getDefaultValues = useMemo(() => {
    if (initialData) {
      return {
        branch_id: initialData.employee.branch?.id || 0,
        block_id: initialData.employee.block?.id || 0,
        department_id: initialData.employee.department?.id || 0,
        employee_id: initialData.employee.id || 0,
        effective_date: initialData.effective_date
          ? new Date(initialData.effective_date)
          : (undefined as any),
        notes: initialData.notes || '',
      }
    }
    return {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: 0,
      effective_date: undefined as any,
      notes: '',
    }
  }, [initialData])

  const form = useForm<AttendanceExemptionFormData>({
    resolver: zodResolver(attendanceExemptionSchema) as any,
    mode: 'onTouched',
    defaultValues: getDefaultValues as any,
  })

  // Reset form when initialData changes (when dialog opens with data)
  useEffect(() => {
    form.reset(getDefaultValues, { keepDefaultValues: false })
  }, [form, getDefaultValues])

  const { setValue, watch, handleSubmit } = form

  // Ref for cascade select to access reset methods if needed
  const cascadeSelectRef = useRef<CascadeSelectGroupRef>(null)

  useImperativeHandle(ref, () => ({
    handleFormSubmit: async () => {
      return new Promise<void>((resolve, reject) => {
        handleSubmit(
          async (data) => {
            try {
              await onSubmit(data)
              resolve()
            } catch (error) {
              reject(error)
            }
          },
          () => {
            // Validation failed - reject with validation error to prevent dialog closing
            const validationError: any = new Error('Validation failed')
            validationError.isValidationError = true
            reject(validationError)
          }
        )()
      })
    },
  }))

  // Handle cascade form changes - component now automatically resets employee when dependencies change
  const handleCascadeFormChange = useCallback(
    (data: CascadeSelectFormData) => {
      // Sync form values with cascade select changes
      setValue('branch_id', (data.branch_id ?? 0) > 0 ? data.branch_id! : 0, {
        shouldDirty: true,
      })
      setValue('block_id', (data.block_id ?? 0) > 0 ? data.block_id! : 0, {
        shouldDirty: true,
      })
      setValue('department_id', (data.department_id ?? 0) > 0 ? data.department_id! : 0, {
        shouldDirty: true,
      })
      // Employee will be automatically reset by component when dependencies change
      setValue('employee_id', (data.employee_id ?? 0) > 0 ? data.employee_id! : 0, {
        shouldDirty: true,
      })
    },
    [setValue]
  )

  // Handle employee selection - component will auto-populate other fields
  const handleEmployeeSelect = useCallback(
    (employee: any) => {
      if (employee) {
        setValue('employee_id', employee.id, { shouldDirty: true })
      }
    },
    [setValue]
  )

  const getCascadeInitialValues = useMemo(() => {
    // Only use initialData for initial values, component will manage its own state
    if (initialData) {
      return {
        branch: initialData.employee.branch?.id?.toString(),
        block: initialData.employee.block?.id?.toString(),
        department: initialData.employee.department?.id?.toString(),
        employee: initialData.employee.id?.toString(),
        position: initialData.employee.position?.id?.toString(),
      }
    }
    return {
      branch: undefined,
      block: undefined,
      department: undefined,
      employee: undefined,
      position: undefined,
    }
  }, [initialData])

  const effectiveDateValue = watch('effective_date')

  const handleDateChange = useCallback(
    (value: string | undefined | null) => {
      // DatePicker returns string in DD/MM/YYYY format, schema will preprocess it to Date
      if (value) {
        // Parse DD/MM/YYYY to Date for form state
        const [day, month, year] = value.split('/')
        const dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        setValue('effective_date', dateValue, { shouldDirty: true, shouldValidate: true })
      } else {
        // For required field, we shouldn't allow clearing, but handle it gracefully
        setValue('effective_date', undefined as any, { shouldDirty: true, shouldValidate: true })
      }
    },
    [setValue]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<AttendanceExemptionFormData>
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        loading={false}
      >
        <div className="flex flex-col gap-5">
          {/* Cascade Select Group */}
          <CascadeSelectGroupOrganization
            ref={cascadeSelectRef}
            initialValues={getCascadeInitialValues}
            onFormChange={handleCascadeFormChange}
            onEmployeeSelect={handleEmployeeSelect}
            showEmployee={true}
            showPosition={true}
            employeeRequired={true}
            employeeLabel="Nhân viên"
            layout="grid"
            formErrors={form.formState.errors}
            className="gap-5"
          />

          {/* Effective Date */}
          <div className="flex flex-col gap-2">
            <DatePicker
              label="Ngày hiệu lực"
              required
              placeholder="DD/MM/YYYY"
              value={effectiveDateValue ? new Date(effectiveDateValue) : undefined}
              onChange={handleDateChange}
              error={form.formState.errors.effective_date?.message}
              clearable={true}
            />
          </div>
        </div>
      </Form>
    </div>
  )
})
