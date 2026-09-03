import { useCallback, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, TextArea } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'

import { FEE_SUPPORT_BONUS_REQUEST_ENABLED } from '../constants/fee-support-request-constants'
import { type FeeSupportRequest } from '../services/fee-support-request-service'
import {
  EDIT_FORM_FIELD_NAMES,
  applyFeeSupportApiError,
  bonusCutOf,
  feeSupportEditDialogSchema,
  toFeeSupportEditPayload,
  type FeeSupportEditDialogValues,
  type FeeSupportRequestEditRequest,
} from '../types/fee-support-request-types'
import { withLockedFeeSupportStaffIds } from '../utils/fee-support-locked-staff'
import { ChannelRow, ReadonlyInfo } from './FeeSupportDialogFormPrimitives'
import FeeSupportPctAmountField from './FeeSupportPctAmountField'
import FeeSupportSalesStaffField, { type FeeSupportStaffRow } from './FeeSupportSalesStaffField'

export interface FeeSupportRequestEditDialogFormProps {
  /** Phiếu đang sửa — nguồn prefill (giá trị hiện có, không phải mặc định rỗng). */
  record: FeeSupportRequest
  /** Nhân sự bán của HĐ cọc gắn với phiếu (caller đã fetch qua useDepositContract). */
  salesStaff: readonly FeeSupportStaffRow[]
  onSubmit: (payload: FeeSupportRequestEditRequest) => Promise<void>
  onCancel: () => void
  isPending?: boolean
}

/** Decimal string BE (hoặc null) → number cho form; rỗng/không hợp lệ → null. */
function toFormNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Form SỬA phiếu hỗ trợ phí web_secretary (86eyqf9m3) — creator sửa được khi còn
 * DRAFT/PENDING_TP_ADMIN. Field editable đúng theo `FeeSupportRequestEditSerializer`
 * (BE): `sales`/`reason`/2 kênh hỗ trợ/chiết khấu khách. `deal`/`deposit_contract`
 * cố định theo phiếu — KHÔNG cho đổi (chỉ hiện đọc). Không có `hold_full_until_paid`
 * (chỉ set được lúc tạo) và không quản lý đính giấy tờ (giữ nguyên phạm vi task).
 */
function FeeSupportRequestEditDialogForm({
  record,
  salesStaff,
  onSubmit,
  onCancel,
  isPending,
}: FeeSupportRequestEditDialogFormProps) {
  const initialSales = useMemo(
    () => (record.lines ?? []).map((line) => line.dc_sale),
    [record.lines]
  )

  const form = useForm<FeeSupportEditDialogValues>({
    resolver: zodResolver(feeSupportEditDialogSchema),
    defaultValues: {
      sales: withLockedFeeSupportStaffIds(initialSales, salesStaff) as number[],
      reason: record.reason ?? '',
      support_sale_pct: toFormNumber(record.support_sale_pct),
      support_sale_amount: toFormNumber(record.support_sale_amount),
      support_bonus_pct: toFormNumber(record.support_bonus_pct),
      support_bonus_amount: toFormNumber(record.support_bonus_amount),
      customer: record.customer ?? null,
      customer_discount_pct: toFormNumber(record.customer_discount_pct),
      customer_discount_amount: toFormNumber(record.customer_discount_amount),
      customer_discount_bonus_pct: toFormNumber(bonusCutOf(record).pct),
      customer_discount_bonus_amount: toFormNumber(bonusCutOf(record).amount),
    },
  })

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form

  const busy = isSubmitting || !!isPending

  const writeChannel = useCallback(
    (
      pctField:
        | 'support_sale_pct'
        | 'support_bonus_pct'
        | 'customer_discount_pct'
        | 'customer_discount_bonus_pct',
      amtField:
        | 'support_sale_amount'
        | 'support_bonus_amount'
        | 'customer_discount_amount'
        | 'customer_discount_bonus_amount',
      next: { pct: number | null; amt: number | null }
    ) => {
      setValue(pctField, next.pct, { shouldValidate: true, shouldDirty: true })
      setValue(amtField, next.amt, { shouldValidate: true, shouldDirty: true })
      clearErrors('root.server')
    },
    [setValue, clearErrors]
  )

  const handleFormSubmit = useCallback(
    async (values: FeeSupportEditDialogValues) => {
      try {
        const sales = [...withLockedFeeSupportStaffIds(values.sales ?? [], salesStaff)]
        await onSubmit(toFeeSupportEditPayload({ ...values, sales }))
      } catch (error) {
        applyFeeSupportApiError(error, setError, EDIT_FORM_FIELD_NAMES)
      }
    },
    [onSubmit, setError, salesStaff]
  )

  return (
    <FormProvider {...form}>
      <Form loading={busy} onSubmit={handleFormSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4" className="pt-2">
          {/* Header chỉ-xem — giao dịch/HĐ cọc cố định theo phiếu, không sửa được. */}
          <div className="border-border-1 bg-background-1 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-3">
            <ReadonlyInfo label="Mã đề xuất" value={record.code} />
            <ReadonlyInfo
              label="Giao dịch"
              value={record.deal ? `GD #${record.deal}` : 'Chưa sinh giao dịch'}
            />
            <ReadonlyInfo label="Mã căn" value={record.unit_number || ''} />
          </div>

          <Controller
            control={control}
            name="sales"
            render={({ field, fieldState }) => (
              <FeeSupportSalesStaffField
                salesStaff={salesStaff}
                value={field.value ?? []}
                onChange={field.onChange}
                error={fieldState.error?.message}
                disabled={busy}
              />
            )}
          />

          <div className="flex flex-col">
            {errors.root?.server?.message && (
              <div className="border-action-primary-red-default bg-data-red-disabled text-data-red-default typo-body-base-medium mb-4 rounded-md border border-solid px-4 py-3 whitespace-pre-line">
                {errors.root.server.message}
              </div>
            )}

            <ChannelRow
              label="Hỗ trợ hoa hồng sale"
              hint="Cộng thêm vào hoa hồng sale của giao dịch"
            >
              <FeeSupportPctAmountField
                pct={watch('support_sale_pct') ?? null}
                amt={watch('support_sale_amount') ?? null}
                disabled={busy}
                error={errors.support_sale_pct?.message || errors.support_sale_amount?.message}
                onChange={(next) => writeChannel('support_sale_pct', 'support_sale_amount', next)}
              />
            </ChannelRow>

            {FEE_SUPPORT_BONUS_REQUEST_ENABLED && (
              <ChannelRow label="Hỗ trợ thưởng" hint="Cộng thêm vào thưởng CĐT cho sale">
                <FeeSupportPctAmountField
                  pct={watch('support_bonus_pct') ?? null}
                  amt={watch('support_bonus_amount') ?? null}
                  disabled={busy}
                  error={errors.support_bonus_pct?.message || errors.support_bonus_amount?.message}
                  onChange={(next) =>
                    writeChannel('support_bonus_pct', 'support_bonus_amount', next)
                  }
                />
              </ChannelRow>
            )}

            <ChannelRow
              label="Chiết khấu khách hàng (hoa hồng)"
              hint="Phần cắt cho khách — khi duyệt, khách trở thành CTV độc lập để nhận chi trả"
            >
              <FeeSupportPctAmountField
                pct={watch('customer_discount_pct') ?? null}
                amt={watch('customer_discount_amount') ?? null}
                disabled={busy}
                error={
                  errors.customer_discount_pct?.message ||
                  errors.customer_discount_amount?.message ||
                  errors.customer?.message
                }
                onChange={(next) =>
                  writeChannel('customer_discount_pct', 'customer_discount_amount', next)
                }
              />
            </ChannelRow>

            <ChannelRow
              label="Chiết khấu khách hàng (thưởng)"
              hint="Cắt cho khách từ mức thưởng sale đang được hưởng — không làm tăng tổng chi"
            >
              <FeeSupportPctAmountField
                pct={watch('customer_discount_bonus_pct') ?? null}
                amt={watch('customer_discount_bonus_amount') ?? null}
                disabled={busy}
                error={
                  errors.customer_discount_bonus_pct?.message ||
                  errors.customer_discount_bonus_amount?.message
                }
                onChange={(next) =>
                  writeChannel(
                    'customer_discount_bonus_pct',
                    'customer_discount_bonus_amount',
                    next
                  )
                }
              />
            </ChannelRow>
          </div>

          <FormController
            register={register}
            name="reason"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Lý do đề xuất',
              required: true,
              placeholder: 'Nhập chi tiết lý do đề xuất...',
              rows: 3,
              disabled: isPending,
            }}
          />

          <Flex gap="4" justify="end" align="center" className="flex-wrap pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={busy}
              className="w-[140px]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              loading={busy}
              className="w-[140px]"
            >
              Lưu thay đổi
            </Button>
          </Flex>
        </Flex>
      </Form>
    </FormProvider>
  )
}

export default FeeSupportRequestEditDialogForm
