import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import {
  collaboratorFilterSchema,
  type CollaboratorFilterValues,
  DEFAULT_COLLABORATOR_FILTER_VALUES,
} from '@/features/accounting/collaborators/types/collaborator-types.ts'

export type CollaboratorFilterFormRef = {
  clearForm: () => void
  getValues: () => CollaboratorFilterValues
}

type CollaboratorFilterFormProps = {
  initialValues?: Partial<CollaboratorFilterValues>
}

const STATUS_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngưng hoạt động' },
]

const CollaboratorFilterForm = forwardRef<CollaboratorFilterFormRef, CollaboratorFilterFormProps>(
  ({ initialValues }, ref) => {
    const [formKey, setFormKey] = useState(0)

    const { register, control, handleSubmit, reset, getValues } = useForm<CollaboratorFilterValues>(
      {
        resolver: zodResolver(collaboratorFilterSchema),
        defaultValues: { ...DEFAULT_COLLABORATOR_FILTER_VALUES, ...initialValues },
      }
    )

    useEffect(() => {
      reset({ ...DEFAULT_COLLABORATOR_FILTER_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset(DEFAULT_COLLABORATOR_FILTER_VALUES)
          setFormKey((k) => k + 1)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = useCallback(() => {
      // Submission handled by parent via ref
    }, [])

    return (
      <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <FormController
            key={`is_active-${formKey}`}
            register={register}
            name="is_active"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              options: STATUS_OPTIONS,
              placeholder: 'Chọn trạng thái',
              isClearable: true,
            }}
          />
        </Flex>
      </Form>
    )
  }
)

CollaboratorFilterForm.displayName = 'CollaboratorFilterForm'

export default CollaboratorFilterForm
