import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppDialog from '@/components/dialog/AppDialog'
import { Select, TextField, CurrencyInput } from '@/components/ui'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { ImportedBonusEntryBonus_type } from '@/api/schema'
import {
  useCreateImportedBonusEntry,
  useUpdateImportedBonusEntry,
  type ImportedBonusEntryDetail,
} from '../services/imported-bonus-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

const schema = z.object({
  employee_id: z.string().min(1, 'Vui lòng chọn nhân sự'),
  bonus_type: z.nativeEnum(ImportedBonusEntryBonus_type, {
    required_error: 'Vui lòng chọn loại thưởng',
  }),
  amount: z
    .number({ invalid_type_error: 'Số tiền không hợp lệ' })
    .min(0, 'Số tiền phải >= 0')
    .max(999999999999999, 'Số tiền quá lớn (tối đa 15 chữ số)'),
  is_taxable: z.boolean(),
  already_paid_externally: z.boolean(),
  pit_withheld_at_payment: z
    .number({ invalid_type_error: 'Số tiền thuế không hợp lệ' })
    .min(0, 'Số tiền thuế phải >= 0')
    .max(999999999999999, 'Số tiền thuế quá lớn (tối đa 15 chữ số)'),
  note: z.string(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  batchId: number
  entry?: ImportedBonusEntryDetail
  onSuccess?: () => void
}

const BONUS_TYPE_OPTIONS = [
  { value: 'RECOGNITION', label: 'Vinh danh' },
  { value: 'AD_SUPPORT', label: 'Hỗ trợ quảng cáo' },
  { value: 'TET', label: 'Thưởng lễ tết' },
  { value: 'OTHER', label: 'Thưởng khác' },
]

export default function ImportedBonusEntryDialog({
  open,
  onOpenChange,
  batchId,
  entry,
  onSuccess,
}: Props) {
  const isEdit = !!entry
  const createMutation = useCreateImportedBonusEntry()
  const updateMutation = useUpdateImportedBonusEntry()

  const defaultValues = useMemo<FormValues>(() => {
    if (entry) {
      return {
        employee_id: entry.employee ? String(entry.employee) : '',
        bonus_type: entry.bonus_type,
        amount: Number(entry.amount || 0),
        is_taxable: entry.is_taxable ?? true,
        already_paid_externally: entry.already_paid_externally ?? false,
        pit_withheld_at_payment: Number(entry.pit_withheld_at_payment || 0),
        note: entry.note || '',
      }
    }
    return {
      employee_id: '',
      bonus_type: ImportedBonusEntryBonus_type.RECOGNITION,
      amount: 0,
      is_taxable: true,
      already_paid_externally: false,
      pit_withheld_at_payment: 0,
      note: '',
    }
  }, [entry])

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // Reset form when entry/open changes
  useEffect(() => {
    if (open) {
      reset(defaultValues)
    }
  }, [open, reset, defaultValues])

  const bonusType = watch('bonus_type')

  // Auto set already_paid_externally when bonus_type changes
  useEffect(() => {
    if (bonusType === 'TET') {
      setValue('already_paid_externally', true)
    } else {
      setValue('already_paid_externally', false)
    }
  }, [bonusType, setValue])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: entry.id,
          data: {
            employee_id: values.employee_id,
            bonus_type: values.bonus_type,
            amount: values.amount.toString(),
            is_taxable: values.is_taxable,
            already_paid_externally: values.already_paid_externally,
            pit_withheld_at_payment: values.pit_withheld_at_payment.toString(),
            note: values.note,
          },
        })
        toastService.success('Đã cập nhật dòng thưởng thành công')
      } else {
        await createMutation.mutateAsync({
          batch: batchId,
          employee_id: values.employee_id,
          bonus_type: values.bonus_type,
          amount: values.amount.toString(),
          is_taxable: values.is_taxable,
          already_paid_externally: values.already_paid_externally,
          pit_withheld_at_payment: values.pit_withheld_at_payment.toString(),
          note: values.note,
        })
        toastService.success('Đã thêm dòng thưởng thành công')
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const detail = extractErrorMessage(err)
      toastService.error(detail)
      // AppDialog đóng dialog khi onConfirm kết thúc bình thường — throw kèm cờ isApiError để
      // giữ dialog mở, người dùng còn thấy dữ liệu vừa nhập thay vì phải làm lại từ đầu.
      throw Object.assign(new Error(detail), { isApiError: true })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa dòng thưởng' : 'Thêm dòng thưởng vinh danh / ngoài deal'}
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleSubmit(onSubmit)}
      confirmText={isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
      loading={isPending}
      content={
        <div className="flex min-w-[500px] flex-col gap-4 py-4">
          <Controller
            control={control}
            name="employee_id"
            render={({ field }) => (
              <EmployeeSelectWithDialog
                label="Chọn nhân sự"
                value={field.value ? Number(field.value) : null}
                onChange={(val) => field.onChange(val ? String(val) : '')}
                error={errors.employee_id?.message}
                disabled={isEdit} // Do not allow changing employee when editing
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="bonus_type"
              render={({ field }) => (
                <Select
                  label="Loại thưởng"
                  options={BONUS_TYPE_OPTIONS}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  error={errors.bonus_type?.message}
                  clearable={false}
                />
              )}
            />

            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  label="Số tiền thưởng (VNĐ)"
                  placeholder="Nhập số tiền"
                  value={field.value}
                  onChange={(val) => field.onChange(val || 0)}
                  suffix="VNĐ"
                  error={errors.amount?.message}
                  required
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="pit_withheld_at_payment"
              render={({ field }) => (
                <CurrencyInput
                  label="Thuế TNCN đã khấu trừ (VNĐ)"
                  placeholder="Nhập số tiền thuế đã khấu"
                  value={field.value}
                  onChange={(val) => field.onChange(val || 0)}
                  suffix="VNĐ"
                  error={errors.pit_withheld_at_payment?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <TextField
                  label="Ghi chú"
                  placeholder="Nhập ghi chú"
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  error={errors.note?.message}
                />
              )}
            />
          </div>

          <div className="border-border-1 flex gap-6 border-t pt-3">
            <Controller
              control={control}
              name="is_taxable"
              render={({ field }) => (
                <Checkbox
                  label="Tính thuế TNCN"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                  error={errors.is_taxable?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="already_paid_externally"
              render={({ field }) => (
                <Checkbox
                  label="Đã thanh toán bên ngoài (vd: Thưởng Tết)"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                  error={errors.already_paid_externally?.message}
                />
              )}
            />
          </div>
        </div>
      }
    />
  )
}
