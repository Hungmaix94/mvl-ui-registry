import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect, useState, forwardRef } from 'react'
import { format } from 'date-fns'
import { useRecruitmentSourceSelect } from '@/hooks/useRecruitmentSourceSelect.ts'
import { useRecruitmentChannelSelect } from '@/hooks/useRecruitmentChannelSelect.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import {
  type RecruitmentExpenseFormData,
  recruitmentExpenseSchema,
} from '../schemas/recruitment-expense-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, Select, CurrencyInput, Grid } from '@/components/ui'
import type { CurrencyInputProps } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Flex, Text } from '@radix-ui/themes'
import {
  type RecruitmentExpense,
  useCreateRecruitmentExpense,
  useUpdateRecruitmentExpense,
  type RecruitmentExpenseRequest,
} from '@/features/recruitment/services/recruitment-expense-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { IconCalendarblank } from '@/assets/icons'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { formatCurrencyVND } from '@/utils/common.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

interface RecruitmentExpenseFormProps {
  initialData?: RecruitmentExpense
  onSuccess?: () => void
  onCancel?: () => void
}

const TotalCostCurrencyInputWithQuickSelect = forwardRef<
  HTMLInputElement,
  CurrencyInputProps & { quickOptions?: number[] }
>(function TotalCostCurrencyInputWithQuickSelect(
  { quickOptions, onChange, disabled, onFocus, onBlur, ...props },
  ref
) {
  const options = quickOptions ?? [500000, 1000000, 1500000, 2000000]
  const [showQuickOptions, setShowQuickOptions] = useState(false)

  const handleFocus = (e?: any) => {
    setShowQuickOptions(true)
    onFocus?.(e)
  }

  const handleBlur = (e?: any) => {
    onBlur?.(e)
    setTimeout(() => {
      setShowQuickOptions(false)
    }, 150)
  }

  const handleSelectAmount = (amount: number) => {
    onChange?.(amount)
  }

  return (
    <div className="flex w-full flex-col gap-2" onFocus={handleFocus} onBlur={handleBlur}>
      <CurrencyInput ref={ref} onChange={onChange} disabled={disabled} {...props} />
      {showQuickOptions && !disabled && (
        <div className="flex flex-wrap gap-2">
          {options.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="secondary-border"
              size="small"
              onMouseDown={(event) => {
                event.preventDefault()
                handleSelectAmount(amount)
              }}
            >
              {formatCurrencyVND(amount)}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})

const RecruitmentExpenseForm = ({
  initialData,
  onSuccess,
  onCancel,
}: RecruitmentExpenseFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createExpenseMutation = useCreateRecruitmentExpense()
  const updateExpenseMutation = useUpdateRecruitmentExpense()

  const mutation = isEditMode ? updateExpenseMutation : createExpenseMutation

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus],
  })

  const paymentStatusOptions = useMemo(() => {
    return (
      keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus) || []
    )
  }, [keysMapOptions])

  const { loadRecruitmentSourceOptions, loadInitialRecruitmentSourceOptions } =
    useRecruitmentSourceSelect()
  const { loadRecruitmentChannelOptions, loadInitialRecruitmentChannelOptions } =
    useRecruitmentChannelSelect()
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
  })
  // Referee dropdown only lists employees converted from a recruitment candidate
  const {
    loadEmployeeOptions: loadRefereeEmployeeOptions,
    loadInitialEmployeeOptions: loadInitialRefereeEmployeeOptions,
  } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
    additionalParams: { has_candidate: true },
  })

  const form = useForm<RecruitmentExpenseFormData>({
    resolver: zodResolver(recruitmentExpenseSchema),
    defaultValues: {
      date: initialData?.date ? format(new Date(initialData.date), DATE_FORMAT) : '',
      recruitment_source_id: initialData?.recruitment_source?.id || undefined,
      recruitment_channel_id: initialData?.recruitment_channel?.id || undefined,
      branch_id: initialData?.branch?.id || undefined,
      total_cost: initialData ? Number(initialData.total_cost) || undefined : undefined,
      referee_id: initialData?.referee?.id || undefined,
      referrer_id: initialData?.referrer?.id || undefined,
      payer_id: initialData?.payer?.id || undefined,
      payment_status: initialData?.payment_status || undefined,
      activity: initialData?.activity || '',
      note: initialData?.note || '',
    },
  })

  const {
    register,
    control,
    handleSubmit,
    formState: {},
    watch,
    setError,
  } = form

  const recruitmentSourceId = watch('recruitment_source_id')

  // Define a type for RecruitmentSource to ensure allow_referral is recognized
  type RecruitmentSource = { id: number; allow_referral?: boolean; [key: string]: any }
  const [selectedSource, setSelectedSource] = useState<RecruitmentSource | null>(null)
  useEffect(() => {
    async function fetchSource() {
      if (recruitmentSourceId) {
        try {
          const { getRecruitmentSourceService } = await import(
            '@/features/recruitment/services/recruitment-source-service'
          )
          const source =
            await getRecruitmentSourceService().getRecruitmentSource(recruitmentSourceId)
          setSelectedSource(source as RecruitmentSource)
        } catch (err) {
          setSelectedSource(null)
        }
      } else {
        setSelectedSource(null)
      }
    }
    fetchSource()
  }, [recruitmentSourceId])

  const showReferredPersonAndReferrer = selectedSource?.allow_referral

  const onSubmit = useCallback(
    async (data: RecruitmentExpenseFormData) => {
      try {
        const { total_cost, referee_id, referrer_id, ...rest } = data
        const serverData: RecruitmentExpenseRequest = {
          ...rest,
          total_cost: String(total_cost),
          payment_status: rest.payment_status ?? undefined,
          date: formatDateToApi(data.date),
          referee_id: referee_id ? Number(referee_id) : undefined,
          referrer_id: referrer_id ? Number(referrer_id) : undefined,
          payer_id: data.payer_id ? Number(data.payer_id) : undefined,
        }

        if (isEditMode && initialData?.id) {
          await updateExpenseMutation.mutateAsync({ id: initialData?.id, data: serverData })
          toastService.success('Đã cập nhật thành công.')
        } else {
          await createExpenseMutation.mutateAsync(serverData)
          toastService.success('Đã tạo thành công.')
        }
        onSuccess?.()
      } catch (error: any) {
        // Map server-side attribute names to react-hook-form field names
        handleApiError(error, setError, {
          branch: 'branch_id',
        })
      }
    },
    [isEditMode, updateExpenseMutation, createExpenseMutation, onSuccess, initialData?.id, setError]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Tạo mới'), [isEditMode])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section Title */}
        <Text className="typo-body-xl-semibold text-content-dark-1">
          Thông tin chi phí tuyển dụng
        </Text>

        <Flex direction="column" gap="4">
          <Grid cols={2} gap="5">
            <FormController
              register={register}
              name="date"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày',
                required: true,
                placeholder: 'Chọn ngày',
                allowManualInput: true,
                name: 'date',
                disabled: mutation.isPending,
                icon: IconCalendarblank,
                clearable: true,
              }}
            />
            <FormController
              register={register}
              name="recruitment_source_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Nguồn tuyển dụng',
                required: true,
                placeholder: 'Chọn nguồn tuyển dụng',
                name: 'recruitment_source_id',
                disabled: mutation.isPending,
                enableSearch: true,
                loadOptions: loadRecruitmentSourceOptions,
                loadInitialOptions: loadInitialRecruitmentSourceOptions,
              }}
            />
          </Grid>
          <Grid cols={2} gap="5" className="flex-1">
            <FormController
              register={register}
              name="recruitment_channel_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Kênh tuyển dụng',
                required: true,
                placeholder: 'Chọn kênh tuyển dụng',
                name: 'recruitment_channel_id',
                disabled: mutation.isPending,
                enableSearch: true,
                loadOptions: loadRecruitmentChannelOptions,
                loadInitialOptions: loadInitialRecruitmentChannelOptions,
              }}
            />
            <FormController
              register={register}
              name="branch_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Chi nhánh',
                required: true,
                placeholder: 'Chọn chi nhánh',
                name: 'branch_id',
                disabled: mutation.isPending,
                enableSearch: true,
                loadOptions: loadBranchOptions,
                loadInitialOptions: loadInitialBranchOptions,
              }}
            />
          </Grid>

          <Grid cols={1} gap="5" className="flex-1">
            <FormController
              register={register}
              name="total_cost"
              control={control}
              Field={TotalCostCurrencyInputWithQuickSelect}
              fieldProps={{
                label: 'Tổng chi phí',
                required: true,
                placeholder: 'Nhập tổng chi phí',
                name: 'total_cost',
                disabled: mutation.isPending,
              }}
            />
          </Grid>

          <Grid cols={1} gap="5" className="flex-1">
            <FormController
              register={register}
              name="payment_status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái',
                required: false,
                placeholder: 'Chọn trạng thái thanh toán',
                disabled: mutation.isPending,
                options: paymentStatusOptions,
                enableSearch: true,
                clearable: true,
              }}
            />
          </Grid>
          {showReferredPersonAndReferrer && (
            <Grid cols={2} gap="5" className="flex-1">
              <FormController
                register={register}
                name="referee_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Người được giới thiệu',
                  subtitle: 'Chỉ nhập khi Nguồn tuyển dụng là các nguồn giới thiệu',
                  required: false,
                  placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
                  name: 'referee_id',
                  disabled: mutation.isPending,
                  async: true,
                  loadOptions: loadRefereeEmployeeOptions,
                  loadInitialOptions: loadInitialRefereeEmployeeOptions,
                }}
              />
              <FormController
                register={register}
                name="referrer_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Người giới thiệu',
                  required: false,
                  subtitle: 'Chỉ nhập khi Nguồn tuyển dụng là các nguồn giới thiệu',
                  placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
                  name: 'referrer_id',
                  disabled: mutation.isPending,
                  async: true,
                  loadOptions: loadEmployeeOptions,
                  loadInitialOptions: loadInitialEmployeeOptions,
                }}
              />
            </Grid>
          )}

          <Flex direction="column" gap="5" className="flex-1">
            <FormController
              register={register}
              name="payer_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Người chi',
                required: false,
                placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
                name: 'payer_id',
                disabled: mutation.isPending,
                async: true,
                loadOptions: loadEmployeeOptions,
                loadInitialOptions: loadInitialEmployeeOptions,
              }}
            />
          </Flex>

          <Flex direction="column" gap="2" className="flex-1">
            <FormController
              register={register}
              name="activity"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Hoạt động (nội dung tuyển dụng)',
                required: false,
                placeholder: 'Nhập hoạt động (nội dung tuyển dụng)',
                name: 'activity',
                rows: 4,
                maxCharacters: 1000,
                disabled: mutation.isPending,
              }}
            />
          </Flex>

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

export default RecruitmentExpenseForm
