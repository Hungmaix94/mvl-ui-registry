import { useMemo } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, ColumnDef, RadioGroup, Table, TextArea } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { handleApiError } from '@/utils/error-utils'
import { DepartmentKPIAssessmentList } from '@/features/kpi/services/kpi-assessment-service'
import {
  kpiUnitEvaluationFormSchema,
  KPIUnitEvaluationFormValues,
  KPIGradeType,
} from '../_shares/types/kpi-unit-evaluation-form-types'

type EmployeeTableRow = {
  leader_code: string
  leader_name: string
  department_name: string
}

type KPIUnitEvaluationEditFormProps = {
  employeeCode: string
  employeeName: string
  departmentName: string
  initialGrade?: DepartmentKPIAssessmentList['grade']
  initialNote?: string
  onSubmit: (data: KPIUnitEvaluationFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export const KPIUnitEvaluationEditForm = ({
  employeeCode,
  employeeName,
  departmentName,
  initialGrade = 'A',
  initialNote = '',
  onSubmit,
  onCancel,
  isSubmitting = false,
}: KPIUnitEvaluationEditFormProps) => {
  const form = useForm<KPIUnitEvaluationFormValues>({
    resolver: zodResolver(kpiUnitEvaluationFormSchema),
    defaultValues: {
      grade: initialGrade,
      note: initialNote,
    },
  })

  const { register, control, setError } = form

  const gradeOptions: Array<{ value: KPIGradeType; label: string }> = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
  ]

  const columns = useMemo<ColumnDef<EmployeeTableRow>[]>(
    () => [
      {
        accessorKey: 'leader_code',
        header: 'Mã NV',
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'leader_name',
        header: 'Họ và tên',
        meta: {
          width: 'w-64',
        },
      },
      {
        accessorKey: 'department_name',
        header: 'Phòng ban',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
    ],
    []
  )

  const handleFormSubmit: SubmitHandler<KPIUnitEvaluationFormValues> = async (values) => {
    try {
      await onSubmit(values)
    } catch (error: unknown) {
      // Handle API errors and set field errors using handleApiError
      handleApiError(error, setError)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col gap-6 px-10 py-4">
      {/* Employee Information */}
      <div className="flex flex-col gap-4">
        <div className="typo-body-base-semibold text-content-dark-2">Thông tin nhân viên</div>
        <Table<EmployeeTableRow>
          data={[
            {
              leader_code: employeeCode,
              leader_name: employeeName,
              department_name: departmentName,
            },
          ]}
          showSTT={false}
          enablePagination={false}
          columns={columns}
          className="p-0"
        />
      </div>

      {/* KPI Rating */}
      <div className="flex flex-col gap-2">
        <FormController
          register={register}
          name="grade"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            id: 'kpi-grade',
            label: 'Xếp loại KPI',
            required: true,
            options: gradeOptions,
            disabled: isSubmitting,
          }}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <FormController
          register={register}
          name="note"
          control={control}
          Field={TextArea}
          fieldProps={{
            id: 'note',
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
            disabled: isSubmitting,
            maxCharacters: 250,
            rows: 4,
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-[150px]"
        >
          Hủy
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="w-[150px]"
        >
          Lưu
        </Button>
      </div>
    </form>
  )
}
