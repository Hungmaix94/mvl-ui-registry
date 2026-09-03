import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import AppDialog from '@/components/dialog/AppDialog'
import { Select, TextField, CurrencyInput } from '@/components/ui'
import {
  useCreateImportedBonusBatch,
  useCreateImportedBonusEntry,
  useUpdateImportedBonusEntry,
  getImportedBonusService,
  BonusType,
} from '@/features/accounting/imported-bonuses/services/imported-bonus-service'
import { useAggregateMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useCreateCommissionDeduction,
  DeductionReasonKind,
  TransferSourceBucket,
} from '@/features/accounting/monthly-summaries/services/commission-transfer-service'
import { COMMISSION_ADJUSTMENT_PREFIX, QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

// "Điều chuyển hoa hồng" đã RỜI khỏi modal này: nó là nghiệp vụ riêng
// (CommissionTransferDialog) vì cặp khấu-trừ/thưởng phải được neo với nhau ở tầng dữ liệu.
// Cách cũ ghi 2 dòng thưởng âm/dương rồi neo nhau bằng chuỗi ghi chú "[ĐC] ... #id" nên
// xóa mất một dòng là chi thừa tiền mà không có gì báo.
//
// "Khấu trừ" giờ đi endpoint commission-deductions (khấu trừ vĩnh viễn, trước thuế) —
// backend đã CHẶN số thưởng âm nên không thể ghi khấu trừ bằng dòng thưởng nữa.
//
// Bộ 3 dưới đây là khái niệm CỦA MÀN HÌNH, API không có enum tương ứng: mỗi lựa chọn
// đi một đường backend khác nhau (BONUS/AD_SUPPORT → dòng thưởng, DEDUCTION → khấu trừ).
// Riêng AD_SUPPORT là giá trị thật của contract nên lấy thẳng từ schema, khỏi lệch.
const ADJUSTMENT_TYPE = {
  BONUS: 'BONUS',
  DEDUCTION: 'DEDUCTION',
  AD_SUPPORT: BonusType.AD_SUPPORT,
} as const

const schema = z.object({
  adjustment_type: z.enum([
    ADJUSTMENT_TYPE.BONUS,
    ADJUSTMENT_TYPE.DEDUCTION,
    ADJUSTMENT_TYPE.AD_SUPPORT,
  ]),
  reason_kind: z.nativeEnum(DeductionReasonKind).optional(),
  amount: z
    .number({ invalid_type_error: 'Số tiền không hợp lệ' })
    .min(1, 'Số tiền phải > 0')
    .max(999999999999999, 'Số tiền quá lớn (tối đa 15 chữ số)'),
  note: z.string().min(1, 'Vui lòng nhập ghi chú/lý do'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  employeeId: number
  entry?: any // If editing an existing adjustment
  onSuccess?: () => void
}

const TYPE_OPTIONS = [
  { value: ADJUSTMENT_TYPE.BONUS, label: 'Thưởng thêm' },
  { value: ADJUSTMENT_TYPE.DEDUCTION, label: 'Khấu trừ' },
  { value: ADJUSTMENT_TYPE.AD_SUPPORT, label: 'Hỗ trợ quảng cáo (chi cùng kỳ)' },
]

const REASON_KIND_OPTIONS = [
  { value: DeductionReasonKind.WRONG_SPLIT, label: 'Thu hồi khoản chia sai' },
  { value: DeductionReasonKind.PENALTY, label: 'Phạt' },
  { value: DeductionReasonKind.VIOLATION, label: 'Kỷ luật / vi phạm' },
  { value: DeductionReasonKind.OTHER, label: 'Khác' },
]

export default function CommSummaryAdjustmentDialog({
  open,
  onOpenChange,
  year,
  month,
  employeeId,
  entry,
  onSuccess,
}: Props) {
  const isEdit = !!entry
  const queryClient = useQueryClient()

  const createBatchMutation = useCreateImportedBonusBatch()
  const createEntryMutation = useCreateImportedBonusEntry()
  const updateEntryMutation = useUpdateImportedBonusEntry()
  const aggregateMutation = useAggregateMonthlySummary()
  const createDeductionMutation = useCreateCommissionDeduction()

  const defaultValues = useMemo<FormValues>(() => {
    if (entry) {
      const amountVal = Math.abs(Number(entry.amount || 0))
      const isNegative = Number(entry.amount || 0) < 0

      let adjustment_type: (typeof ADJUSTMENT_TYPE)[keyof typeof ADJUSTMENT_TYPE] =
        ADJUSTMENT_TYPE.BONUS
      if (entry.bonus_type === BonusType.AD_SUPPORT) {
        adjustment_type = ADJUSTMENT_TYPE.AD_SUPPORT
      } else if (isNegative) {
        // Dòng âm cũ (trước khi có nghiệp vụ khấu trừ riêng) — xem được, không sửa được.
        adjustment_type = ADJUSTMENT_TYPE.DEDUCTION
      }

      return {
        adjustment_type,
        reason_kind: DeductionReasonKind.OTHER,
        amount: amountVal,
        note: entry.note ?? entry.source?.note ?? '',
      }
    }

    return {
      adjustment_type: ADJUSTMENT_TYPE.BONUS,
      reason_kind: DeductionReasonKind.WRONG_SPLIT,
      amount: 0,
      note: '',
    }
  }, [entry])

  /**
   * Dòng thưởng ÂM là di sản của cách ghi khấu trừ/điều chuyển cũ. Backend đã chặn số âm
   * nên không thể lưu lại dòng đó qua modal này nữa; mở ở chế độ chỉ-đọc để kế toán vẫn
   * tra được, và chỉ dẫn sang nghiệp vụ mới thay vì để họ bấm Lưu rồi nhận lỗi 400.
   */
  const isLegacyNegativeEntry = !!entry && Number(entry.amount || 0) < 0

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(defaultValues)
    }
  }, [open, reset, defaultValues])

  const adjustmentType = watch('adjustment_type')

  const onSubmit = async (values: FormValues) => {
    if (isLegacyNegativeEntry) {
      toastService.error(
        'Khoản âm cũ không sửa được ở đây. Hủy khoản này rồi lập lại bằng nghiệp vụ Khấu trừ hoa hồng.'
      )
      return
    }

    try {
      // Khấu trừ đi nghiệp vụ riêng: trước thuế, có cap theo rổ thu nhập của kỳ, và
      // chỉ thao tác được khi bảng tổng hợp còn DRAFT (backend chặn).
      if (values.adjustment_type === ADJUSTMENT_TYPE.DEDUCTION) {
        await createDeductionMutation.mutateAsync({
          year,
          month,
          employee: employeeId,
          source_bucket: TransferSourceBucket.MGMT,
          reason_kind: (values.reason_kind || DeductionReasonKind.OTHER) as DeductionReasonKind,
          amount: String(values.amount),
          reason: values.note,
        })
        await aggregateMutation.mutateAsync({ year, month })
        toastService.success('Đã thêm khoản khấu trừ')
        onSuccess?.()
        onOpenChange(false)
        return
      }

      // Thưởng thêm / hỗ trợ quảng cáo: vẫn là dòng thưởng dương như trước.
      const batchesResp = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.LIST({ page_size: 100 }),
        queryFn: () => getImportedBonusService().getImportedBonusBatches({ page_size: 100 }),
      })
      const batch = batchesResp?.results?.find(
        (b: any) => b.year === year && b.month === month && b.status === 'DRAFT'
      )

      const isAdSupport = values.adjustment_type === ADJUSTMENT_TYPE.AD_SUPPORT
      const entryPayload = {
        employee_id: String(employeeId),
        bonus_type: isAdSupport ? BonusType.AD_SUPPORT : BonusType.OTHER,
        amount: String(values.amount),
        is_taxable: !isAdSupport,
        already_paid_externally: false,
        pit_withheld_at_payment: '0',
        note: values.note,
      }

      if (isEdit && entry) {
        await updateEntryMutation.mutateAsync({
          id: entry.entry_id ?? entry.id,
          data: entryPayload,
        })
      } else if (batch) {
        await createEntryMutation.mutateAsync({ batch: batch.id, ...entryPayload })
      } else {
        await createBatchMutation.mutateAsync({
          year,
          month,
          note: COMMISSION_ADJUSTMENT_PREFIX.BATCH_NOTE(month, year),
          entries: [entryPayload],
        })
      }

      await aggregateMutation.mutateAsync({ year, month })
      toastService.success(
        isEdit ? 'Đã cập nhật điều chỉnh thành công' : 'Đã thêm điều chỉnh thành công'
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const isPending =
    createBatchMutation.isPending ||
    createEntryMutation.isPending ||
    updateEntryMutation.isPending ||
    createDeductionMutation.isPending ||
    aggregateMutation.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Chỉnh sửa khoản điều chỉnh' : 'Thêm khoản thưởng / khấu trừ'}
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
            name="adjustment_type"
            render={({ field }) => (
              <Select
                label="Loại điều chỉnh"
                options={TYPE_OPTIONS}
                value={field.value}
                onChange={(val) => {
                  if (val) field.onChange(val)
                }}
                disabled={isEdit}
                error={errors.adjustment_type?.message}
                clearable={false}
              />
            )}
          />

          {adjustmentType === ADJUSTMENT_TYPE.DEDUCTION && (
            <Controller
              control={control}
              name="reason_kind"
              render={({ field }) => (
                <Select
                  label="Lý do khấu trừ"
                  options={REASON_KIND_OPTIONS}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  disabled={isLegacyNegativeEntry}
                  error={errors.reason_kind?.message}
                  clearable={false}
                />
              )}
            />
          )}

          {adjustmentType === ADJUSTMENT_TYPE.DEDUCTION && !isLegacyNegativeEntry && (
            <p className="text-xs break-words text-gray-500">
              Khấu trừ TRƯỚC thuế: thuế TNCN của kỳ sẽ được tính lại. Tiền khấu trừ ở lại công ty.
              Để khấu trừ rồi thưởng cho người khác, dùng nút &quot;Khấu trừ để thưởng&quot;.
            </p>
          )}

          {isLegacyNegativeEntry && (
            <p className="text-xs break-words text-amber-600">
              Đây là khoản âm ghi theo cách cũ nên chỉ xem, không sửa được. Muốn thay đổi thì hủy
              khoản này rồi lập lại bằng nghiệp vụ Khấu trừ hoa hồng.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  label="Số tiền (VNĐ)"
                  placeholder="Nhập số tiền"
                  value={field.value}
                  onChange={(val) => field.onChange(val || 0)}
                  suffix="VNĐ"
                  error={errors.amount?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <TextField
                  label="Ghi chú / Lý do"
                  placeholder="Nhập lý do điều chuyển/thưởng/khấu trừ"
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  error={errors.note?.message}
                  required
                />
              )}
            />
          </div>
        </div>
      }
    />
  )
}
