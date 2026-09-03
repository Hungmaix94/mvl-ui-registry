import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef } from 'react'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'

import {
  type JobDescription,
  type JobDescriptionRequest,
  useUpdateJobDescription,
} from '@/features/recruitment/services/job-description-service'
import Form from '@/components/ui/form/Form.tsx'
import { FormController } from '@/components/ui/form'
import { Button, TextArea, TextField, RichText } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import { Flex } from '@radix-ui/themes'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import {
  JobDescriptionEditFormData,
  jobDescriptionEditSchema,
} from '@/features/recruitment/job-description/_shares/schemas/job-description-edit-schema.ts'

interface JobDescriptionEditFormProps {
  initialData: JobDescription
  onSuccess?: () => void
  onCancel?: () => void
}

const JobDescriptionEditForm = ({
  initialData,
  onSuccess,
  onCancel,
}: JobDescriptionEditFormProps) => {
  const updateJobDescriptionMutation = useUpdateJobDescription()
  const isInitialized = useRef(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, isSubmitted, errors },
    setError,
  } = useForm<JobDescriptionEditFormData>({
    resolver: zodResolver(jobDescriptionEditSchema),
    defaultValues: {
      code: initialData.code || '',
      title: initialData.title || '',
      position_title: initialData.position_title || '',
      responsibility: initialData.responsibility || '',
      requirement: initialData.requirement || '',
      preferred_criteria: initialData.preferred_criteria || '',
      benefit: initialData.benefit || '',
      proposed_salary: initialData.proposed_salary || '',
      note: initialData.note || '',
      attachment: initialData.attachment?.file_path || '',
    },
  })

  // Set form values when initialData changes
  useEffect(() => {
    if (!isInitialized.current) {
      setValue('title', initialData.title || '')
      setValue('position_title', initialData.position_title || '')
      setValue('responsibility', initialData.responsibility || '')
      setValue('requirement', initialData.requirement || '')
      setValue('preferred_criteria', initialData.preferred_criteria || '')
      setValue('benefit', initialData.benefit || '')
      setValue('proposed_salary', initialData.proposed_salary || '')
      setValue('note', initialData.note || '')
      setValue('attachment', initialData.attachment?.file_path || '')

      isInitialized.current = true
    }
  }, [initialData, setValue])

  // Auto-scroll to first error field when form is submitted and has errors
  useScrollToError(errors, { autoScroll: isSubmitted })

  const onSubmit = useCallback(
    async (data: JobDescriptionEditFormData) => {
      try {
        // Determine if we should include files in payload
        // Only include files when:
        // 1. User uploaded new file (attachment is a file_token, not file_path)
        // 2. User removed file (attachment is empty, but initial had file)
        // Do NOT include when file is unchanged (attachment is still file_path)
        const initialAttachmentPath = initialData.attachment?.file_path || ''
        const currentAttachment = data.attachment || ''

        // Check if attachment is a file_path (unchanged) vs file_token (new upload)
        const isFilePath = currentAttachment.startsWith('uploads/')
        const isFileRemoved = !currentAttachment && initialAttachmentPath
        const isNewFile =
          currentAttachment && !isFilePath && currentAttachment !== initialAttachmentPath

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
          // Only include files if user uploaded new file or removed file
          ...((isNewFile || isFileRemoved) && {
            files: {
              attachment: currentAttachment || undefined, // file_token string or undefined if removed
            },
          }),
        }

        await updateJobDescriptionMutation.mutateAsync({
          id: initialData.id,
          data: formData,
        })

        toastService.success('Cập nhật mô tả công việc thành công!')
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [updateJobDescriptionMutation, onSuccess, initialData.id, initialData.attachment]
  )

  return (
    <Form handleSubmit={handleSubmit} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <FormController
          register={register}
          name="code"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mã JD',
            required: true,
            placeholder: 'Mã JD',
            name: 'code',
            type: 'text',
            disabled: true, // Readonly field
          }}
        />

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
            existingFile: initialData.attachment,
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
            disabled={updateJobDescriptionMutation.isPending}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={updateJobDescriptionMutation.isPending || isSubmitting}
            loading={isSubmitting || updateJobDescriptionMutation.isPending}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default JobDescriptionEditForm
