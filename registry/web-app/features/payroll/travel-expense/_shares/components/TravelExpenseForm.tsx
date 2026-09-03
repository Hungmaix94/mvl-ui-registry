import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo } from 'react'
import { format, parse } from 'date-fns'
import {
  type TravelExpenseFormData,
  travelExpenseSchema,
} from '../schemas/travel-expense-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, TextField, Select, CurrencyInput, Grid } from '@/components/ui'
import { Flex, Separator } from '@radix-ui/themes'
import {
  type TravelExpense,
  useCreateTravelExpense,
  useUpdateTravelExpense,
  type TravelExpenseRequest,
} from '@/features/payroll/services/travel-expense-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

interface TravelExpenseFormProps {
  initialData?: TravelExpense
  onSuccess?: () => void
  onCancel?: () => void
}

const TravelExpenseForm = ({ initialData, onSuccess, onCancel }: TravelExpenseFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createExpenseMutation = useCreateTravelExpense()
  const updateExpenseMutation = useUpdateTravelExpense()

  const mutation = isEditMode ? updateExpenseMutation : createExpenseMutation

  const form = useForm<TravelExpenseFormData>({
    resolver: zodResolver(travelExpenseSchema),
    defaultValues: {
      employee_id: initialData?.employee?.id || undefined,
      name: initialData?.name || '',
      expense_type: initialData?.expense_type || undefined,
      amount: initialData?.amount || undefined,
      month: initialData?.month ? parse(initialData.month, 'MM/yyyy', new Date()) : undefined,
      note: initialData?.note || '',
    },
  })

  const { register, control, handleSubmit, setError } = form

  const onSubmit = useCallback(
    async (data: TravelExpenseFormData) => {
      try {
        const serverData: TravelExpenseRequest = {
          employee_id: data.employee_id,
          name: data.name,
          expense_type: data.expense_type,
          amount: data.amount,
          month: format(data.month, 'MM/yyyy'),
          note: data.note || undefined,
        }

        if (isEditMode && initialData?.id) {
          await updateExpenseMutation.mutateAsync({ id: initialData?.id, data: serverData })
          toastService.success('Đã cập nhật thành công.')
        } else {
          await createExpenseMutation.mutateAsync(serverData)
          toastService.success('Đã tạo thành công.')
        }
        onSuccess?.()
      } catch (error: unknown) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, updateExpenseMutation, createExpenseMutation, onSuccess, initialData?.id, setError]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Tạo mới'), [isEditMode])

  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE],
  })

  const expenseTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE) || []
      : []
  }, [keysMapOptions])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <Flex direction="column" gap="5">
          {/* Code Field - Only show in edit mode, read-only */}
          {isEditMode && initialData?.code && (
            <TextField
              label="Mã công tác phí"
              value={initialData.code}
              disabled={true}
              readOnly={true}
            />
          )}

          {/* Employee Selection Section */}
          <Flex direction="column" gap="5">
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
          </Flex>

          {/* Separator */}
          <Separator orientation="horizontal" className="!w-full" />

          {/* Content Section */}
          <Flex direction="column" gap="4">
            <Grid cols={2} gap="5">
              <FormController
                register={register}
                name="name"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tên chi phí',
                  required: true,
                  placeholder: 'Nhập tên chi phí',
                  name: 'name',
                  disabled: mutation.isPending,
                }}
              />
              <FormController
                register={register}
                name="expense_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Loại chi phí',
                  required: true,
                  placeholder: 'Chọn loại chi phí',
                  name: 'expense_type',
                  disabled: mutation.isPending,
                  options: expenseTypeOptions,
                  enableSearch: false,
                }}
              />
            </Grid>

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
                  label: 'Tháng',
                  required: true,
                  placeholder: 'Chọn tháng',
                  showYear: true,
                  disabled: mutation.isPending,
                  buttonType: 'button',
                }}
              />
            </Grid>

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
                  maxCharacters: 1000,
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
      </Flex>
    </Form>
  )
}

export default TravelExpenseForm
