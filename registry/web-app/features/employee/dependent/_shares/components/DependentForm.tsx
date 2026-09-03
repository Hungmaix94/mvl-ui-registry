import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import {
  type EmployeeDependentRequest,
  type PatchedEmployeeDependentRequest,
  useCreateEmployeeDependent,
  usePartialUpdateEmployeeDependent,
  type EmployeeDependent,
} from '@/features/employee/services/employee-dependent-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import {
  type DependentCreateFormInput,
  dependentCreateSchema,
} from '@/features/employee/dependent/_shares/schemas/dependent-create-schema.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { Flex, Separator } from '@radix-ui/themes'
import { formatDate } from '@/utils/date-utils.ts'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface DependentFormProps {
  initialData?: EmployeeDependent
  onSuccess?: () => void
  onCancel?: () => void
}

export default function DependentForm({ initialData, onSuccess, onCancel }: DependentFormProps) {
  const navigate = useNavigate()
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createDependentMutation = useCreateEmployeeDependent()
  const updateDependentMutation = usePartialUpdateEmployeeDependent()
  const invalidateQueries = useInvalidateQueries()
  const isInitialized = useRef(false)

  // Setup form
  const form = useForm<DependentCreateFormInput>({
    resolver: zodResolver(dependentCreateSchema),
    defaultValues: {
      employee_id: initialData?.employee?.id,
      dependent_name: initialData?.dependent_name || '',
      relationship: initialData?.relationship,
      date_of_birth: initialData?.date_of_birth ? formatDate(initialData?.date_of_birth) : '',
      citizen_id: initialData?.citizen_id || '',
      tax_code: initialData?.tax_code || '',
      effective_date: initialData?.effective_date ? formatDate(initialData?.effective_date) : '',
      note: initialData?.note || '',
      attachment: initialData?.attachment?.file_path || '',
    },
  })

  const { handleSubmit, control, register, setValue, formState } = form
  const { isSubmitting } = formState

  // Set form values when initialData changes
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      setValue('employee_id', initialData.employee?.id)
      setValue('dependent_name', initialData.dependent_name || '')
      setValue('relationship', initialData.relationship)
      setValue(
        'date_of_birth',
        initialData.date_of_birth ? formatDate(initialData.date_of_birth) : ''
      )
      setValue('citizen_id', initialData.citizen_id || '')
      setValue('tax_code', initialData.tax_code || '')
      setValue(
        'effective_date',
        initialData.effective_date ? formatDate(initialData.effective_date) : ''
      )
      setValue('note', initialData.note || '')
      setValue('attachment', initialData.attachment?.file_path || '')
      isInitialized.current = true
    }
  }, [initialData, setValue])

  // Fetch relationship type constants - using the same constant key as EmployeeRelationship
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  const relationshipOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || [],
    [keysMapOptions]
  )

  const onSubmit = useCallback(
    async (data: DependentCreateFormInput) => {
      // Parse and transform form data using Zod schema
      const parsedData = dependentCreateSchema.parse(data)

      try {
        if (isEditMode && initialData?.id) {
          // Determine if we should include files in payload
          // Only include files when:
          // 1. User uploaded new file (attachment is a file_token, not file_path)
          // 2. User removed file (attachment is empty, but initial had file)
          // Do NOT include when file is unchanged (attachment is still file_path)
          const initialAttachmentPath = initialData.attachment?.file_path || ''
          const currentAttachment = parsedData.attachment || ''

          // Check if attachment is a file_path (unchanged) vs file_token (new upload)
          const isFilePath = currentAttachment.startsWith('uploads/')
          const isFileRemoved = !currentAttachment && initialAttachmentPath
          const isNewFile =
            currentAttachment && !isFilePath && currentAttachment !== initialAttachmentPath

          // Build PatchedEmployeeDependentRequest payload for update
          const payload: PatchedEmployeeDependentRequest = {
            employee_id: parsedData.employee_id,
            dependent_name: parsedData.dependent_name,
            relationship: parsedData.relationship,
            date_of_birth: parsedData.date_of_birth || null,
            citizen_id: parsedData.citizen_id || undefined,
            tax_code: parsedData.tax_code || undefined,
            effective_date: parsedData.effective_date || undefined,
            note: parsedData.note || undefined,
            // Only include files if user uploaded new file or removed file
            ...((isNewFile || isFileRemoved) && {
              files: {
                attachment: currentAttachment || undefined, // file_token string or undefined if removed
              },
            }),
          }

          await updateDependentMutation.mutateAsync({
            id: initialData.id,
            data: payload,
          })
          toastService.success('Cập nhật người phụ thuộc thành công')
        } else {
          // Build EmployeeDependentRequest payload for create
          const payload: EmployeeDependentRequest = {
            employee_id: parsedData.employee_id,
            dependent_name: parsedData.dependent_name,
            relationship: parsedData.relationship,
            date_of_birth: parsedData.date_of_birth || null,
            citizen_id: parsedData.citizen_id || undefined,
            tax_code: parsedData.tax_code || undefined,
            effective_date: parsedData.effective_date,
            note: parsedData.note || undefined,
            ...(parsedData.attachment && {
              files: {
                attachment: parsedData.attachment, // file_token string
              },
            }),
          }

          await createDependentMutation.mutateAsync(payload)
          toastService.success('Tạo người phụ thuộc thành công')
        }

        // Invalidate employee dependents list queries
        await invalidateQueries.invalidateByPrefix('hrm/employee-dependents')

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.EMPLOYEE_DEPENDENT)
        }
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [
      isEditMode,
      createDependentMutation,
      updateDependentMutation,
      invalidateQueries,
      navigate,
      onSuccess,
      form,
      initialData?.id,
      initialData?.attachment,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(withRememberedSearch(APP_PATH.EMPLOYEE_DEPENDENT))
    }
  }, [onCancel, navigate])

  return (
    <Form<DependentCreateFormInput>
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      loading={isSubmitting}
    >
      <Flex direction="column" gap="9" className="w-full">
        <Flex direction="column" gap="5" className="w-full">
          {/* Section 1: Thông tin nhân viên */}
          <div className="space-y-5">
            <h3 className="text-content-dark-1 text-lg font-semibold">Thông tin nhân viên</h3>

            <Controller
              name="employee_id"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <EmployeeSelectWithDialog
                  value={field.value}
                  onChange={field.onChange}
                  error={error?.message}
                  required
                  label="Nhân Viên"
                  disabled={isEditMode}
                />
              )}
            />
          </div>

          <Separator orientation="horizontal" className="!w-full" />

          {/* Section 2: Thông tin Người phụ thuộc */}
          <div className="space-y-5">
            <h3 className="text-content-dark-1 text-lg font-semibold">Thông tin Người phụ thuộc</h3>

            {/* Tên người phụ thuộc */}
            <FormController
              register={register}
              name="dependent_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên người phụ thuộc',
                required: true,
                placeholder: 'Nhập tên người phụ thuộc',
                maxLength: 100,
                showCharacterCount: true,
              }}
            />

            {/* Mối quan hệ + Ngày sinh + Số CMND/CCCD/Giấy khai sinh */}
            <div className="grid grid-cols-3 gap-5">
              <FormController
                register={register}
                name="relationship"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Mối quan hệ',
                  required: true,
                  placeholder: 'Chọn mối quan hệ',
                  options: relationshipOptions,
                }}
              />
              <FormController
                register={register}
                name="date_of_birth"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày sinh',
                  required: false,
                  placeholder: 'Chọn ngày sinh',
                  allowManualInput: true,
                }}
              />
              <FormController
                register={register}
                name="citizen_id"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số CMND/CCCD/Giấy khai sinh',
                  required: false,
                  placeholder: 'Nhập CMND/CCCD',
                  maxLength: 12,
                  showCharacterCount: true,
                }}
              />
            </div>

            {/* Mã số thuế */}
            <FormController
              register={register}
              name="tax_code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã số thuế',
                required: false,
                placeholder: 'Nhập mã số thuế',
                maxLength: 12,
                showCharacterCount: true,
              }}
            />

            {/* Ngày hiệu lực */}
            <FormController
              register={register}
              name="effective_date"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày hiệu lực',
                required: true,
                placeholder: 'Chọn ngày hiệu lực',
                allowManualInput: true,
              }}
            />

            {/* Ghi chú */}
            <FormController
              register={register}
              name="note"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                required: false,
                placeholder: 'Nhập ghi chú',
                maxCharacters: 500,
                showCharacterCount: true,
                rows: 4,
              }}
            />
          </div>

          <Separator orientation="horizontal" className="!w-full" />

          {/* Section 3: Tài liệu đính kèm */}
          <div className="space-y-5">
            <FormController
              register={register}
              name="attachment"
              control={control}
              Field={FileUpload}
              fieldProps={{
                existingFile: initialData?.attachment,
                required: false,
                hiddenDescription: true,
              }}
            />
          </div>
        </Flex>

        {/* Action Buttons */}
        <Flex gap="4" justify="end" className="w-full">
          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
