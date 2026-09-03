import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, Select } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { handleApiError } from '@/utils/error-utils'
import {
  employeePayoutBatchFormSchema,
  type EmployeePayoutBatchFormValues,
} from '../../types/employee-payout-batch-types'
import { PAYOUT_WAVES, PAYOUT_WAVE_LABELS } from '../../constants'

type EmployeePayoutBatchFormProps = {
  mode: 'create' | 'edit'
  defaultValues?: Partial<EmployeePayoutBatchFormValues>
  onSubmit: (values: EmployeePayoutBatchFormValues) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export default function EmployeePayoutBatchForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EmployeePayoutBatchFormProps) {
  const { control, register, handleSubmit, setError } = useForm<EmployeePayoutBatchFormValues>({
    resolver: zodResolver(employeePayoutBatchFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues ?? {
      period: new Date(),
      batch_date: new Date(),
      wave: '',
    },
  })

  const waveOptions = useMemo(
    () => [
      { value: '', label: `Tất cả các đợt (${PAYOUT_WAVES.join(', ')})` },
      ...PAYOUT_WAVES.map((wave) => ({ value: wave, label: PAYOUT_WAVE_LABELS[wave] })),
    ],
    []
  )

  const handleFormSubmit = useCallback(
    async (values: EmployeePayoutBatchFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={handleFormSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full px-2 py-2">
        {/* Section A — Thông tin chung */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <FormController
              register={register}
              control={control}
              name="period"
              Field={MonthPicker}
              fieldProps={{ label: 'Tháng/Năm', showYear: true }}
            />

            <FormController
              register={register}
              control={control}
              name="batch_date"
              Field={DatePicker}
              fieldProps={{ label: 'Ngày tạo đợt', placeholder: 'DD/MM/YYYY' }}
            />

            <FormController
              register={register}
              control={control}
              name="wave"
              Field={Select}
              fieldProps={{
                label: 'Đợt chi (Wave)',
                placeholder: 'Chọn đợt chi',
                options: waveOptions,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 mt-4 flex justify-end gap-3 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            {mode === 'create' ? 'Tạo đợt chi' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
