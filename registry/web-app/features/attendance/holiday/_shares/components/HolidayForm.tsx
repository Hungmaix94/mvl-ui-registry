import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect } from 'react'
import {
  type HolidayFormData,
  holidaySchema,
} from '@/features/attendance/holiday/_shares/schemas/holiday-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, Select, TextArea, TextField } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  type Holiday,
  type HolidayDetail,
  useCreateHoliday,
  useUpdateHoliday,
} from '@/features/attendance/services/holiday-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { format } from 'date-fns'
import { type DateRange } from 'react-day-picker'
import { HolidayFunding_mode } from '@/api/schema.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'

interface HolidayFormProps {
  initialData?: Holiday | HolidayDetail
  onSuccess?: () => void
  onCancel?: () => void
}

const HolidayForm = ({ initialData, onSuccess, onCancel }: HolidayFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createHolidayMutation = useCreateHoliday()
  const updateHolidayMutation = useUpdateHoliday()

  const mutation = isEditMode ? updateHolidayMutation : createHolidayMutation

  const {
    register,
    control,
    setValue,
    setError,
    watch,
    handleSubmit,
    formState: {},
    reset,
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: initialData?.name || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      notes: initialData?.notes || '',
      funding_mode: initialData?.funding_mode || HolidayFunding_mode.paid,
    },
    shouldFocusError: true,
  })

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.HOLIDAY_FUNDING_MODE],
  })
  const fundingModeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.HOLIDAY_FUNDING_MODE) || [],
    [keysMapOptions]
  )

  const startDate = watch('start_date')
  const endDate = watch('end_date')

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        start_date: initialData.start_date ? new Date(initialData.start_date) : undefined,
        end_date: initialData.end_date ? new Date(initialData.end_date) : undefined,
        notes: initialData.notes || '',
        funding_mode: initialData.funding_mode || HolidayFunding_mode.paid,
      })
    }
  }, [initialData, reset])

  const dateRange: DateRange | undefined = useMemo(() => {
    if (startDate && endDate) {
      return { from: startDate, to: endDate }
    }
    return undefined
  }, [startDate, endDate])

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      setValue('start_date', range?.from as Date, { shouldDirty: true, shouldValidate: true })
      setValue('end_date', range?.to as Date, { shouldDirty: true, shouldValidate: true })
    },
    [setValue]
  )

  const onSubmit = useCallback(
    async (data: HolidayFormData) => {
      try {
        const apiData = {
          name: data.name,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: format(data.end_date, 'yyyy-MM-dd'),
          notes: data.notes || '',
          funding_mode: data.funding_mode,
        }

        if (isEditMode && initialData?.id) {
          await updateHolidayMutation.mutateAsync({ id: initialData.id, data: apiData })
          toastService.success('Đã cập nhật ngày lễ thành công')
        } else {
          await createHolidayMutation.mutateAsync(apiData)
          toastService.success('Đã tạo ngày lễ thành công')
        }
        onSuccess?.()
      } catch (error: any) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, updateHolidayMutation, createHolidayMutation, onSuccess, initialData]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Tạo mới'), [isEditMode])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Fields */}
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên ngày lễ',
                required: true,
                placeholder: 'Nhập tên ngày lễ',
                name: 'name',
                type: 'text',
                disabled: mutation.isPending,
                showCharacterCount: true,
                maxLength: 100,
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="start_date"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Khoảng thời gian nghỉ',
                required: true,
                value: dateRange,
                onChange: handleDateRangeChange,
                disabled: mutation.isPending,
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="funding_mode"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Hình thức chi trả',
                required: true,
                placeholder: 'Chọn hình thức chi trả',
                options: fundingModeOptions,
                disabled: mutation.isPending,
                className: 'w-full',
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="notes"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                placeholder: 'Nhập ghi chú',
                name: 'notes',
                rows: 4,
                disabled: mutation.isPending,
                maxCharacters: 500,
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
            disabled={mutation.isPending}
            className="w-[150px]"
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

export default HolidayForm
