import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, CurrencyInput, TextArea, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { handleApiError } from '@/utils/error-utils'
import {
  directorCommissionEditSchema,
  type DirectorCommissionEditValues,
} from '@/features/accounting/director-commissions/types/director-commission-types'

type DirectorCommissionEditDialogProps = {
  defaultValues?: Partial<{ pct_payout: string; payout_override_amount: string; note: string }>
  onSubmit: (values: DirectorCommissionEditValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

/** Edit the payout dials of a DRAFT period: payout rate, manual override, note. */
export default function DirectorCommissionEditDialog({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DirectorCommissionEditDialogProps) {
  const { register, control, handleSubmit, setError } = useForm<DirectorCommissionEditValues>({
    resolver: zodResolver(directorCommissionEditSchema) as never,
    mode: 'onTouched',
    defaultValues: {
      pct_payout: defaultValues?.pct_payout ?? null,
      payout_override_amount: defaultValues?.payout_override_amount ?? null,
      note: defaultValues?.note ?? '',
    },
  })

  const handleFormSubmit = useCallback(
    async (values: DirectorCommissionEditValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form handleSubmit={handleSubmit as never} onSubmit={handleFormSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-1 py-2">
        <p className="typo-body-sm-regular text-content-dark-3">
          Điều chỉnh mức % chi hoặc số tiền chi tay cho kỳ này. Để trống mức % để dùng định mức đáng
          hưởng.
        </p>

        <FormController
          register={register}
          name="pct_payout"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mức % chi',
            placeholder: 'Để trống để dùng định mức',
            type: 'text',
            inputMode: 'decimal',
          }}
        />

        <FormController
          register={register}
          name="payout_override_amount"
          control={control}
          Field={CurrencyInput}
          fieldProps={{
            label: 'Chi tay (VND)',
            placeholder: 'Nhập số tiền chi tay (tuỳ chọn)',
          }}
        />

        <FormController
          register={register}
          name="note"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
          }}
        />

        <Flex justify="end" gap="3" className="pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
