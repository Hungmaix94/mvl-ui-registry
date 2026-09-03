import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback } from 'react'
import { Button, Form, FormController, TextArea } from '@/components/ui'
import { handleApiError } from '@/utils/error-utils'
import {
  evaluationRejectSchema,
  type EvaluationRejectFormValues,
} from '../schemas/contract-evaluation-schema'

type ContractEvaluationRejectFormProps = {
  onSubmit: (values: EvaluationRejectFormValues) => Promise<void>
  onCancel: () => void
}

const ContractEvaluationRejectForm = ({
  onSubmit,
  onCancel,
}: ContractEvaluationRejectFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<EvaluationRejectFormValues>({
    resolver: zodResolver(evaluationRejectSchema),
    defaultValues: { reject_reason: '' },
  })

  const handleFormSubmit = useCallback(
    async (values: EvaluationRejectFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={handleFormSubmit}
      loading={isSubmitting}
      className="flex flex-col gap-4"
    >
      <FormController
        control={control}
        register={register}
        name="reject_reason"
        Field={TextArea}
        fieldProps={{
          label: 'Lý do từ chối',
          placeholder: 'Nhập lý do từ chối phiếu đánh giá',
          rows: 4,
          required: true,
        }}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          className="bg-action-primary-red-default hover:bg-action-primary-red-hover text-white"
        >
          Từ chối phiếu
        </Button>
      </div>
    </Form>
  )
}

export default ContractEvaluationRejectForm
