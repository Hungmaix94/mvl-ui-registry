import { useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import {
  type EmployeeRelationshipRequest,
  type PatchedEmployeeRelationshipRequest,
  useCreateEmployeeRelationship,
  usePartialUpdateEmployeeRelationship,
  type EmployeeRelationship,
} from '@/features/employee/services/employee-relationship-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import {
  type RelationEditFormInput,
  relationEditSchema,
} from '@/features/employee/relation/_shares/schemas/relation-edit-schema.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { Flex, Separator } from '@radix-ui/themes'
import { formatDate } from '@/utils/date-utils.ts'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface RelationFormProps {
  initialData?: EmployeeRelationship
  onSuccess?: () => void
  onCancel?: () => void
}

type RelationFormData = RelationEditFormInput

export default function RelationForm({ initialData, onSuccess, onCancel }: RelationFormProps) {
  const navigate = useNavigate()
  const isEdit = !!initialData
  const createRelationMutation = useCreateEmployeeRelationship()
  const updateRelationMutation = usePartialUpdateEmployeeRelationship()
  const invalidateQueries = useInvalidateQueries()

  // Setup form
  const form = useForm<RelationFormData>({
    resolver: zodResolver(relationEditSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: initialData
      ? {
          employee_id: initialData.employee?.id,
          relative_name: initialData.relative_name || '',
          relation_type: initialData.relation_type,
          date_of_birth: initialData.date_of_birth ? formatDate(initialData.date_of_birth) : '',
          citizen_id: initialData.citizen_id || '', // Field name khớp với API
          occupation: initialData.occupation || '',
          tax_code: initialData.tax_code || '',
          phone: initialData.phone || '',
          address: initialData.address || '',
          note: initialData.note || '',
          attachment: initialData.attachment?.file_path || '',
        }
      : {
          employee_id: undefined,
          relative_name: '',
          relation_type: undefined,
          date_of_birth: undefined,
          citizen_id: '', // Field name khớp với API
          occupation: '',
          tax_code: '',
          phone: '',
          address: '',
          note: '',
          attachment: '',
        },
    shouldFocusError: true, // Auto-focus error field
  })

  const { handleSubmit, control, register, formState } = form
  const { errors, isSubmitting } = formState

  // Auto-scroll to first error field
  useScrollToError(errors)

  // Fetch relation type constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  const relationTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || [],
    [keysMapOptions]
  )

  const onSubmit = useCallback(
    async (data: RelationFormData) => {
      // Parse and transform form data using Zod schema
      const parsedData = relationEditSchema.parse(data)

      if (isEdit) {
        // Edit mode: Handle attachment logic
        const initialAttachmentPath = initialData!.attachment?.file_path || ''
        const currentAttachment = parsedData.attachment || ''

        // Check if attachment is a file_path (unchanged) vs file_token (new upload)
        const isFilePath = currentAttachment.startsWith('uploads/')
        const isFileRemoved = !currentAttachment && initialAttachmentPath
        const isNewFile =
          currentAttachment && !isFilePath && currentAttachment !== initialAttachmentPath

        // Build PatchedEmployeeRelationshipRequest payload
        const payload: PatchedEmployeeRelationshipRequest = {
          employee_id: parsedData.employee_id,
          relative_name: parsedData.relative_name,
          relation_type: parsedData.relation_type,
          date_of_birth: parsedData.date_of_birth || null,
          citizen_id: parsedData.citizen_id || undefined, // Field name đã khớp, không cần map
          occupation: parsedData.occupation || undefined,
          tax_code: parsedData.tax_code || undefined,
          address: parsedData.address || undefined,
          phone: parsedData.phone || undefined,
          note: parsedData.note || undefined,
          // Only include files if user uploaded new file or removed file
          ...((isNewFile || isFileRemoved) && {
            files: {
              attachment: currentAttachment || undefined, // file_token string or undefined if removed
            },
          }),
        }

        try {
          await updateRelationMutation.mutateAsync({
            id: initialData!.id,
            data: payload,
          })
          toastService.success('Cập nhật quan hệ thân nhân thành công')

          // Invalidate employee relationships list queries
          await invalidateQueries.invalidateByPrefix('hrm/employee-relationships')

          if (onSuccess) {
            onSuccess()
          } else {
            navigate(APP_PATH.EMPLOYEE_RELATION)
          }
        } catch (error: any) {
          handleApiError(error, form.setError) // Không cần fieldMap vì field names đã khớp
        }
      } else {
        // Create mode: Simple attachment handling
        const payload: EmployeeRelationshipRequest = {
          employee_id: parsedData.employee_id,
          relative_name: parsedData.relative_name,
          relation_type: parsedData.relation_type,
          date_of_birth: parsedData.date_of_birth || null,
          citizen_id: parsedData.citizen_id || undefined, // Field name đã khớp, không cần map
          occupation: parsedData.occupation || undefined,
          tax_code: parsedData.tax_code || undefined,
          address: parsedData.address || undefined,
          phone: parsedData.phone || undefined,
          note: parsedData.note || undefined,
          ...(parsedData.attachment && {
            files: {
              attachment: parsedData.attachment, // file_token string
            },
          }),
        }

        try {
          await createRelationMutation.mutateAsync(payload)
          toastService.success('Tạo quan hệ thân nhân thành công')

          // Invalidate employee relationships list queries
          await invalidateQueries.invalidateByPrefix('hrm/employee-relationships')

          if (onSuccess) {
            onSuccess()
          } else {
            navigate(APP_PATH.EMPLOYEE_RELATION)
          }
        } catch (error: any) {
          handleApiError(error, form.setError) // Không cần fieldMap vì field names đã khớp
        }
      }
    },
    [
      isEdit,
      initialData,
      createRelationMutation,
      updateRelationMutation,
      invalidateQueries,
      navigate,
      onSuccess,
      form,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(withRememberedSearch(APP_PATH.EMPLOYEE_RELATION))
    }
  }, [onCancel, navigate])

  return (
    <Form<RelationFormData>
      key={`relation-form-${initialData?.id || 'create'}`}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      loading={isSubmitting}
    >
      <Flex direction="column" gap="9" className="w-full px-10 py-0">
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
                />
              )}
            />
          </div>

          <Separator orientation="horizontal" className="!w-full" />

          {/* Section 2: Thông tin Quan hệ nhân thân */}
          <div className="space-y-5">
            <h3 className="text-content-dark-1 text-lg font-semibold">
              Thông tin Quan hệ nhân thân
            </h3>

            {/* Tên người thân */}
            <FormController
              register={register}
              name="relative_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên người thân',
                required: true,
                placeholder: 'Nhập tên người thân',
                maxLength: 100,
                showCharacterCount: true,
              }}
            />

            {/* Mối quan hệ + Ngày sinh + Số CMND/CCCD/Giấy khai sinh */}
            <div className="grid grid-cols-3 gap-5">
              <FormController
                register={register}
                name="relation_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Mối quan hệ',
                  required: true,
                  placeholder: 'Chọn mối quan hệ',
                  options: relationTypeOptions,
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

            {/* Nghề nghiệp + Mã số thuế + Số điện thoại */}
            <div className="grid grid-cols-3 gap-5">
              <FormController
                register={register}
                name="occupation"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Nghề nghiệp',
                  required: false,
                  placeholder: 'Nhập nghề nghiệp',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="tax_code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã số thuế',
                  required: false,
                  placeholder: 'Nhập mã số thuế',
                  maxLength: 20,
                  showCharacterCount: true,
                }}
              />
              <FormController
                register={register}
                name="phone"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số điện thoại',
                  required: false,
                  placeholder: 'Nhập số điện thoại',
                  maxLength: 10,
                  showCharacterCount: true,
                  prefix: <span className="text-content-dark-3 text-sm">+84</span>,
                }}
              />
            </div>

            {/* Địa chỉ */}
            <FormController
              register={register}
              name="address"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ',
                required: false,
                placeholder: 'Nhập địa chỉ',
                maxLength: 100,
                showCharacterCount: true,
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
                existingFile: isEdit ? initialData!.attachment : undefined,
                required: false,
                hiddenDescription: true,
                purpose: 'employee_relation',
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
