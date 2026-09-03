import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type PositionCreateFormData,
  positionCreateSchema,
} from '@/features/org/position/_shares/schemas/position-create-schema.ts'
import {
  positionEditSchema,
  type PositionEditFormData,
} from '@/features/org/position/_shares/schemas/position-edit-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, Checkbox, RadioGroup, TextArea, TextField } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  type Position,
  type PositionRequest,
  useCreatePosition,
  useUpdatePosition,
} from '@/features/org/services/position-service'
import { useCallback, useMemo } from 'react'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { FormCaption } from '@/components/ui/form'

interface PositionFormProps {
  initialData?: Position & { id: number }
  onSuccess?: () => void
  onCancel?: () => void
}

type PositionFormData = PositionCreateFormData | PositionEditFormData

const PositionForm = ({ initialData, onSuccess, onCancel }: PositionFormProps) => {
  const isEdit = !!initialData
  const createPositionMutation = useCreatePosition()
  const updatePositionMutation = useUpdatePosition()

  const mutation = isEdit ? updatePositionMutation : createPositionMutation
  const schema = isEdit ? positionEditSchema : positionCreateSchema

  const includeInEmployeeReportOptions = useMemo(
    () => [
      { value: true, label: 'Có' },
      { value: false, label: 'Không' },
    ],
    []
  )

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PositionFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          description: initialData.description || '',
          is_leadership: (initialData as any).is_leadership || false,
          include_in_employee_report: (initialData as any).include_in_employee_report ?? true,
        }
      : {
          name: '',
          description: '',
          is_leadership: false,
          include_in_employee_report: true,
        },
    shouldFocusError: true,
  })

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  const onSubmit = useCallback(
    async (data: PositionFormData) => {
      try {
        const apiData: PositionRequest = {
          name: data.name,
          description: data.description || undefined,
          is_leadership: data.is_leadership,
          include_in_employee_report: data.include_in_employee_report,
        }

        if (isEdit) {
          await updatePositionMutation.mutateAsync({ id: initialData!.id, data: apiData })
          toastService.success('Đã chỉnh sửa thành công')
        } else {
          await createPositionMutation.mutateAsync(apiData)
          toastService.success('Tạo mới thành công')
        }
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [isEdit, createPositionMutation, updatePositionMutation, initialData, onSuccess, setError]
  )

  return (
    <Form
      key={`position-form-${initialData?.id || 'create'}`}
      loading={mutation.isPending}
      onSubmit={onSubmit}
      handleSubmit={handleSubmit}
    >
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Fields */}
        <Flex direction="column" gap="4">
          {/* Tên chức vụ */}
          <Flex direction="row" gap="5" className="w-full">
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="name"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tên chức vụ',
                  required: true,
                  placeholder: 'Nhập tên chức vụ',
                  autoFocus: true,
                  name: 'name',
                  type: 'text',
                  error: errors.name?.message,
                  disabled: mutation.isPending,
                }}
              />
            </Flex>
          </Flex>

          {/* Mã chức vụ - chỉ hiển thị trong edit mode */}
          {isEdit && (
            <Flex direction="column" gap="2">
              <FormController
                register={register}
                name="code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã chức vụ',
                  required: true,
                  placeholder: 'Mã chức vụ',
                  name: 'code',
                  type: 'text',
                  error: (errors as any).code?.message,
                  disabled: true, // Readonly field
                }}
              />
            </Flex>
          )}

          {/* Mô tả */}
          <Flex direction="column" gap="2">
            <FormController
              register={register}
              name="description"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Mô tả',
                required: false,
                placeholder: 'Nhập mô tả về chức vụ',
                name: 'description',
                rows: 4,
                error: errors.description?.message,
                disabled: mutation.isPending,
              }}
            />
          </Flex>

          {/* Ban lãnh đạo và Tính vào báo cáo nhân sự */}
          <Flex direction="row" gap="5" className="w-full">
            <Flex direction="column" gap="2" className="flex-1">
              <label className="typo-body-base-semibold text-content-dark-2 mb-0">
                Ban lãnh đạo
              </label>
              <Flex align="center" gap="2">
                <Controller
                  name="is_leadership"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                      disabled={mutation.isPending}
                    />
                  )}
                />
                <span className="typo-body-base-regular text-content-dark-1">Có</span>
              </Flex>
              <FormCaption error={errors?.is_leadership?.message} disabled={false} />
            </Flex>
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="include_in_employee_report"
                control={control}
                Field={RadioGroup}
                fieldProps={{
                  label: 'Tính vào báo cáo nhân sự',
                  required: true,
                  options: includeInEmployeeReportOptions,
                  error: errors.include_in_employee_report?.message,
                  disabled: mutation.isPending,
                }}
              />
            </Flex>
          </Flex>
        </Flex>

        {/* Action Buttons */}
        <Flex gap="4" justify="end" className="pt-10">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            className="w-[150px]"
          >
            {isEdit ? 'Lưu' : 'Tạo mới'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default PositionForm
