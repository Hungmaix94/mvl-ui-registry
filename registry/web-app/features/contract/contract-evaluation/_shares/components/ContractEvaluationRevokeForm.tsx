import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, Form, FormController, TextArea } from '@/components/ui'
import { handleApiError } from '@/utils/error-utils'

import {
  type EvaluationRevokeFormValues,
  evaluationRevokeSchema,
} from '../schemas/contract-evaluation-schema'

type ContractEvaluationRevokeFormProps = {
  onSubmit: (values: EvaluationRevokeFormValues) => Promise<void>
  onCancel: () => void
}

/**
 * HR-only: revoke the latest approval (COMPLETED → WAITING_HR). The BE
 * `HrRevokeRequest` requires `reject_reason`, so a reason is collected here.
 */
const ContractEvaluationRevokeForm = ({
  onSubmit,
  onCancel,
}: ContractEvaluationRevokeFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<EvaluationRevokeFormValues>({
    resolver: zodResolver(evaluationRevokeSchema),
    defaultValues: { reject_reason: '' },
  })

  const handleFormSubmit = useCallback(
    async (values: EvaluationRevokeFormValues) => {
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
      <p className="text-content-dark-2 text-sm">
        Phiếu sẽ quay lại bước chờ HR duyệt. Vui lòng nhập lý do thu hồi.
      </p>
      <FormController
        control={control}
        register={register}
        name="reject_reason"
        Field={TextArea}
        fieldProps={{
          label: 'Lý do thu hồi',
          placeholder: 'Nhập lý do thu hồi phê duyệt',
          rows: 4,
          required: true,
        }}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Thu hồi phê duyệt
        </Button>
      </div>
    </Form>
  )
}

export default ContractEvaluationRevokeForm
