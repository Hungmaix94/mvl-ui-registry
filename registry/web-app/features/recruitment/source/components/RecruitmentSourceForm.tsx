import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect } from 'react'
import {
  type RecruitmentSourceFormData,
  recruitmentSourceSchema,
} from '../schemas/recruitment-source-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, Checkbox, TextArea, TextField } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import {
  type RecruitmentSource,
  useCreateRecruitmentSource,
  useUpdateRecruitmentSource,
} from '@/features/recruitment/services/recruitment-source-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { CheckedState } from '@radix-ui/react-checkbox'

interface RecruitmentSourceFormProps {
  initialData?: RecruitmentSource
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentSourceForm = ({
  initialData,
  onSuccess,
  onCancel,
}: RecruitmentSourceFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createSourceMutation = useCreateRecruitmentSource()
  const updateSourceMutation = useUpdateRecruitmentSource()

  const mutation = isEditMode ? updateSourceMutation : createSourceMutation

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: {},
    reset,
    setError,
  } = useForm<RecruitmentSourceFormData>({
    resolver: zodResolver(recruitmentSourceSchema),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      allow_referral: initialData?.allow_referral || false,
    },
    shouldFocusError: true, // Scroll to first error when validation fails
  })

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code,
        name: initialData.name,
        description: initialData.description,
        allow_referral: initialData.allow_referral,
      })
    }
  }, [initialData, reset])

  const onSubmit = useCallback(
    async (data: RecruitmentSourceFormData) => {
      try {
        const apiData = {
          name: data.name,
          description: data.description,
          allow_referral: data.allow_referral,
        }

        if (isEditMode && initialData?.id) {
          await updateSourceMutation.mutateAsync({ id: initialData?.id, data: apiData })
          toastService.success('Đã cập nhật thành công.')
        } else {
          await createSourceMutation.mutateAsync(apiData)
          toastService.success('Đã tạo thành công.')
        }
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, updateSourceMutation, createSourceMutation, onSuccess, initialData]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Tạo mới'), [isEditMode])

  const allow_referral = useWatch({ name: 'allow_referral', control })
  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section Title */}
        <Text className="typo-body-xl-semibold text-content-dark-1">
          Thông tin nguồn tuyển dụng
        </Text>

        {/* Fields */}
        <Flex direction="column" gap="4">
          {isEditMode && (
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã nguồn',
                  required: true,
                  placeholder: 'Mã nguồn',
                  name: 'code',
                  type: 'text',
                  disabled: true, // Readonly field
                }}
              />
            </Flex>
          )}

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên nguồn',
                required: true,
                placeholder: 'Nhập tên nguồn',
                name: 'name',
                type: 'text',
                disabled: mutation.isPending,
                showCharacterCount: true,
                maxLength: 250,
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="description"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Mô tả',
                required: true,
                placeholder: 'Nhập mô tả về nguồn tuyển dụng',
                name: 'description',
                rows: 4,
                disabled: mutation.isPending,
                maxCharacters: 500,
              }}
            />
          </Flex>

          <Flex direction="column" gap="3" className="flex-1">
            <label className="typo-body-base-semibold text-content-dark-2 block">
              Nguồn giới thiệu
            </label>

            <FormController
              register={register}
              name="allow_referral"
              control={control}
              Field={Checkbox}
              fieldProps={{
                label: 'Nguồn giới thiệu',
                disabled: mutation.isPending,
                checked: allow_referral,
                onCheckedChange: (checked: CheckedState) =>
                  setValue('allow_referral', !!checked, { shouldDirty: true }),
              }}
            />
          </Flex>
        </Flex>

        {/* Action Buttons */}
        <Flex gap="4" justify="end" className="pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="w-[150px]"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            className="w-[150px]"
          >
            {submitButtonText}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RecruitmentSourceForm
