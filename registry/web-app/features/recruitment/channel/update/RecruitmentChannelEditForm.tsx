import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo } from 'react'
import {
  type RecruitmentChannelEditFormData,
  recruitmentChannelEditSchema,
} from '@/features/recruitment/channel/_shares/schemas/recruitment-channel-edit-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, TextField } from '@/components/ui'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import { Flex, Text } from '@radix-ui/themes'
import {
  type RecruitmentChannel,
  useUpdateRecruitmentChannel,
} from '@/features/recruitment/services/recruitment-channel-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

interface RecruitmentChannelEditFormProps {
  initialData: RecruitmentChannel
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentChannelEditForm = ({
  initialData,
  onSuccess,
  onCancel,
}: RecruitmentChannelEditFormProps) => {
  const updateChannelMutation = useUpdateRecruitmentChannel()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO],
  })
  const belongToOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CHANNEL.BELONG_TO) || []
      : []
  }, [keysMapOptions])

  const {
    register,
    control,
    handleSubmit,
    formState: {},
    setError,
  } = useForm<RecruitmentChannelEditFormData>({
    resolver: zodResolver(recruitmentChannelEditSchema),
    defaultValues: {
      code: initialData.code,
      name: initialData.name,
      belong_to: initialData.belong_to || undefined,
      description: initialData.description || '',
    },
    shouldFocusError: true, // Scroll to first error when validation fails
  })

  const onSubmit = useCallback(
    async (data: RecruitmentChannelEditFormData) => {
      try {
        // Prepare API data (không gửi code vì readonly)
        const apiData = {
          name: data.name,
          belong_to: data.belong_to,
          description: data.description,
        }

        await updateChannelMutation.mutateAsync({ id: initialData.id, data: apiData })
        toastService.success('Đã cập nhật thành công.')
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [updateChannelMutation, onSuccess, initialData.id]
  )

  return (
    <Form loading={updateChannelMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section Title */}
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin kênh tuyển dụng</Text>

        {/* Fields */}
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã kênh',
                required: true,
                placeholder: 'Mã kênh',
                name: 'code',
                type: 'text',
                disabled: true, // Readonly field
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên kênh',
                required: true,
                placeholder: 'Nhập tên kênh',
                name: 'name',
                type: 'text',
                disabled: updateChannelMutation.isPending,
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
                placeholder: 'Nhập mô tả về kênh tuyển dụng',
                name: 'description',
                rows: 4,
                disabled: updateChannelMutation.isPending,
                maxCharacters: 500,
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="belong_to"
              control={control}
              Field={RadioGroup}
              fieldProps={{
                id: 'belong_to',
                label: 'Thuộc về',
                required: false,
                options: belongToOptions,
                disabled: updateChannelMutation.isPending,
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
            disabled={updateChannelMutation.isPending}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateChannelMutation.isPending}
            loading={updateChannelMutation.isPending}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RecruitmentChannelEditForm
