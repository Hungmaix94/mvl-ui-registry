import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Button, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import type {
  BranchContactInfo,
  BranchContactInfoRequest,
} from '@/features/org/services/branch-service'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  branchContactInfoSchema,
  type BranchContactInfoFormData,
} from '@/features/org/branch/_shares/schemas/branch-contact-infor-schema.ts'

type BranchContactInfoFormValues = BranchContactInfoFormData

interface BranchContactInfoFormDialogProps {
  branchId: number
  initialData?: BranchContactInfo
  onSubmit: (data: BranchContactInfoRequest, contactInfoId?: number) => Promise<void>
}

const BranchContactInfoFormDialog = ({
  branchId,
  initialData,
  onSubmit,
}: BranchContactInfoFormDialogProps) => {
  const { displayClose } = useDialog()
  const isEditMode = useMemo(() => !!initialData, [initialData])

  const defaultValues = useMemo<BranchContactInfoFormValues>(
    () => ({
      business_line: initialData?.business_line || '',
      name: initialData?.name || '',
      phone_number: initialData?.phone_number || '',
      email: initialData?.email || '',
    }),
    [initialData]
  )

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    register,
  } = useForm<BranchContactInfoFormValues>({
    resolver: zodResolver(branchContactInfoSchema),
    defaultValues,
  })

  const onFormSubmit = useCallback(
    async (data: BranchContactInfoFormValues) => {
      const payload: BranchContactInfoRequest = {
        branch_id: branchId,
        business_line: data.business_line,
        name: data.name,
        phone_number: data.phone_number,
        email: data.email,
      }

      await onSubmit(payload, initialData?.id)
    },
    [onSubmit, initialData?.id, branchId]
  )

  return (
    <Form loading={isSubmitting} onSubmit={onFormSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full">
        <FormController
          register={register}
          name="business_line"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Nghiệp vụ',
            required: true,
            placeholder: 'Nhập nghiệp vụ',
            disabled: isSubmitting,
            showCharacterCount: true,
            maxLength: 50,
          }}
        />

        <FormController
          register={register}
          name="name"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Người liên hệ',
            required: true,
            placeholder: 'Nhập người liên hệ',
            disabled: isSubmitting,
            showCharacterCount: true,
            maxLength: 50,
          }}
        />

        <FormController
          register={register}
          name="phone_number"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Số điện thoại',
            required: true,
            placeholder: 'Nhập số điện thoại',
            disabled: isSubmitting,
            showCharacterCount: true,
            maxLength: 10,
          }}
        />

        <FormController
          register={register}
          name="email"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Email',
            required: true,
            placeholder: 'Nhập email',
            type: 'email',
            disabled: isSubmitting,
            showCharacterCount: true,
            maxLength: 50,
          }}
        />

        <Flex gap="3" justify="end" className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={displayClose}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[100px]">
            {isEditMode ? 'Cập nhật' : 'Thêm'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default BranchContactInfoFormDialog
