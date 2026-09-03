import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo } from 'react'
import {
  type RecruitmentChannelCreateFormData,
  recruitmentChannelCreateSchema,
} from '@/features/recruitment/channel/_shares/schemas/recruitment-channel-create-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, TextField } from '@/components/ui'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useCreateRecruitmentChannel } from '@/features/recruitment/services/recruitment-channel-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

interface RecruitmentChannelCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentChannelCreateForm = ({
  onSuccess,
  onCancel,
}: RecruitmentChannelCreateFormProps) => {
  const createChannelMutation = useCreateRecruitmentChannel()

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
  } = useForm<RecruitmentChannelCreateFormData>({
    resolver: zodResolver(recruitmentChannelCreateSchema),
    defaultValues: {
      name: '',
      belong_to: undefined,
      description: '',
    },
    shouldFocusError: true, // Scroll to first error when validation fails
  })

  const onSubmit = useCallback(
    async (data: RecruitmentChannelCreateFormData) => {
      try {
        const apiData = {
          name: data.name,
          belong_to: data.belong_to,
          description: data.description,
        }

        await createChannelMutation.mutateAsync(apiData)
        toastService.success('Đã tạo thành công.')
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [createChannelMutation, onSuccess]
  )

  return (
    <Form loading={createChannelMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section Title */}
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin kênh tuyển dụng</Text>

        {/* Fields */}
        <Flex direction="column" gap="4">
          {/* Row 1: Tên kênh (không có Mã kênh vì auto-generated) */}
          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên kênh',
                required: true,
                placeholder: 'Nhập tên kênh tuyển dụng',
                name: 'name',
                type: 'text',
                disabled: createChannelMutation.isPending,
                showCharacterCount: true,
                maxLength: 250,
              }}
            />
          </Flex>

          {/* Row 2: Mô tả */}
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
                disabled: createChannelMutation.isPending,
                maxCharacters: 500,
              }}
            />
          </Flex>

          {/* Row 3: Thuộc về (RadioGroup) */}
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
                disabled: createChannelMutation.isPending,
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
            disabled={createChannelMutation.isPending}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createChannelMutation.isPending}
            loading={createChannelMutation.isPending}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RecruitmentChannelCreateForm
