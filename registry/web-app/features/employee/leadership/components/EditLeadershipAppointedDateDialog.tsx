import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog'
import FormController from '@/components/ui/form/FormController'
import { TextArea } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import {
  useSetLeadershipAppointedDate,
  type LeaderEmployee,
} from '@/features/employee/services/employee-service'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import toastService from '@/services/toast-service'

const schema = z.object({
  leadership_appointed_date: z.string().optional().default(''),
  note: z.string().optional().default(''),
})

type FormValues = z.infer<typeof schema>

type Props = {
  isOpen: boolean
  onClose: () => void
  employee: LeaderEmployee | null
}

/**
 * HR override for `leadership_appointed_date` (5.6 fsd.md §2.1) — auto-set/cleared by real
 * position-change events; this dialog is for the cases the auto-set logic can't reach (date
 * predates reliable position history) or when it needs correcting. Every save is logged to the
 * employee's "Lịch sử công tác" tab regardless of whether the value actually changed.
 */
const EditLeadershipAppointedDateDialog = ({ isOpen, onClose, employee }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    values: {
      leadership_appointed_date: employee?.leadership_appointed_date
        ? formatDate(employee.leadership_appointed_date)
        : '',
      note: '',
    },
  })

  const { mutateAsync: setLeadershipAppointedDate, isPending } = useSetLeadershipAppointedDate()

  const onSubmit = async (values: FormValues) => {
    if (!employee) return
    try {
      const apiDate = formatDateToApi(values.leadership_appointed_date)
      await setLeadershipAppointedDate({
        id: employee.id,
        data: {
          leadership_appointed_date: apiDate || null,
          note: values.note || '',
        },
      })
      toastService.success('Cập nhật ngày bổ nhiệm lên ban lãnh đạo thành công')
      onClose()
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi cập nhật ngày bổ nhiệm')
      // Rethrow so AppDialog's onConfirm wrapper sees the rejection and keeps the dialog open
      // (it only calls closeDialog() when onConfirm resolves) instead of closing on a failed save.
      throw error
    }
  }

  const handleConfirm = () => {
    return form.handleSubmit(onSubmit)()
  }

  return (
    <AppDialog
      variant="custom"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Sửa ngày bổ nhiệm lên ban lãnh đạo - ${employee?.fullname ?? ''}`}
      content={
        <FormProvider {...form}>
          <form
            id="edit-leadership-appointed-date-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="min-w-[400px] space-y-4"
          >
            <FormController
              control={form.control}
              register={form.register}
              name="leadership_appointed_date"
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày bổ nhiệm lên BLĐ',
                placeholder: 'Chọn ngày...',
                allowManualInput: true,
                clearable: true,
                disabled: isPending,
              }}
            />
            <FormController
              control={form.control}
              register={form.register}
              name="note"
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                placeholder: 'Lý do điều chỉnh (không bắt buộc)...',
                rows: 2,
                disabled: isPending,
              }}
            />
          </form>
        </FormProvider>
      }
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={isPending}
      isHideCancelButton={false}
    />
  )
}

export default EditLeadershipAppointedDateDialog
