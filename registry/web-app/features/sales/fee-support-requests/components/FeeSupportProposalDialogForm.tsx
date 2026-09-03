import { useCallback, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { type components } from '@/api/schema'
import { Button, TextArea } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'

import {
  FEE_SUPPORT_ATTACHMENT_PURPOSE,
  FEE_SUPPORT_BONUS_REQUEST_ENABLED,
} from '../constants/fee-support-request-constants'
import {
  applyFeeSupportApiError,
  feeSupportProposalDialogSchema,
  toFeeSupportCreatePayload,
  type FeeSupportProposalDialogValues,
  type FeeSupportRequestCreateRequest,
} from '../types/fee-support-request-types'
import {
  lockedFeeSupportStaffIds,
  withLockedFeeSupportStaffIds,
} from '../utils/fee-support-locked-staff'
import { ChannelRow, ReadonlyInfo } from './FeeSupportDialogFormPrimitives'
import FeeSupportPctAmountField from './FeeSupportPctAmountField'
import FeeSupportSalesStaffField from './FeeSupportSalesStaffField'

type DepositContractDetail = components['schemas']['DepositContractDetail']

export interface FeeSupportProposalDialogFormProps {
  /** HĐ cọc đã có ở màn sửa — nguồn prefill + link (deposit_contract id). */
  depositContract: DepositContractDetail
  onSubmit: (payload: FeeSupportRequestCreateRequest) => Promise<void>
  onCancel: () => void
  isPending?: boolean
}

/**
 * Form TẠO phiếu hỗ trợ phí NGAY trên màn HĐ cọc (deposit_contract-driven — KHÔNG
 * qua Deal). Prefill mã giao dịch / KH / sản phẩm / nhân sự từ `DepositContractDetail`;
 * link bằng `deposit_contract` id. Không có cột "mức hiện tại" / locked-mode (không
 * có commission-config theo deposit_contract); trần D14 vẫn do BE validate. origin
 * web_secretary do BE tự gán → không cần consent table.
 */
function FeeSupportProposalDialogForm({
  depositContract,
  onSubmit,
  onCancel,
  isPending,
}: FeeSupportProposalDialogFormProps) {
  // CR STT14: hiển thị đủ nhân sự bán của HĐ cọc (MV + CTV + F2); MV/CTV bị khoá bỏ tích.
  const salesStaff = useMemo(() => depositContract.sales_staff ?? [], [depositContract.sales_staff])

  const form = useForm<FeeSupportProposalDialogValues>({
    resolver: zodResolver(feeSupportProposalDialogSchema),
    defaultValues: {
      // Auto-tích nhóm bị khoá (MV + CTV); F2 hiển thị nhưng để trống, tích thủ công.
      sales: lockedFeeSupportStaffIds(salesStaff),
      reason: '',
      support_sale_pct: null,
      support_sale_amount: null,
      support_bonus_pct: null,
      support_bonus_amount: null,
      customer: depositContract.customer_detail?.id ?? null,
      customer_discount_pct: null,
      customer_discount_amount: null,
      customer_discount_bonus_pct: null,
      customer_discount_bonus_amount: null,
      attachment_tokens: [],
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

  // Trạng thái bận reactive trong dialog (content tĩnh không nhận update từ prop).
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
    async (values: FeeSupportProposalDialogValues) => {
      try {
        // CR STT14: MV + CTV bị khoá → luôn có mặt trong payload dù state lệch.
        const sales = [...withLockedFeeSupportStaffIds(values.sales ?? [], salesStaff)]
        await onSubmit(toFeeSupportCreatePayload({ ...values, sales }, depositContract.id))
      } catch (error) {
        applyFeeSupportApiError(error, setError)
      }
    },
    [onSubmit, setError, depositContract.id, salesStaff]
  )

  const customer = depositContract.customer_detail
  const pi = depositContract.product_inventory_detail

  return (
    <FormProvider {...form}>
      <Form loading={busy} onSubmit={handleFormSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4" className="pt-2">
          {/* Header chỉ-xem — prefill từ HĐ cọc */}
          <div className="border-border-1 bg-background-1 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-3">
            <ReadonlyInfo label="Mã giao dịch (HĐ cọc)" value={depositContract.code} />
            <ReadonlyInfo
              label="Khách hàng"
              value={
                customer ? `${customer.name}${customer.code ? ` (${customer.code})` : ''}` : ''
              }
            />
            <ReadonlyInfo
              label="Sản phẩm"
              value={pi ? `${pi.code}${pi.unit_number ? ` · ${pi.unit_number}` : ''}` : ''}
            />
          </div>

          {/* Nhân sự nhận hỗ trợ */}
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

          {/* Mức hỗ trợ & chiết khấu */}
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

          {/* Lý do + giấy tờ */}
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

          <Controller
            control={control}
            name="attachment_tokens"
            render={({ field, fieldState }) => (
              <FileUpload
                label="Giấy tờ chấp thuận của giám đốc dự án"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                multiple
                purpose={FEE_SUPPORT_ATTACHMENT_PURPOSE}
                disabled={busy}
                required={false}
              />
            )}
          />

          {/* Footer */}
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
              Tạo phiếu
            </Button>
          </Flex>
        </Flex>
      </Form>
    </FormProvider>
  )
}

export default FeeSupportProposalDialogForm
