import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect } from 'react'
import { Flex } from '@radix-ui/themes'
import {
  type CategoryFormData,
  categorySchema,
} from '@/features/elibrary/category/_shares/schemas/category.schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextField, TextArea, RadioGroup } from '@/components/ui'
import {
  useCreateElibraryCategory,
  useUpdateElibraryCategory,
  LibraryCategoryRead,
} from '@/services/elibrary-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'

interface CategoryFormProps {
  initialData?: LibraryCategoryRead
  onSuccess?: () => void
  onCancel?: () => void
}

const CategoryForm = ({ initialData, onSuccess, onCancel }: CategoryFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createMutation = useCreateElibraryCategory()
  const updateMutation = useUpdateElibraryCategory()

  const mutation = isEditMode ? updateMutation : createMutation

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || null,
      is_active: initialData?.is_active ?? true,
    },
    shouldFocusError: false, // Disable default focus to use custom scroll
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = form

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || null,
        is_active: initialData.is_active ?? true,
      })
    }
  }, [initialData, reset])

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  const onSubmit = useCallback(
    async (data: CategoryFormData) => {
      try {
        const apiData = {
          name: data.name,
          description: data.description || undefined,
          is_active: data.is_active,
        }

        if (isEditMode && initialData?.id) {
          await updateMutation.mutateAsync({ id: initialData.id, data: apiData })
          toastService.success('Đã cập nhật danh mục thành công')
        } else {
          await createMutation.mutateAsync(apiData)
          toastService.success('Đã tạo danh mục thành công')
        }
        onSuccess?.()
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [isEditMode, updateMutation, createMutation, onSuccess, initialData, form]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Thêm'), [isEditMode])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <FormController
          register={register}
          name="name"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Tên danh mục',
            required: true,
            placeholder: 'Nhập tên danh mục',
            maxLength: 255,
            showCharacterCount: true,
            disabled: mutation.isPending,
          }}
        />

        <FormController
          register={register}
          name="description"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Mô tả',
            required: false,
            placeholder: 'Nhập mô tả',
            rows: 4,
            maxCharacters: 500,
            disabled: mutation.isPending,
          }}
        />

        <FormController
          register={register}
          name="is_active"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            label: 'Trạng thái hoạt động',
            disabled: mutation.isPending,
            options: [
              { value: 'true', label: 'Hoạt động' },
              { value: 'false', label: 'Ngừng hoạt động' },
            ],
            orientation: 'horizontal',
            value: String(watch('is_active')),
            onChange: (v: string) => setValue('is_active', v === 'true', { shouldDirty: true }),
          }}
        />

        {/* Action Buttons */}
        <Flex gap="4" align="center" justify="end" width="100%" className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="w-[120px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            className="w-[120px]"
          >
            {submitButtonText}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default CategoryForm
