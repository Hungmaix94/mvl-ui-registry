import { useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parse } from 'date-fns'
import {
  type RecoveryVoucherFormData,
  recoveryVoucherSchema,
} from '../schemas/recovery-voucher-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, CurrencyInput, Grid, TextArea, TextField, RadioGroup } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  type RecoveryVoucherRequest,
  type RecoveryVoucher,
  useCreateRecoveryVoucher,
  usePartialUpdateRecoveryVoucher,
} from '@/features/payroll/services/recovery-voucher-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import useReceveryVoucherOptions from '../hooks/useReceveryVoucherOptions.ts'

interface RecoveryVoucherFormProps {
  initialData?: RecoveryVoucher
  onSuccess?: () => void
  onCancel?: () => void
}

const RecoveryVoucherForm = ({ initialData, onSuccess, onCancel }: RecoveryVoucherFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createMutation = useCreateRecoveryVoucher()
  const partialUpdateMutation = usePartialUpdateRecoveryVoucher()
  const { voucherType } = useReceveryVoucherOptions()

  const mutation = isEditMode ? partialUpdateMutation : createMutation

  const form = useForm<RecoveryVoucherFormData>({
    resolver: zodResolver(recoveryVoucherSchema),
    defaultValues: {
      employee_id: initialData?.employee?.id || undefined,
      name: initialData?.name || '',
      voucher_type: initialData?.voucher_type || undefined,
      amount: initialData?.amount || undefined,
      month: initialData?.month ? parse(initialData.month, 'MM/yyyy', new Date()) : undefined,
      note: initialData?.note || '',
    },
  })

  const { register, control, handleSubmit, setError } = form

  const onSubmit = useCallback(
    async (data: RecoveryVoucherFormData) => {
      try {
        const serverData: RecoveryVoucherRequest = {
          employee_id: data.employee_id,
          name: data.name,
          voucher_type: data.voucher_type,
          amount: data.amount,
          month: data.month ? format(data.month, 'MM/yyyy') : '',
          note: data.note || undefined,
        }

        if (isEditMode && initialData?.id) {
          await partialUpdateMutation.mutateAsync({ id: initialData.id, data: serverData })
          toastService.success('Đã cập nhật phiếu thành công.')
        } else {
          await createMutation.mutateAsync(serverData)
          toastService.success('Đã tạo phiếu thành công.')
        }

        onSuccess?.()
      } catch (error: unknown) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, partialUpdateMutation, createMutation, onSuccess, initialData?.id, setError]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Tạo mới'), [isEditMode])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <Flex direction="column" gap="5">
          {/* Voucher Name Section */}
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên phiếu',
              required: true,
              placeholder: 'Thêm mới phiếu',
              name: 'name',
              disabled: mutation.isPending,
            }}
          />

          {/* Voucher Type as Radio */}
          <div className="space-y-3">
            <FormController
              register={register}
              name="voucher_type"
              control={control}
              Field={RadioGroup}
              fieldProps={{
                label: 'Loại phiếu',
                required: true,
                options: voucherType,
                disabled: mutation.isPending,
              }}
            />
          </div>

          {/* Employee Selection Section */}
          <Controller
            name="employee_id"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EmployeeSelectWithDialog
                value={field.value}
                onChange={field.onChange}
                error={error?.message}
                required
                label="Nhân viên"
                disabled={mutation.isPending}
              />
            )}
          />

          {/* Amount and Month Section */}
          <Grid cols={2} gap="5">
            <div data-field-name="amount">
              <FormController
                register={register}
                name="amount"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Số tiền',
                  required: true,
                  placeholder: 'Nhập số tiền',
                  name: 'amount',
                  disabled: mutation.isPending,
                }}
              />
            </div>
            <FormController
              register={register}
              name="month"
              control={control}
              Field={MonthPicker}
              fieldProps={{
                label: 'Kỳ tính lương',
                required: true,
                placeholder: 'Chọn kỳ tính lương',
                showYear: true,
                disabled: mutation.isPending,
                buttonType: 'button',
              }}
            />
          </Grid>

          {/* Note Section */}
          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="note"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                required: false,
                placeholder: 'Nhập ghi chú',
                name: 'note',
                rows: 4,
                maxCharacters: 500,
                disabled: mutation.isPending,
              }}
            />
          </Flex>
        </Flex>
      </Flex>

      {/* Action Buttons */}
      <Flex gap="4" justify="end" className="pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={mutation.isPending}
          className={'w-[150px]'}
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
    </Form>
  )
}

export default RecoveryVoucherForm
