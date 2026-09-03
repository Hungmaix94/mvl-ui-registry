import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex, Text } from '@radix-ui/themes'

import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

import { Button, Select, TextArea } from '@/components/ui'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'

import { useDealSelect } from '@/hooks/useDealSelect'
import {
  useDealCommissionConfigList,
  useDealWorkspace,
} from '@/features/sales/deals/services/deal-service'
import { useDepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { resolveCustomerDisplay } from '@/features/sales/utils/customer-display'
import {
  extractCurrentCommissionConfig,
  toRefNumber,
} from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import { formatCurrencyVND } from '@/utils/common'

import { type MoneyPercentMode } from '@/components/commons/MoneyPercentInput'

import {
  FEE_SUPPORT_ATTACHMENT_PURPOSE,
  FEE_SUPPORT_BONUS_REQUEST_ENABLED,
} from '../constants/fee-support-request-constants'
import {
  applyFeeSupportApiError,
  feeSupportRequestFormSchema,
  toFeeSupportCreatePayload,
  type FeeSupportRequestCreateRequest,
  type FeeSupportRequestFormValues,
} from '../types/fee-support-request-types'
import {
  lockedFeeSupportStaffIds,
  withLockedFeeSupportStaffIds,
} from '../utils/fee-support-locked-staff'
import FeeSupportPctAmountField from './FeeSupportPctAmountField'
import FeeSupportSalesStaffField, { type FeeSupportStaffRow } from './FeeSupportSalesStaffField'

type Props = {
  /** Page-level submit — ném lỗi API để form map vào field qua handleApiError. */
  onSubmit: (payload: FeeSupportRequestCreateRequest) => Promise<void>
  onCancel: () => void
  isPending?: boolean
}

const EMPTY_SALES: number[] = []

/** Link hồ sơ nhân viên chỉ áp cho sale MV — CTV và F2 không có `employee_detail`. */
function employeeDetailPath(staff: FeeSupportStaffRow): string | null {
  if (staff.sale_type !== DepositContractSaleType.mv || !staff.employee_detail?.id) return null
  return APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(staff.employee_detail.id))
}

/** Hiển thị % kiểu VN (dấu phẩy thập phân) — chỉ format, không tính toán. */
function formatPctVn(pct: number): string {
  return `${String(pct).replace('.', ',')}%`
}

/**
 * Mức hiện tại của một kênh theo commission-config (XOR %/tiền — hiển thị đúng
 * kênh BE trả, KHÔNG quy đổi; config trả amt="0" nghĩa là không dùng phí cố định).
 */
function formatCurrentRef(pct: string | null | undefined, amt: string | null | undefined): string {
  const pctValue = toRefNumber(pct)
  if (pctValue != null) return formatPctVn(pctValue)
  const amtValue = toRefNumber(amt)
  if (amtValue != null && amtValue !== 0) return `${formatCurrencyVND(amtValue)} VNĐ`
  return '—'
}

/**
 * Đơn vị của MỨC HIỆN TẠI → đơn vị bị KHOÁ của ô nhập kênh đó (D9/D16 — support
 * phải cùng mode với mức hiện tại). Không có mức hiện tại → không khoá.
 */
function lockedModeFromConfig(
  pct: string | null | undefined,
  amt: string | null | undefined
): MoneyPercentMode | undefined {
  if (toRefNumber(pct) != null) return 'percent'
  const amtValue = toRefNumber(amt)
  if (amtValue != null && amtValue !== 0) return 'amount'
  return undefined
}

/**
 * Link mở TAB MỚI tới trang chi tiết — chỉ khi đủ quyền + có id; ngược lại
 * render text thường (không giả vờ click được).
 */
function DetailTabLink({
  allowed,
  path,
  className,
  children,
}: {
  allowed: boolean
  path: string | null
  className?: string
  children: ReactNode
}) {
  if (!allowed || !path) return <span className={className}>{children}</span>
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('text-action-primary-default hover:underline', className)}
    >
      {children}
    </a>
  )
}

/** Header card section đánh số bước — giữ nhịp kể chuyện: giao dịch → mức hỗ trợ → hồ sơ. */
function SectionCard({
  step,
  title,
  description,
  aside,
  children,
}: {
  step: number
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-border-1 bg-background-1 rounded-xl border p-6">
      <div className="border-border-1 mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className="bg-action-primary-red-default text-content-light-1 typo-body-sm-semibold flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            {step}
          </span>
          <div>
            <h2 className="typo-body-xl-semibold text-content-dark-1">{title}</h2>
            {description && (
              <p className="typo-body-sm-regular text-content-dark-3 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * Hàng ledger trong section mức hỗ trợ: nhãn + chú giải trái, mức HIỆN TẠI
 * (chỉ xem, BRD §2.2) ở giữa, nội dung phải (ô nhập hoặc info read-only).
 */
function ChannelRow({
  label,
  hint,
  currentLabel,
  currentValue,
  children,
}: {
  label: string
  hint?: string
  /** Nhãn cột mức hiện tại (bỏ trống = kênh không có mức nền, ví dụ chiết khấu khách). */
  currentLabel?: string
  currentValue?: string
  children: ReactNode
}) {
  return (
    <div className="border-border-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-[200px] flex-1">
        <div className="typo-body-base-semibold text-content-dark-1">{label}</div>
        {hint && <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">{hint}</div>}
      </div>
      {currentLabel && (
        <div className="w-[150px] shrink-0 text-right">
          <div className="typo-body-sm-regular text-content-dark-3">{currentLabel}</div>
          <div className="typo-body-base-semibold text-content-dark-1">{currentValue ?? '—'}</div>
        </div>
      )}
      <div className="w-full max-w-[320px] shrink-0 sm:w-[320px]">{children}</div>
    </div>
  )
}

/**
 * Form TẠO đề xuất hỗ trợ phí (origin=web_secretary — BE tự gán, phiếu chuyển
 * THẲNG TP Admin duyệt, bỏ consent + 3 cấp giữa — D19). Form này CHỈ dùng cho
 * TẠO — sửa (86eyqf9m3, creator sửa khi còn DRAFT/PENDING_TP_ADMIN) đi qua dialog
 * riêng `FeeSupportRequestEditDialogForm` (field hẹp hơn, không có `deal`/
 * `hold_full_until_paid`). BR7 (từ chối là terminal) vẫn đúng — không liên quan.
 *
 * Mức phí + thưởng HIỆN TẠI (chỉ xem — BRD §2.2) map từ commission-config
 * `current` của deal (`pct_sale_commission` / `pct_investor_bonus_to_sale` —
 * đúng cặp BE snapshot vào `current_pct_*` khi tạo). Khách hàng nhận chiết khấu
 * là khách CỦA GIAO DỊCH — chỉ hiển thị, không cho chọn lại. FE chỉ map, không tính.
 *
 * Mỗi kênh hỗ trợ là MỘT ô nhập với công tắc `[đ | %]` trong ô (XOR by
 * construction — pattern ReconPctAmountInline); phải khớp revenue_mode của deal
 * (D9 — BE validate, FE surface lỗi vào đúng field).
 */
export const FeeSupportRequestForm = ({ onSubmit, onCancel, isPending = false }: Props) => {
  const ability = useAbility()
  const canViewEmployee = ability.can('retrieve', 'employee')
  const canViewProject = ability.can('retrieve', 'project')

  const form = useForm<FeeSupportRequestFormValues>({
    resolver: zodResolver(feeSupportRequestFormSchema),
    defaultValues: {
      deal: undefined,
      sales: [],
      reason: '',
      support_sale_pct: null,
      support_sale_amount: null,
      support_bonus_pct: null,
      support_bonus_amount: null,
      customer: undefined,
      customer_discount_pct: null,
      customer_discount_amount: null,
      customer_discount_bonus_pct: null,
      customer_discount_bonus_amount: null,
      hold_full_until_paid: false,
      attachment_tokens: [],
    },
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form

  const watchDealId = watch('deal')
  // Hằng module-level để fallback không tạo mảng mới mỗi render (effect phụ thuộc giá trị này).
  const watchSales = watch('sales') ?? EMPTY_SALES
  const supportSalePct = watch('support_sale_pct') ?? null
  const supportSaleAmount = watch('support_sale_amount') ?? null
  const supportBonusPct = watch('support_bonus_pct') ?? null
  const supportBonusAmount = watch('support_bonus_amount') ?? null
  const customerDiscountBonusPct = watch('customer_discount_bonus_pct') ?? null
  const customerDiscountBonusAmount = watch('customer_discount_bonus_amount') ?? null
  const customerDiscountPct = watch('customer_discount_pct') ?? null
  const customerDiscountAmount = watch('customer_discount_amount') ?? null

  const { loadDealOptions, loadInitialDealOptions } = useDealSelect()

  const { data: workspace } = useDealWorkspace(watchDealId ?? 0, { enabled: !!watchDealId })
  const depositContractId = workspace?.overview?.deposit_contract?.id

  const { data: depositContract } = useDepositContract(depositContractId, {
    enabled: !!depositContractId,
  })

  // CR STT14: hiển thị ĐẦY ĐỦ nhân sự bán của giao dịch (kể cả F2) — khoá bỏ tích
  // riêng sale MV + CTV; F2 vẫn tích/bỏ tích được.
  const salesStaff: FeeSupportStaffRow[] = useMemo(
    () => depositContract?.sales_staff ?? [],
    [depositContract]
  )

  // Mức phí + thưởng HIỆN TẠI của sale trên deal (chỉ xem) — commission-config current.
  const { data: commissionEnvelope } = useDealCommissionConfigList(watchDealId ?? 0, {
    enabled: !!watchDealId,
  })
  const currentConfig = useMemo(
    () => extractCurrentCommissionConfig(commissionEnvelope),
    [commissionEnvelope]
  )
  const currentSaleCommission = formatCurrentRef(
    currentConfig?.pct_sale_commission,
    currentConfig?.amt_sale_commission
  )
  const currentBonusToSale = formatCurrentRef(
    currentConfig?.pct_investor_bonus_to_sale,
    currentConfig?.amt_investor_bonus_to_sale
  )
  const saleLockedMode = lockedModeFromConfig(
    currentConfig?.pct_sale_commission,
    currentConfig?.amt_sale_commission
  )
  const bonusLockedMode = lockedModeFromConfig(
    currentConfig?.pct_investor_bonus_to_sale,
    currentConfig?.amt_investor_bonus_to_sale
  )

  // Khách nhận chiết khấu = khách của giao dịch — read-only, form tự gán id vào payload.
  const dealCustomer = workspace?.overview?.customer
  const customerId = dealCustomer?.id
  // Khách doanh nghiệp để trống `full_name` / `id_number`; đọc thẳng hai cột đó thì ô này
  // hiện `—` và người dùng tưởng giao dịch chưa gắn khách (86eyphhtb).
  const customerDisplay = resolveCustomerDisplay(dealCustomer)
  useEffect(() => {
    setValue('customer', customerId ?? null, { shouldValidate: true })
  }, [customerId, setValue])

  // BR2: mức hỗ trợ áp đồng nhất cho mọi sale trên deal → auto-tích MV + CTV (nhóm bị
  // khoá) khi danh sách tải xong; F2 hiển thị nhưng để trống, người dùng tự tích nếu cần.
  const preselectedDealRef = useRef<number | null>(null)
  useEffect(() => {
    if (!watchDealId || salesStaff.length === 0) return
    if (preselectedDealRef.current !== watchDealId) {
      preselectedDealRef.current = watchDealId
      setValue('sales', lockedFeeSupportStaffIds(salesStaff), { shouldValidate: true })
      return
    }
    // CR STT14: MV + CTV bị khoá → luôn phải có mặt trong payload dù state lệch.
    const next = withLockedFeeSupportStaffIds(watchSales, salesStaff)
    if (next !== watchSales) setValue('sales', [...next], { shouldValidate: true })
  }, [watchDealId, salesStaff, watchSales, setValue])

  const handleFormSubmit = useCallback(
    async (values: FeeSupportRequestFormValues) => {
      // deal.id ≠ deposit_contract.id → phải gửi id hợp đồng cọc đã resolve từ
      // workspace của giao dịch, không phải values.deal.
      if (!depositContractId) {
        setError('deal', {
          message: 'Chưa xác định được hợp đồng cọc của giao dịch, vui lòng thử lại.',
        })
        return
      }
      try {
        // FileUpload phát file_token (chuỗi) sau presign; BE confirm token →
        // FileModel phía server nên FE gửi token trực tiếp qua files.attachments
        // (đồng bộ pattern Exchange/Investor — không confirm ở FE).
        // CR STT14: MV + CTV bị khoá → luôn có mặt trong payload dù state lệch.
        const sales = [...withLockedFeeSupportStaffIds(values.sales ?? [], salesStaff)]
        await onSubmit(
          toFeeSupportCreatePayload(
            { ...values, sales },
            depositContractId,
            values.hold_full_until_paid
          )
        )
      } catch (error) {
        // Lỗi field → dưới đúng ô; lỗi non-field (vd trần D14) → banner mục 2 (không toast)
        applyFeeSupportApiError(error, setError)
      }
    },
    [onSubmit, setError, depositContractId, salesStaff]
  )

  /** Ghi cặp XOR của một kênh về form (validate lại + xoá banner lỗi server cũ). */
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

  // Config tải xong sau khi user đã nhập → dọn giá trị lệch đơn vị bị khoá (D9/D16).
  useEffect(() => {
    if (
      (saleLockedMode === 'percent' && supportSaleAmount != null) ||
      (saleLockedMode === 'amount' && supportSalePct != null)
    ) {
      writeChannel('support_sale_pct', 'support_sale_amount', { pct: null, amt: null })
    }
    if (
      (bonusLockedMode === 'percent' && supportBonusAmount != null) ||
      (bonusLockedMode === 'amount' && supportBonusPct != null)
    ) {
      writeChannel('support_bonus_pct', 'support_bonus_amount', { pct: null, amt: null })
    }
  }, [
    saleLockedMode,
    bonusLockedMode,
    supportSalePct,
    supportSaleAmount,
    supportBonusPct,
    supportBonusAmount,
    writeChannel,
  ])

  const projectInfo = workspace?.overview?.project
  const piInfo = workspace?.overview?.pi

  return (
    <FormProvider {...form}>
      <Form loading={isPending} onSubmit={handleFormSubmit} handleSubmit={handleSubmit}>
        <div className="mx-auto w-full max-w-[1040px] px-6 pt-6 pb-10">
          <Flex direction="column" gap="5">
            {/* BƯỚC 1: Giao dịch & Nhân sự */}
            <SectionCard
              step={1}
              title="Giao dịch & Nhân sự tham gia"
              description="Mức hỗ trợ là con số chung cho cả giao dịch, áp đồng nhất cho mọi nhân sự tham gia (chia theo tỷ lệ tham gia khi chia thực nhận)."
            >
              <div className="flex flex-col gap-4">
                <div className="max-w-[560px]">
                  <FormController
                    register={register}
                    name="deal"
                    control={control}
                    Field={Select}
                    fieldProps={{
                      label: 'Giao dịch (Deal)',
                      required: true,
                      placeholder: 'Nhập mã giao dịch để tìm...',
                      disabled: isPending,
                      enableSearch: true,
                      loadOptions: loadDealOptions,
                      loadInitialOptions: loadInitialDealOptions,
                    }}
                  />
                </div>

                {watchDealId && workspace && (
                  <div className="bg-background-2 grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg p-4 sm:grid-cols-2">
                    <div>
                      <div className="typo-body-sm-regular text-content-dark-3">Dự án</div>
                      <DetailTabLink
                        allowed={canViewProject}
                        path={
                          projectInfo?.id
                            ? APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(
                                ':id',
                                String(projectInfo.id)
                              )
                            : null
                        }
                        className="typo-body-base-semibold text-content-dark-1"
                      >
                        {projectInfo?.name || '—'}
                      </DetailTabLink>
                    </div>
                    <div>
                      <div className="typo-body-sm-regular text-content-dark-3">Mã căn</div>
                      <DetailTabLink
                        allowed={canViewProject}
                        path={
                          piInfo?.id
                            ? APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                                ':id',
                                String(piInfo.id)
                              )
                            : null
                        }
                        className="typo-body-base-semibold text-content-dark-1"
                      >
                        {piInfo?.unit_number || '—'}
                      </DetailTabLink>
                    </div>
                  </div>
                )}

                {watchDealId && (
                  <FeeSupportSalesStaffField
                    label="Nhân sự tham gia giao dịch nhận hỗ trợ"
                    salesStaff={salesStaff}
                    value={watchSales}
                    onChange={(ids) => setValue('sales', ids, { shouldValidate: true })}
                    error={errors.sales?.message}
                    disabled={isPending}
                    emptyMessage={
                      !depositContractId
                        ? 'Giao dịch chưa có hợp đồng cọc để lấy danh sách nhân viên.'
                        : !depositContract
                          ? 'Đang tải nhân sự giao dịch...'
                          : 'Giao dịch chưa có nhân viên (sale) nào trên hợp đồng cọc.'
                    }
                    renderName={(staff, name) => (
                      <DetailTabLink
                        allowed={canViewEmployee}
                        path={employeeDetailPath(staff)}
                        className="typo-body-base-semibold text-content-dark-1"
                      >
                        {name}
                      </DetailTabLink>
                    )}
                  />
                )}
              </div>
            </SectionCard>

            {/* BƯỚC 2: Mức hỗ trợ & Chiết khấu — mỗi kênh MỘT ô [đ | %], kèm mức HIỆN TẠI (chỉ xem) */}
            <SectionCard
              step={2}
              title="Mức hỗ trợ phí & Chiết khấu khách"
              description="Mức hỗ trợ nhập THÊM so với mức hiện tại của giao dịch (cột chỉ xem) và dùng đúng ĐƠN VỊ của mức hiện tại. Cần ít nhất một kênh hỗ trợ."
            >
              <div className="flex flex-col">
                {errors.root?.server?.message && (
                  <div className="border-action-primary-red-default bg-data-red-disabled text-data-red-default typo-body-base-medium mb-4 rounded-md border border-solid px-4 py-3 whitespace-pre-line">
                    {errors.root.server.message}
                  </div>
                )}

                <ChannelRow
                  label="Hỗ trợ hoa hồng sale"
                  hint="Cộng thêm vào hoa hồng sale của giao dịch"
                  currentLabel={watchDealId ? 'Hiện tại (chỉ xem)' : undefined}
                  currentValue={currentSaleCommission}
                >
                  <FeeSupportPctAmountField
                    pct={supportSalePct}
                    amt={supportSaleAmount}
                    lockedMode={saleLockedMode}
                    disabled={isPending}
                    error={errors.support_sale_pct?.message || errors.support_sale_amount?.message}
                    onChange={(next) =>
                      writeChannel('support_sale_pct', 'support_sale_amount', next)
                    }
                  />
                </ChannelRow>

                {FEE_SUPPORT_BONUS_REQUEST_ENABLED && (
                  <ChannelRow
                    label="Hỗ trợ thưởng"
                    hint="Cộng thêm vào thưởng CĐT cho sale"
                    currentLabel={watchDealId ? 'Hiện tại (chỉ xem)' : undefined}
                    currentValue={currentBonusToSale}
                  >
                    <FeeSupportPctAmountField
                      pct={supportBonusPct}
                      amt={supportBonusAmount}
                      lockedMode={bonusLockedMode}
                      disabled={isPending}
                      error={
                        errors.support_bonus_pct?.message || errors.support_bonus_amount?.message
                      }
                      onChange={(next) =>
                        writeChannel('support_bonus_pct', 'support_bonus_amount', next)
                      }
                    />
                  </ChannelRow>
                )}

                {/* Khách hàng nhận chiết khấu — khách CỦA GIAO DỊCH, chỉ xem (đứng TRƯỚC dòng chiết khấu) */}
                <div className="border-border-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-4">
                  <div className="min-w-[200px] flex-1">
                    <div className="typo-body-base-semibold text-content-dark-1">
                      Khách hàng nhận chiết khấu
                    </div>
                    <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">
                      Khách trên giao dịch — chỉ xem, không chọn lại
                    </div>
                  </div>
                  <div className="text-right">
                    {watchDealId && dealCustomer ? (
                      <>
                        <div className="typo-body-base-semibold text-content-dark-1">
                          {customerDisplay.name || '—'}
                        </div>
                        <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">
                          {[
                            customerDisplay.identifyNumber
                              ? `${customerDisplay.isBusiness ? 'Mã số thuế' : 'CMND/CCCD'}: ${customerDisplay.identifyNumber}`
                              : null,
                            dealCustomer?.phone ? `SĐT: ${dealCustomer.phone}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </div>
                      </>
                    ) : (
                      <span className="typo-body-base-regular text-content-dark-3">
                        {watchDealId
                          ? 'Giao dịch chưa có khách hàng'
                          : 'Chọn giao dịch để hiển thị'}
                      </span>
                    )}
                    {errors.customer && (
                      <div className="text-data-red-default typo-body-sm-regular mt-1">
                        {errors.customer.message}
                      </div>
                    )}
                  </div>
                </div>

                <ChannelRow
                  label="Chiết khấu khách hàng (hoa hồng)"
                  hint="Phần cắt cho khách / người giới thiệu — khi duyệt, khách trở thành CTV độc lập để nhận chi trả"
                >
                  <FeeSupportPctAmountField
                    pct={customerDiscountPct}
                    amt={customerDiscountAmount}
                    disabled={isPending}
                    error={
                      errors.customer_discount_pct?.message ||
                      errors.customer_discount_amount?.message
                    }
                    onChange={(next) =>
                      writeChannel('customer_discount_pct', 'customer_discount_amount', next)
                    }
                  />
                </ChannelRow>

                {/*
                  Cắt khách phần THƯỞNG — khoét ra từ mức thưởng quy định hiển thị ở
                  `currentValue`, không phải từ một khoản xin thêm (nghiệp vụ không cho
                  xin hỗ trợ thưởng). Nên cột "Hiện tại" ở đây chính là TRẦN của ô này.
                */}
                <ChannelRow
                  label="Chiết khấu khách hàng (thưởng)"
                  hint="Cắt cho khách từ mức thưởng sale đang được hưởng — không làm tăng tổng chi"
                  currentLabel={watchDealId ? 'Mức thưởng hiện tại (trần)' : undefined}
                  currentValue={currentBonusToSale}
                >
                  <FeeSupportPctAmountField
                    pct={customerDiscountBonusPct}
                    amt={customerDiscountBonusAmount}
                    lockedMode={bonusLockedMode}
                    disabled={isPending}
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

                {/*
                  v3 — cờ giữ-đủ-tiền: thêm một điều kiện gate D22, kế toán mở tay được.
                  `pt-4` là bắt buộc: ô tích này đứng ngay sau <ChannelRow> vốn kết thúc
                  bằng `border-b py-4`, nên không có padding trên thì nó dính vào đường
                  kẻ ngang phía trên (86eyqv8yu). Các dòng khác lấy khoảng cách từ `py-4`
                  của chính ChannelRow — dòng này không nằm trong ChannelRow nên phải tự khai.
                */}
                <div className="pt-4">
                  <Controller
                    control={control}
                    name="hold_full_until_paid"
                    render={({ field }) => (
                      <Checkbox
                        label="Giữ toàn bộ hoa hồng tới khi CĐT thanh toán đủ (tránh tranh chấp khoản cắt khách)"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={isPending}
                      />
                    )}
                  />
                </div>
              </div>
            </SectionCard>

            {/* BƯỚC 3: Lý do & Giấy tờ */}
            <SectionCard
              step={3}
              title="Lý do & Giấy tờ chấp thuận"
              description="Giấy tờ chấp thuận của giám đốc dự án — thiếu giấy tờ thì giao dịch bị tạm ngưng chi trả kể cả khi phiếu đã duyệt."
            >
              <div className="flex flex-col gap-4">
                <FormController
                  register={register}
                  name="reason"
                  control={control}
                  Field={TextArea}
                  fieldProps={{
                    label: 'Lý do đề xuất',
                    required: true,
                    placeholder: 'Nhập chi tiết lý do đề xuất...',
                    rows: 4,
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
                      disabled={isPending}
                      required={false}
                    />
                  )}
                />
              </div>
            </SectionCard>

            {/* FOOTER */}
            <Flex gap="4" justify="between" align="center" className="flex-wrap pt-1">
              <Text className="typo-body-sm-regular text-content-dark-3">
                Phiếu tạo từ web chuyển thẳng TP Admin duyệt (luồng rút gọn — bỏ bước đồng ý và 3
                cấp giữa).
              </Text>
              <Flex gap="4" justify="end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isPending}
                  className="w-[150px]"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  loading={isPending}
                  className="w-[150px]"
                >
                  Tạo đề xuất
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </div>
      </Form>
    </FormProvider>
  )
}

export default FeeSupportRequestForm
