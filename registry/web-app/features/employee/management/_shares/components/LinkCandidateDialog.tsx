import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Select } from '@/components/ui'
import type { Employee } from '@/features/employee/services/employee-service'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useRecruitmentCandidateSelect } from '@/hooks/useRecruitmentCandidateSelect'
import { PAGE_SIZE } from '@/constants/table.ts'

const linkCandidateSchema = z.object({
  candidate_id: z
    .number({ required_error: 'Vui lòng chọn ứng viên' })
    .min(1, 'Vui lòng chọn ứng viên'),
  onboarding_date: z.string().min(1, 'Ngày bắt đầu làm việc là bắt buộc'),
})

export type LinkCandidateFormData = z.infer<typeof linkCandidateSchema>

export type LinkCandidateDialogRef = {
  submit: () => Promise<void>
}

type LinkCandidateDialogProps = {
  employee: Employee
  onSubmit?: (data: LinkCandidateFormData, setError: any) => Promise<void>
}

const LinkCandidateDialog = forwardRef<LinkCandidateDialogRef, LinkCandidateDialogProps>(
  function LinkCandidateDialog({ employee, onSubmit }, ref) {
    const { loadRecruitmentCandidateOptions, loadInitialRecruitmentCandidateOptions } =
      useRecruitmentCandidateSelect({
        pageSize: PAGE_SIZE,
        additionalParams: { is_employee_created: false },
      })

    const { control, register, handleSubmit, trigger, setError } = useForm<LinkCandidateFormData>({
      resolver: zodResolver(linkCandidateSchema),
      defaultValues: {
        candidate_id: undefined,
        onboarding_date: employee.start_date
          ? format(new Date(employee.start_date), DATE_FORMAT)
          : '',
      },
      mode: 'onSubmit',
    })

    const handleFormSubmit = async (data: LinkCandidateFormData) => {
      if (onSubmit) {
        await onSubmit(data, setError)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: async () => {
        const isValid = await trigger(['candidate_id', 'onboarding_date'])
        if (!isValid) {
          const validationError = new Error('Validation failed')
          ;(validationError as any).isValidationError = true
          throw validationError
        }
        await handleSubmit(handleFormSubmit)()
      },
    }))

    return (
      <div className="flex flex-col gap-4 p-6">
        <FormController
          register={register}
          name="candidate_id"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Ứng viên liên kết',
            required: true,
            placeholder: 'Nhập/chọn mã hoặc tên ứng viên',
            loadOptions: loadRecruitmentCandidateOptions,
            loadInitialOptions: loadInitialRecruitmentCandidateOptions,
            pageSize: PAGE_SIZE,
            searchPlaceholder: 'Tìm kiếm ứng viên...',
            enableSearch: true,
            debounceMs: 300,
          }}
        />
        <FormController
          register={register}
          name="onboarding_date"
          control={control}
          Field={DatePicker}
          fieldProps={{
            label: 'Ngày bắt đầu làm việc',
            required: true,
            placeholder: 'DD/MM/YYYY',
            allowManualInput: true,
          }}
        />
      </div>
    )
  }
)

export default LinkCandidateDialog
