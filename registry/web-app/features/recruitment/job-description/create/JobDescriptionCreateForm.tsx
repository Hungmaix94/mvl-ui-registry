import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import {
  type JobDescriptionCreateFormData,
  jobDescriptionCreateSchema,
} from '@/features/recruitment/job-description/_shares/schemas/job-description-create-schema.ts'
import {
  type JobDescriptionRequest,
  useCreateJobDescription,
  type JobDescription,
} from '@/features/recruitment/services/job-description-service'
import Form from '@/components/ui/form/Form.tsx'
import { FormController } from '@/components/ui/form'
import { Button, RichText, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import { Flex } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

const JobDescriptionCreateForm = ({
  initialData,
  isCopyMode = false,
  onSuccess,
  onCancel,
}: {
  initialData?: JobDescription
  isCopyMode?: boolean
  onSuccess?: (newId?: number) => void
  onCancel?: () => void
}) => {
  const createJobDescriptionMutation = useCreateJobDescription()

  // Prepare default values from initialData if in copy mode
  const defaultValues = useMemo<JobDescriptionCreateFormData>(() => {
    if (initialData && isCopyMode) {
      return {
        title: initialData.title || '',
        position_title: initialData.position_title || '',
        responsibility: initialData.responsibility || '',
        requirement: initialData.requirement || '',
        preferred_criteria: initialData.preferred_criteria || '',
        benefit: initialData.benefit || '',
        proposed_salary: initialData.proposed_salary || '',
        note: initialData.note || '',
        attachment: '', // Don't copy file attachment - user needs to upload new one
      }
    }

    return {
      title: '',
      position_title: '',
      responsibility: '',
      requirement: '',
      preferred_criteria: '',
      benefit: '',
      proposed_salary: '',
      note: '',
      attachment: '',
    }
  }, [initialData, isCopyMode])

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitted, errors },
    setError,
  } = useForm<JobDescriptionCreateFormData>({
    resolver: zodResolver(jobDescriptionCreateSchema),
    defaultValues,
    mode: 'onChange', // Enable validation on change so form validates immediately with initial data
    shouldFocusError: false, // Disable default focus to use custom scroll
  })

  // Auto-scroll to first error field when form is submitted and has errors
  useScrollToError(errors, { autoScroll: isSubmitted })

  const onSubmit = useCallback(
    async (data: JobDescriptionCreateFormData) => {
      try {
        // Send file token directly to backend (backend will handle file confirmation)
        const formData: JobDescriptionRequest = {
          title: data.title,
          position_title: data.position_title,
          responsibility: data.responsibility,
          requirement: data.requirement,
          preferred_criteria: data.preferred_criteria,
          benefit: data.benefit,
          proposed_salary: data.proposed_salary,
          note: data.note,
          files: {
            attachment: data.attachment, // file_token string
          },
        }

        const response = await createJobDescriptionMutation.mutateAsync(formData)

        if (isCopyMode) {
          toastService.success('Sao chép mô tả công việc thành công!')
          // Pass the new ID to onSuccess for navigation to edit page
          onSuccess?.(response?.id)
        } else {
          toastService.success('Tạo mô tả công việc thành công!')
          onSuccess?.()
        }
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [createJobDescriptionMutation, isCopyMode, onSuccess]
  )

  return (
    <Form handleSubmit={handleSubmit} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Title Field */}
        <FormController
          register={register}
          name="title"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Tiêu đề',
            required: true,
            placeholder: 'Nhập tiêu đề',
            maxLength: 250,
            showCharacterCount: true,
          }}
        />

        {/* Position Title Field */}
        <FormController
          register={register}
          name="position_title"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Vị trí tuyển dụng',
            required: true,
            placeholder: 'Nhập vị trí tuyển dụng',
            maxLength: 250,
            showCharacterCount: true,
          }}
        />

        {/* Responsibility Field - RichText */}
        <FormController
          register={register}
          name="responsibility"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Mô tả công việc',
            required: true,
            placeholder: 'Nhập tóm tắt công việc',
            rows: 4,
            maxCharacters: 500,
          }}
        />

        {/* Requirement Field - RichText */}
        <FormController
          register={register}
          name="requirement"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Yêu cầu',
            required: true,
            placeholder: 'Nhập yêu cầu',
            rows: 4,
            maxCharacters: 500,
          }}
        />

        {/* Preferred Criteria Field - RichText (Optional) */}
        <FormController
          register={register}
          name="preferred_criteria"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Tiêu chí ưu tiên',
            required: false,
            placeholder: 'Nhập tiêu chí ưu tiên',
            rows: 4,
            maxCharacters: 500,
          }}
        />

        {/* Benefit Field - RichText */}
        <FormController
          register={register}
          name="benefit"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Quyền lợi',
            required: true,
            placeholder: 'Nhập quyền lợi',
            rows: 4,
            maxCharacters: 500,
          }}
        />

        {/* Proposed Salary Field */}
        <FormController
          register={register}
          name="proposed_salary"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mức lương đề xuất chung',
            required: true,
            placeholder: 'Nhập mức lương đề xuất',
            maxLength: 50,
            showCharacterCount: true,
          }}
        />

        {/* Note Field - TextArea (Optional) */}
        <FormController
          register={register}
          name="note"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            required: false,
            placeholder: 'Nhập ghi chú',
            rows: 4,
            maxCharacters: 500,
          }}
        />

        {/* Separator */}
        <SeparatorHorizontal />

        {/* File Upload */}
        <FormController
          register={register}
          name="attachment"
          control={control}
          Field={FileUpload}
          fieldProps={{
            hiddenDescription: true,
            required: false,
            accept: [
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
          }}
        />

        {/* Action Buttons */}
        <Flex gap="4" align="center" justify="end" width="100%" mt="8">
          <Button
            type="button"
            variant="secondary"
            size="large"
            onClick={onCancel}
            disabled={createJobDescriptionMutation.isPending}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={createJobDescriptionMutation.isPending || isSubmitting}
            loading={isSubmitting || createJobDescriptionMutation.isPending}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default JobDescriptionCreateForm
