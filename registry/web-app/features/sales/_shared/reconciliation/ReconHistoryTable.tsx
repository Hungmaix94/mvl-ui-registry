import type { ReactNode } from 'react'
import { Link, generatePath, useInRouterContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Table } from '@radix-ui/themes'

import { Chip, FullScreenLoading } from '@/components/ui'
import {
  ColoredValueVariant,
  CTVReconciliationPeriod_type,
  CTVReconciliationReconciliation_type,
} from '@/api/schema'
import { ReconciliationStatus as ReconStatus } from '@/constants/api-schema-aliases'
import type { components } from '@/api/schema'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import type { ReconKind, ReconTaxMode } from '@/features/sales/_shared/reconciliation/recon-kind'
import { buildReconHistoryQuery } from '@/features/sales/_shared/reconciliation/recon-history-source'

import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  agencyCommissionFull,
  extraBonusFull,
  filterPriorHistoryRows,
  resolveReconVatRate,
  toNum,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import {
  RECON_PERIOD_BORDER_CLS,
  RECON_PERIOD_BORDER_FALLBACK_CLS,
  RECON_PERIOD_STRIP_CLS,
  RECON_PERIOD_TYPE_LABELS,
  RECON_PERIOD_TYPE_SHORT,
  RECON_RECONCILIATION_TYPE_SHORT,
} from '@/features/sales/_shared/reconciliation/recon-period-type'
import { InvestorReconciliationStatusBadge } from './InvestorReconciliationStatusBadge'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import { formatDate } from '@/utils/date-utils.ts'

// NOTE — schema regen 2026-06-08: period_type, progress_from/to_pct, supplementary_amount,
// extra_bonus_*, fee_deduction, listed_price, vat_*, computed totals (sub_total/total/with_vat) and
// created_by ARE on the history serializer. Schema regen 2026-06-24: period_commission ("HH đợt") is
// NOW serialized too ⇒ mapped straight from BE. STILL NOT serialized: note → shows only on the
// "Đang lập" row.

export type InvestorHistoryRow = components['schemas']['InvestorReconciliationHistory']

export type ReconHistoryCurrentRow = {
  item: InvestorReconciliationSheetCreateItemValues
  periodType: CTVReconciliationPeriod_type
  /** All numbers come from `useReconLineDerived` so the preview row matches the saved rows. */
  periodCommission: number
  retroactiveAdjustment: number
  extraBonusPeriod: number
  subTotal: number
  totalAmount: number
  vatAmount: number
  totalWithVat: number
  /** CĐT: tạm ứng thưởng cấn kỳ này + còn phải thu (từ `useReconLineDerived`); null ⇒ ẩn. */
  sharedBonusPrepaidAmount?: number | null
  amountToCollect?: number | null
}

export interface ReconHistoryTableProps {
  /**
   * Deal PK. Lịch sử scope THEO DEAL (không theo mã căn) để loại đối chiếu của deal cũ đã hủy cọc.
   * Only fetched/rendered when > 0 (the caller also gates on the inline bar being opened).
   */
  dealId: number
  /** Phiếu đang xem/sửa — loại khỏi các dòng lịch sử đã lưu. */
  excludeInvestorSheetId?: number | null
  /** Dòng cuối "Lần này" (#n+1, Đang lập). Ẩn khi kỳ hủy cọc. */
  currentRow?: ReconHistoryCurrentRow | null
}

/* ------------------------------------------------------------------ */
/* Column / band model                                                */
/* ------------------------------------------------------------------ */

type Align = 'left' | 'center' | 'right'

interface LedgerColumn {
  key: string
  /** Economic band this column belongs to (drives the colored header accent). */
  band: ColoredValueVariant
  bandName: string
  header: string
  align: Align
  className: string
}

const LEDGER_COLUMNS: LedgerColumn[] = [
  {
    key: 'period',
    band: ColoredValueVariant.GREY,
    bandName: 'Đợt',
    header: 'Kỳ',
    align: 'left',
    className: 'min-w-[120px]',
  },
  {
    key: 'provenance',
    band: ColoredValueVariant.GREY,
    bandName: 'Đợt',
    header: 'Ngày · Mã ĐC · Người lập',
    align: 'left',
    className: 'min-w-[210px]',
  },
  {
    key: 'price-fee',
    band: ColoredValueVariant.BLUE,
    bandName: 'Giá & phí',
    header: 'Giá tính phí · %HH',
    align: 'right',
    className: 'min-w-[210px]',
  },
  {
    key: 'progress',
    band: ColoredValueVariant.PURPLE,
    bandName: 'Tiến độ',
    header: 'Tiến độ · HH đợt · Truy hồi',
    align: 'right',
    className: 'min-w-[196px]',
  },
  {
    key: 'bonus',
    band: ColoredValueVariant.GREEN,
    bandName: 'Thưởng',
    header: 'Thưởng · Phí tăng thêm',
    align: 'right',
    className: 'min-w-[208px]',
  },
  {
    key: 'deduction',
    band: ColoredValueVariant.ORANGE,
    bandName: 'Khấu trừ',
    header: 'Khấu trừ',
    align: 'right',
    className: 'min-w-[148px]',
  },
  {
    key: 'totals',
    band: ColoredValueVariant.YELLOW,
    bandName: 'Thành tiền',
    header: 'Phải thu (gồm VAT)',
    align: 'right',
    className: 'min-w-[208px]',
  },
]

const BAND_DOT_CLS: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'bg-data-green-default',
  [ColoredValueVariant.BLUE]: 'bg-data-blue-default',
  [ColoredValueVariant.YELLOW]: 'bg-data-yellow-default',
  [ColoredValueVariant.PURPLE]: 'bg-data-purple-default',
  [ColoredValueVariant.RED]: 'bg-data-red-default',
  [ColoredValueVariant.ORANGE]: 'bg-data-orange-default',
  [ColoredValueVariant.GREY]: 'bg-content-dark-3',
}

const BAND_TEXT_CLS: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'text-data-green-default',
  [ColoredValueVariant.BLUE]: 'text-data-blue-default',
  [ColoredValueVariant.YELLOW]: 'text-data-yellow-default',
  [ColoredValueVariant.PURPLE]: 'text-data-purple-default',
  [ColoredValueVariant.RED]: 'text-data-red-default',
  [ColoredValueVariant.ORANGE]: 'text-data-orange-default',
  [ColoredValueVariant.GREY]: 'text-content-dark-2',
}

const BAND_BORDER_CLS: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'border-data-green-default',
  [ColoredValueVariant.BLUE]: 'border-data-blue-default',
  [ColoredValueVariant.YELLOW]: 'border-data-yellow-default',
  [ColoredValueVariant.PURPLE]: 'border-data-purple-default',
  [ColoredValueVariant.RED]: 'border-data-red-default',
  [ColoredValueVariant.ORANGE]: 'border-data-orange-default',
  [ColoredValueVariant.GREY]: 'border-content-dark-3',
}

const ALIGN_CLS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Sticky right rail for the "Phải thu (Thành tiền)" column + opaque cell backgrounds are driven by
 * scoped CSS in `assets/styles/radix-overide.css` (`.recon-history-table …`), NOT Tailwind utilities:
 * Radix Themes paints cell backgrounds with higher source-order priority than Tailwind `bg-*`, so a
 * utility on the cell renders transparent and lets columns underneath bleed through on scroll.
 */
const RECON_HISTORY_TABLE_CLS = 'recon-history-table'
const RECON_HISTORY_CURRENT_ROW_CLS = 'recon-history-current-row'

/* ------------------------------------------------------------------ */
/* Row view-model                                                     */
/* ------------------------------------------------------------------ */

type StatusValue = ReconStatus

export interface ReconRowVM {
  key: string | number
  roundIndex: number
  priorRoundIndex: number | null
  isCurrent: boolean
  isVoided: boolean
  // Kỳ
  status?: StatusValue
  periodType: CTVReconciliationPeriod_type | null
  reconciliationType: CTVReconciliationReconciliation_type | null
  // Ngày · Mã ĐC · Người lập
  effectiveDate: string
  createdLabel: string | null
  code: string | null
  sheetId: number | null
  detailCode: string | null
  createdById: number | null
  createdByCode: string | null
  createdByName: string | null
  createdByDept: string | null
  createdByBranch: string | null
  createdByBlock: string | null
  createdByPosition: string | null
  note: string | null
  // Giá · %HH
  feePrice: number
  priorPrice: number | null
  listedPrice: number | null
  pctAgencyFee: number | null
  amtAgencyFee: number | null
  fullCommission: number
  vatRate: number | null
  // Cờ VAT theo từng mục (is_*_include_vat) — quyết định mục nào "gồm VAT".
  agencyVat: boolean
  extraVat: boolean
  supplementaryVat: boolean
  deductionVat: boolean
  // Tiến độ · HH đợt
  progressFrom: number | null
  progressTo: number | null
  amtPaymentThisPeriod: number | null
  /** "HH đợt" — map thẳng từ BE `period_commission` (history serializer); null khi BE để trống. */
  periodCommission: number | null
  // Truy hồi
  retroactive: number
  // Thưởng · Phí tăng thêm
  /** Thưởng GHI NHẬN kỳ (shared_bonus_period_amount) — số đã vào net của kỳ đó. */
  supplementary: number
  extraBonusPct: number | null
  extraBonusAmount: number | null
  extraProgressFrom: number | null
  extraProgressTo: number | null
  extraBonusPeriod: number
  // Khấu trừ
  feeDeduction: number
  feeDeductionToSale: number | null
  // Thành tiền
  subTotal: number
  totalAmount: number
  vatAmount: number
  totalWithVat: number
  /** NET (chưa VAT) tính PER-FIELD: chỉ mục bật cờ is_*_include_vat mới trừ VAT (= /(1+rate/100)). */
  netAmount: number
  /** "Phải thu (CĐT trả)" cơ sở GỒM VAT per-field: mục chưa gồm VAT ×(1+rate/100) (= netAmount×(1+r)). */
  receivableInclusive: number
  /** CĐT: tạm ứng thưởng đã cấn trừ kỳ đó (BE `shared_bonus_prepaid_amount`); null/0 ⇒ ẩn dòng. */
  sharedBonusPrepaidAmount: number | null
  /** CĐT: còn phải thu = total_amount_with_vat − prepaid (BE `amount_to_collect`); FE không tự tính. */
  amountToCollect: number | null
}

/** Number from a decimal-string / number field; null when empty (keeps "0" as a real 0). */
function numOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  return toNum(v)
}

/** "0" amt means "no fixed amount" (XOR with %) — treat as null so the % branch stays authoritative. */
function amtOrNull(v: number | string | null | undefined): number | null {
  const n = numOrNull(v)
  return n != null && n !== 0 ? n : null
}

const vnd = (value: number): string => `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`

function formatHistoryDate(row: InvestorHistoryRow): string {
  const raw =
    row.confirmed_at ?? row.investor_sheet_detail?.reconciliation_date ?? row.created_at ?? null
  return formatDate(raw) ?? '-'
}

export function buildHistoryVM(
  row: InvestorHistoryRow,
  priorRow: InvestorHistoryRow | undefined,
  idx: number
): ReconRowVM {
  const feePrice = toNum(row.fee_calculation_price)
  const pctAgencyFee = numOrNull(row.pct_agency_fee)
  const amtAgencyFee = amtOrNull(row.amt_agency_fee)
  const listedPrice = numOrNull(row.listed_price)
  const effectiveDate = formatHistoryDate(row)
  // "Lập <ngày>" only when the creation date differs from the (confirmed) effective date.
  const createdShort = row.confirmed_at ? formatDate(row.created_at) : null
  const createdLabel = createdShort && createdShort !== effectiveDate ? createdShort : null

  // VAT luôn áp dụng (mặc định 10%) — kỳ cũ lưu null (model cũ "tắt hết cờ ⇒ null") quy về mặc định.
  const vatRate = resolveReconVatRate(row.vat_rate)
  const agencyVat = !!row.is_agency_fee_include_vat
  const extraVat = !!row.is_extra_bonus_include_vat
  const supplementaryVat = !!row.is_shared_bonus_include_vat
  const deductionVat = !!row.is_fee_deduction_include_vat
  // FE KHÔNG tự tính: map thẳng số BE trên history row.
  // "HH đợt" — BE đã bổ sung `period_commission` trên history serializer (2026-06-24) ⇒ map thẳng;
  // BE để trống (chuỗi rỗng) ⇒ null (hiển thị —).
  const periodCommission: number | null = numOrNull(row.period_commission)
  const retroactive = toNum(row.retroactive_adjustment_amount)

  const progressFrom = numOrNull(row.progress_from_pct)
  const progressTo = numOrNull(row.progress_to_pct)
  const extraProgressFrom = numOrNull(row.extra_bonus_progress_from_pct)
  const extraProgressTo = numOrNull(row.extra_bonus_progress_to_pct)

  const baseDelta =
    progressFrom != null && progressTo != null ? (progressTo - progressFrom) / 100 : 0
  const extraDelta =
    extraProgressFrom != null && extraProgressTo != null
      ? (extraProgressTo - extraProgressFrom) / 100
      : baseDelta

  const ebFull = extraBonusFull({
    feeCalculationPrice: feePrice,
    extraBonusPct: numOrNull(row.extra_bonus_pct),
    extraBonusAmount: amtOrNull(row.extra_bonus_amount),
  })
  const extraBonusPeriod =
    row.extra_bonus_period_amount !== undefined
      ? toNum(row.extra_bonus_period_amount)
      : Math.round(ebFull * extraDelta)

  // Thưởng kỳ đó = số GHI NHẬN (shared_bonus_period_amount), không phải tổng thưởng benchmark.
  const supplementary =
    row.shared_bonus_period_amount !== undefined
      ? toNum(row.shared_bonus_period_amount)
      : toNum((row as any).shared_bonus_amount) + toNum((row as any).mv_bonus_amount)
  const feeDeduction = toNum(row.fee_deduction)

  return {
    key: row.id,
    roundIndex: idx + 1,
    priorRoundIndex: idx > 0 ? idx : null,
    isCurrent: false,
    isVoided: row.status === ReconStatus.voided,
    status: row.status,
    periodType: row.period_type ?? null,
    reconciliationType: row.reconciliation_type ?? null,
    effectiveDate,
    createdLabel,
    code: row.code,
    sheetId: row.investor_sheet,
    detailCode: row.investor_sheet_detail?.code ?? null,
    createdById: row.created_by?.id ?? null,
    createdByCode: row.created_by?.code ?? null,
    createdByName: row.created_by?.fullname ?? null,
    createdByDept: row.created_by?.department?.name ?? null,
    createdByBranch: row.created_by?.branch?.name ?? null,
    createdByBlock: row.created_by?.block?.name ?? null,
    createdByPosition: row.created_by?.position?.name ?? null,
    note: null,
    feePrice,
    priorPrice: priorRow ? toNum(priorRow.fee_calculation_price) : null,
    listedPrice,
    pctAgencyFee,
    amtAgencyFee,
    fullCommission: agencyCommissionFull({
      feeCalculationPrice: feePrice,
      pctAgencyFee,
      amtAgencyFee,
    }),
    vatRate,
    agencyVat,
    extraVat,
    supplementaryVat,
    deductionVat,
    progressFrom: numOrNull(row.progress_from_pct),
    progressTo: numOrNull(row.progress_to_pct),
    amtPaymentThisPeriod: numOrNull(row.total_amount),
    periodCommission,
    retroactive,
    supplementary,
    extraBonusPct: numOrNull(row.extra_bonus_pct),
    extraBonusAmount: amtOrNull(row.extra_bonus_amount),
    extraProgressFrom: numOrNull(row.extra_bonus_progress_from_pct),
    extraProgressTo: numOrNull(row.extra_bonus_progress_to_pct),
    extraBonusPeriod,
    feeDeduction,
    feeDeductionToSale: numOrNull(row.fee_deduction_to_sale_amount),
    subTotal: toNum(row.sub_total_commission),
    totalAmount: toNum(row.total_amount),
    vatAmount: toNum(row.vat_amount),
    totalWithVat: toNum(row.total_amount_with_vat),
    // NET / Phải thu lấy THẲNG từ BE (total_amount / total_amount_with_vat) — FE không tự tính per-field.
    netAmount: toNum(row.total_amount),
    receivableInclusive: toNum(row.total_amount_with_vat),
    // Tạm ứng thưởng CĐT: map thẳng từ BE (history serializer đã có 2026-07-07); null khi trống ⇒ ẩn.
    sharedBonusPrepaidAmount: numOrNull(row.shared_bonus_prepaid_amount),
    amountToCollect: numOrNull(row.amount_to_collect),
  }
}

function buildCurrentVM(
  current: ReconHistoryCurrentRow,
  lastHistoryRow: InvestorHistoryRow | undefined,
  roundIndex: number
): ReconRowVM {
  const { item } = current
  const feePrice = toNum(item.fee_calculation_price)
  const pctAgencyFee = numOrNull(item.pct_agency_fee)
  const amtAgencyFee = amtOrNull(item.amt_agency_fee)
  const vatRate = resolveReconVatRate(item.vat_rate)
  const agencyVat = !!item.is_agency_fee_include_vat
  const extraVat = !!item.is_extra_bonus_include_vat
  const supplementaryVat = !!item.is_shared_bonus_include_vat
  const deductionVat = !!item.is_fee_deduction_include_vat
  const supplementary = toNum(item.shared_bonus_period_amount)
  const feeDeduction = toNum(item.fee_deduction)

  return {
    key: 'current',
    roundIndex,
    priorRoundIndex: roundIndex > 1 ? roundIndex - 1 : null,
    isCurrent: true,
    isVoided: false,
    status: undefined,
    periodType: current.periodType,
    reconciliationType: item.reconciliation_type ?? null,
    effectiveDate: 'Đang lập',
    createdLabel: null,
    code: null,
    sheetId: null,
    detailCode: null,
    createdById: null,
    createdByCode: null,
    createdByName: null,
    createdByDept: null,
    createdByBranch: null,
    createdByBlock: null,
    createdByPosition: null,
    note: item.note?.trim() ? item.note : null,
    feePrice,
    priorPrice: lastHistoryRow ? toNum(lastHistoryRow.fee_calculation_price) : null,
    listedPrice: null,
    pctAgencyFee,
    amtAgencyFee,
    fullCommission: agencyCommissionFull({
      feeCalculationPrice: feePrice,
      pctAgencyFee,
      amtAgencyFee,
    }),
    vatRate,
    agencyVat,
    extraVat,
    supplementaryVat,
    deductionVat,
    progressFrom: numOrNull(item.progress_from_pct),
    progressTo: numOrNull(item.progress_to_pct),
    amtPaymentThisPeriod: numOrNull(item.amt_payment_this_period),
    periodCommission: current.periodCommission,
    retroactive: current.retroactiveAdjustment,
    supplementary,
    extraBonusPct: numOrNull(item.extra_bonus_pct),
    extraBonusAmount: amtOrNull(item.extra_bonus_amount),
    extraProgressFrom: numOrNull(item.extra_bonus_progress_from_pct),
    extraProgressTo: numOrNull(item.extra_bonus_progress_to_pct),
    extraBonusPeriod: current.extraBonusPeriod,
    feeDeduction,
    feeDeductionToSale: numOrNull(item.fee_deduction_to_sale_amount),
    subTotal: current.subTotal,
    totalAmount: current.totalAmount,
    vatAmount: current.vatAmount,
    totalWithVat: current.totalWithVat,
    // NET / Phải thu lấy THẲNG từ tổng BE của dòng hiện tại (total_amount / total_amount_with_vat).
    netAmount: current.totalAmount,
    receivableInclusive: current.totalWithVat,
    sharedBonusPrepaidAmount: current.sharedBonusPrepaidAmount ?? null,
    amountToCollect: current.amountToCollect ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Shared presentational primitives                                   */
/* ------------------------------------------------------------------ */

const MutedDash = () => <span className="text-content-dark-3">—</span>

/** Signed money: +xanh / −đỏ / 0→dash. `emphasize` bumps the weight for the primary line. */
function SignedMoney({ value, emphasize = false }: { value: number; emphasize?: boolean }) {
  if (value === 0) return <MutedDash />
  const positive = value > 0
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        positive ? 'text-data-green-default' : 'text-data-red-default',
        emphasize ? 'typo-body-base-semibold' : 'typo-body-base-medium'
      )}
    >
      {positive ? '+' : '−'}
      {vnd(Math.abs(value))}
    </span>
  )
}

/**
 * Chip VAT của cả kỳ — badge "VAT" xanh nhất quán với {@link VatMark}; hover hiện mức % (title).
 * `null`/0 ⇒ "Không VAT" mờ.
 */
function VatChip({ vatRate }: { vatRate: number | null }) {
  if (vatRate == null || vatRate <= 0) {
    return <span className="typo-body-xs-regular text-content-dark-3">Không VAT</span>
  }
  return (
    <span
      title={`VAT ${formatPercent(vatRate)}`}
      className="bg-data-blue-disabled text-data-blue-hover typo-body-xs-medium inline-flex w-fit cursor-help items-center rounded px-1.5 py-px leading-tight whitespace-nowrap"
    >
      VAT
    </span>
  )
}

/**
 * Dấu VAT nhỏ gắn sau một mục tiền — chỉ hiện khi mục đó gồm VAT (cờ is_*_include_vat). Cùng style
 * badge "VAT" xanh với {@link VatChip}; hover hiện mức % (title) — hai chỗ hiển thị VAT đồng nhất.
 */
function VatMark({ on, rate }: { on: boolean; rate?: number | null }) {
  if (!on) return null
  return (
    <span
      title={rate != null && rate > 0 ? `VAT ${formatPercent(rate)}` : undefined}
      className="bg-data-blue-disabled text-data-blue-hover typo-body-xs-regular ml-1 cursor-help rounded px-1 leading-none"
    >
      VAT
    </span>
  )
}

function PeriodTypePill({ periodType }: { periodType: CTVReconciliationPeriod_type | null }) {
  if (!periodType) return <MutedDash />
  return (
    <span
      title={`Loại kỳ: ${RECON_PERIOD_TYPE_LABELS[periodType]}`}
      className={cn(
        'typo-body-xs-semibold inline-flex w-fit cursor-help rounded-full px-2 py-0.5 whitespace-nowrap',
        RECON_PERIOD_STRIP_CLS[periodType]
      )}
    >
      {RECON_PERIOD_TYPE_SHORT[periodType]}
    </span>
  )
}

const SHEET_CODE_BADGE_CLS =
  'bg-background-3 typo-body-xs-regular inline-flex w-fit rounded px-1.5 py-0.5'

function ReconHistorySheetCode({
  code,
  sheetId,
  canOpenDetail,
  detailPathTemplate,
}: {
  code: string
  sheetId: number | null
  canOpenDetail: boolean
  /** Sheet-detail route template (kind-aware: investor vs F2). */
  detailPathTemplate: string
}) {
  // This card can be hosted inside <GlobalDialog>, which renders as a sibling of <RouterProvider> in
  // App.tsx (outside the router tree) — react-router's <Link> throws there ("Cannot destructure
  // property 'basename' of ... null"). Fall back to a plain anchor when no router context exists;
  // routed pages (edit/detail) keep <Link> unchanged.
  const inRouterContext = useInRouterContext()
  const detailPath =
    sheetId != null && sheetId > 0 && canOpenDetail
      ? generatePath(detailPathTemplate, { id: String(sheetId) })
      : null

  if (detailPath) {
    const linkClassName = cn(
      SHEET_CODE_BADGE_CLS,
      'text-content-dark-2 hover:bg-background-2 hover:text-action-primary-red-default cursor-pointer underline-offset-2 hover:underline'
    )
    return inRouterContext ? (
      <Link
        to={detailPath}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        title={`Xem chi tiết đối chiếu ${code}`}
      >
        {code} ↗
      </Link>
    ) : (
      <a
        href={detailPath}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        title={`Xem chi tiết đối chiếu ${code}`}
      >
        {code} ↗
      </a>
    )
  }

  return (
    <span className={cn(SHEET_CODE_BADGE_CLS, 'text-content-dark-3')} title={code}>
      {code}
    </span>
  )
}

function RoundBadge({
  n,
  tone,
  title,
}: {
  n: number
  tone: 'neutral' | 'current'
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'typo-body-xs-semibold inline-flex w-fit cursor-help rounded px-1.5 py-0.5',
        tone === 'current'
          ? 'bg-data-blue-disabled text-data-blue-hover'
          : 'bg-background-3 text-content-dark-2'
      )}
    >
      #{n}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Cell renderers                                                     */
/* ------------------------------------------------------------------ */

function PeriodCell({ vm }: { vm: ReconRowVM }) {
  const borderTone = vm.isCurrent
    ? 'border-data-blue-default'
    : vm.periodType
      ? RECON_PERIOD_BORDER_CLS[vm.periodType]
      : RECON_PERIOD_BORDER_FALLBACK_CLS

  return (
    <div className={cn('flex flex-col items-start gap-1 border-l-[3px] pl-2.5', borderTone)}>
      <RoundBadge
        n={vm.roundIndex}
        tone={vm.isCurrent ? 'current' : 'neutral'}
        title={
          vm.isCurrent
            ? 'Đợt đang lập (chưa lưu) — sẽ là đợt đối chiếu kế tiếp của căn này'
            : `Đợt đối chiếu thứ ${vm.roundIndex} của căn này`
        }
      />
      {vm.isCurrent ? (
        <span title="Dòng đang nhập, chưa lưu vào lịch sử">
          <Chip label="Đang lập" variant={ColoredValueVariant.BLUE} type="outlined" size="small" />
        </span>
      ) : vm.status ? (
        <span className="cursor-help" title="Trạng thái đối chiếu của đợt này">
          <InvestorReconciliationStatusBadge status={vm.status} />
        </span>
      ) : null}
      <PeriodTypePill periodType={vm.periodType} />
      {vm.reconciliationType && (
        <span
          className="typo-body-xs-regular text-content-dark-2 cursor-help"
          title="Loại đối chiếu — Tạm ứng: ghi nhận hoa hồng theo tiến độ thanh toán; Tất toán: chốt khi căn đạt 100% tiến độ"
        >
          {RECON_RECONCILIATION_TYPE_SHORT[vm.reconciliationType]}
        </span>
      )}
    </div>
  )
}

function ProvenanceCell({
  vm,
  canOpenDetail,
  detailPathTemplate,
}: {
  vm: ReconRowVM
  canOpenDetail: boolean
  detailPathTemplate: string
}) {
  if (vm.isCurrent) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="typo-body-base-semibold text-data-blue-hover">Đang lập</span>
        <span className="typo-body-xs-regular text-content-dark-2">-- hiện tại --</span>
        {vm.note && (
          <span
            className="typo-body-xs-regular text-content-dark-2 mt-0.5 line-clamp-2"
            title={vm.note}
          >
            Ghi chú: {vm.note}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="typo-body-base-semibold text-content-dark-1">{vm.effectiveDate}</span>
      {vm.createdLabel && (
        <span className="typo-body-xs-regular text-content-dark-2">Lập {vm.createdLabel}</span>
      )}
      {/* Mã đối chiếu của dòng (vd DALVT-IRS1180-001 = căn #1 của phiếu); link mở chi tiết phiếu.
          KHÔNG lặp lại mã phiếu rời vì nó đã là tiền tố của mã dòng. */}
      {vm.code && (
        <ReconHistorySheetCode
          code={vm.code}
          sheetId={vm.sheetId}
          canOpenDetail={canOpenDetail}
          detailPathTemplate={detailPathTemplate}
        />
      )}
      {vm.createdByName ? (
        <div className="flex flex-col gap-0.5">
          {/* Mã NV · Tên — link mở hồ sơ nhân viên ở tab mới; tự về text khi thiếu quyền retrieve employee. */}
          <EmployeeProfileLink
            employeeId={vm.createdById}
            title={`Xem hồ sơ nhân viên ${vm.createdByName}`}
            className="typo-body-xs-medium"
          >
            {vm.createdByCode ? `${vm.createdByCode} · ` : ''}
            {vm.createdByName}
          </EmployeeProfileLink>
          {(vm.createdByBranch || vm.createdByBlock || vm.createdByDept) && (
            // Thông tin tổ chức stack trên–dưới, có nhãn căn cột cho rõ: chi nhánh → khối → phòng ban.
            <div className="typo-body-xs-regular mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              {vm.createdByBranch && (
                <>
                  <span className="text-content-dark-4">Chi nhánh</span>
                  <span className="text-content-dark-2">{vm.createdByBranch}</span>
                </>
              )}
              {vm.createdByBlock && (
                <>
                  <span className="text-content-dark-4">Khối</span>
                  <span className="text-content-dark-2">{vm.createdByBlock}</span>
                </>
              )}
              {vm.createdByDept && (
                <>
                  <span className="text-content-dark-4">Phòng ban</span>
                  <span className="text-content-dark-2">{vm.createdByDept}</span>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <MutedDash />
      )}
    </div>
  )
}

/**
 * %HH cell — hiển thị ĐÚNG giá trị user nhập, KHÔNG quy đổi: %HH nhập theo % → hiện "5,15%"; nhập
 * theo số tiền cố định → hiện "Cố định {tiền}". Hoa hồng đợt (đã nhân tiến độ) ở cột "Tiến độ · HH đợt".
 */
function AgencyFeeValue({ vm }: { vm: ReconRowVM }) {
  let content: ReactNode
  if (vm.amtAgencyFee != null) content = <>Cố định {vnd(vm.amtAgencyFee)}</>
  else if (vm.pctAgencyFee != null) content = formatPercent(vm.pctAgencyFee)
  else content = <MutedDash />

  return (
    <div className="flex flex-col items-end">
      <span className="typo-body-xs-regular text-content-dark-2">%HH</span>
      <span className="typo-body-base-semibold text-content-dark-1 whitespace-nowrap">
        {content}
      </span>
    </div>
  )
}

function PriceFeeCell({ vm }: { vm: ReconRowVM }) {
  // Nhãn VAT của kỳ chỉ hiện khi config VAT thực sự bật — tức có ÍT NHẤT một mục bật cờ
  // is_*_include_vat. Không mục nào bật ⇒ kỳ không khai VAT → hiện "Không VAT", KHÔNG hiện "VAT 10%"
  // (mức `vat_rate` luôn mặc định 10 nên nếu bám vào nó nhãn sẽ luôn hiện sai — yêu cầu 2026-06-15).
  const anyVatField = vm.agencyVat || vm.extraVat || vm.supplementaryVat || vm.deductionVat
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-col items-end">
        <span className="typo-body-xs-regular text-content-dark-2">Giá tính phí</span>
        <span className="typo-body-base-semibold text-content-dark-1 whitespace-nowrap">
          {vnd(vm.feePrice)}
        </span>
      </div>
      <AgencyFeeValue vm={vm} />
      <VatChip vatRate={anyVatField ? vm.vatRate : null} />
    </div>
  )
}

function ProgressCell({ vm }: { vm: ReconRowVM }) {
  // Bên chi trả khoản giải ngân kỳ này: CĐT (đối chiếu CĐT) | MV (đối chiếu F2 — MV giải ngân Sàn F2).
  const { payerLabel } = useReconKind()
  const { progressFrom, progressTo } = vm
  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Lũy kế tiến độ from → to lấy THẲNG từ BE (progress_from_pct / progress_to_pct). FE không tính Δ. */}
      {progressFrom != null && progressTo != null ? (
        <span className="typo-body-base-semibold text-content-dark-1 whitespace-nowrap">
          {formatPercent(progressFrom)} → {formatPercent(progressTo)}
        </span>
      ) : (
        <MutedDash />
      )}
      <div className="flex flex-col items-end">
        <span className="typo-body-xs-regular text-content-dark-2">HH đợt</span>
        {/* Map thẳng từ BE period_commission (history serializer); null (BE để trống) ⇒ —. */}
        <span className="typo-body-base-semibold text-content-dark-1 inline-flex items-center whitespace-nowrap">
          {vm.periodCommission == null ? <MutedDash /> : vnd(vm.periodCommission)}
          {vm.periodCommission != null && <VatMark on={vm.agencyVat} rate={vm.vatRate} />}
        </span>
      </div>
      {vm.amtPaymentThisPeriod != null && vm.amtPaymentThisPeriod > 0 && (
        <span className="typo-body-xs-regular text-content-dark-2 whitespace-nowrap">
          {payerLabel} trả {vnd(vm.amtPaymentThisPeriod)}
        </span>
      )}
      {/* Truy hồi — gộp từ cột riêng trước đây vào cột Tiến độ; chỉ hiện khi ≠ 0. */}
      {vm.retroactive !== 0 && (
        <div className="border-border-1 flex w-full flex-col items-end border-t pt-1">
          <span className="typo-body-xs-regular text-content-dark-2">Truy hồi</span>
          <span className="inline-flex items-center">
            <SignedMoney value={vm.retroactive} emphasize />
            <VatMark on={vm.agencyVat} rate={vm.vatRate} />
          </span>
          {vm.priorRoundIndex != null && (
            <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
              so kỳ #{vm.priorRoundIndex}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function BonusCell({ vm }: { vm: ReconRowVM }) {
  const hasExtra = vm.extraBonusPct != null || vm.extraBonusAmount != null
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-col items-end">
        <span className="typo-body-xs-regular text-content-dark-2">Thưởng</span>
        <span className="inline-flex items-center">
          <SignedMoney value={vm.supplementary} emphasize />
          <VatMark on={vm.supplementaryVat} rate={vm.vatRate} />
        </span>
      </div>
      {hasExtra && (
        <div className="border-border-1 flex w-full flex-col items-end border-t pt-1">
          <span className="typo-body-xs-regular text-content-dark-2">Phí tăng thêm đợt</span>
          <span className="inline-flex items-center">
            <SignedMoney value={vm.extraBonusPeriod} emphasize />
            <VatMark on={vm.extraVat} rate={vm.vatRate} />
          </span>
        </div>
      )}
    </div>
  )
}

function DeductionCell({ vm }: { vm: ReconRowVM }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="typo-body-xs-regular text-content-dark-2">Khấu trừ</span>
      <span className="inline-flex items-center">
        <SignedMoney value={-vm.feeDeduction} emphasize />
        <VatMark on={vm.deductionVat} rate={vm.vatRate} />
      </span>
      {vm.feeDeductionToSale != null && (
        <span className="typo-body-xs-regular text-content-dark-2 whitespace-nowrap">
          áp vào Sale {vnd(vm.feeDeductionToSale)}
        </span>
      )}
    </div>
  )
}

/** Receivable amount: neutral when ≥ 0, red "(truy thu)" when negative (clawback). */
function ReceivableAmount({ value, strong }: { value: number; strong?: boolean }) {
  const negative = value < 0
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        negative ? 'text-data-red-default' : 'text-content-dark-1',
        strong ? 'typo-body-base-semibold' : 'typo-body-base-medium'
      )}
    >
      {negative ? '−' : ''}
      {vnd(Math.abs(value))}
    </span>
  )
}

function TotalsCell({ vm }: { vm: ReconRowVM }) {
  // FE KHÔNG tự tính: Phải thu / NET / VAT lấy THẲNG từ tổng BE của dòng (total_amount_with_vat /
  // total_amount / vat_amount) cho mọi loại đối chiếu (CĐT & F2).
  const receivable = vm.totalWithVat
  const net = vm.totalAmount
  const vatExtracted = vm.vatAmount
  // NET (chưa VAT) + phần VAT CHỈ hiện khi VAT thực sự áp dụng (Phải thu ≠ NET) — tránh "gồm VAT 0đ".
  const showNet = Math.abs(vatExtracted) >= 1
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex w-full items-center justify-end gap-1">
        {/* Nhãn "Phải thu" đã bỏ (header cột đã ghi rõ); chỉ hiện số + dấu truy thu khi âm. */}
        <span className="decoration-border-2 underline underline-offset-2">
          <ReceivableAmount value={receivable} strong />
        </span>
        {receivable < 0 && (
          <span className="typo-body-xs-regular text-data-red-default">(truy thu)</span>
        )}
      </div>

      {showNet && (
        <>
          <span className="typo-body-xs-regular text-content-dark-2 whitespace-nowrap">
            NET chưa gồm VAT {vnd(net)}
          </span>
          <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
            Tiền VAT {vnd(vatExtracted)} · {formatPercent(vm.vatRate)}
          </span>
        </>
      )}

      {/* Tạm ứng thưởng CĐT: "Phải thu" giữ tổng nghĩa vụ; hiện phần đã cấn + "Còn phải thu"
          (số BE) khi kỳ đó có cấn tạm ứng — nhất quán với hoá đơn & tổng phiếu đối chiếu. */}
      {vm.sharedBonusPrepaidAmount != null && vm.sharedBonusPrepaidAmount > 0 && (
        <>
          <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
            Đã tạm ứng {vnd(-vm.sharedBonusPrepaidAmount)}
          </span>
          {vm.amountToCollect != null && (
            <span className="typo-body-base-semibold text-content-dark-1 whitespace-nowrap">
              Còn phải thu {vnd(vm.amountToCollect)}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Row                                                                */
/* ------------------------------------------------------------------ */

function LedgerRow({
  vm,
  canOpenDetail,
  detailPathTemplate,
}: {
  vm: ReconRowVM
  canOpenDetail: boolean
  detailPathTemplate: string
}) {
  return (
    <Table.Row
      // Cell backgrounds (incl. the sticky rail + current-row tint) come from scoped CSS, since
      // Radix overrides Tailwind `bg-*` on cells. Here we only flag the current row + dim voided.
      className={cn(
        'border-border-1 border-b last:border-b-0',
        vm.isCurrent && RECON_HISTORY_CURRENT_ROW_CLS,
        vm.isVoided && 'opacity-60'
      )}
    >
      <Table.Cell className="px-3 py-3 align-top">
        <PeriodCell vm={vm} />
      </Table.Cell>
      <Table.Cell className="px-3 py-3 align-top">
        <ProvenanceCell
          vm={vm}
          canOpenDetail={canOpenDetail}
          detailPathTemplate={detailPathTemplate}
        />
      </Table.Cell>
      <Table.Cell className="px-3 py-3 text-right align-top">
        <PriceFeeCell vm={vm} />
      </Table.Cell>
      <Table.Cell className="px-3 py-3 text-right align-top">
        <ProgressCell vm={vm} />
      </Table.Cell>
      <Table.Cell className="px-3 py-3 text-right align-top">
        <BonusCell vm={vm} />
      </Table.Cell>
      <Table.Cell className="px-3 py-3 text-right align-top">
        <DeductionCell vm={vm} />
      </Table.Cell>
      {/* Sticky rail (position + opaque bg + shadow) is the last-child rule in radix-overide.css. */}
      <Table.Cell className="px-3 py-3 text-right align-top">
        <TotalsCell vm={vm} />
      </Table.Cell>
    </Table.Row>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

function LedgerHeader({ taxMode }: { taxMode: ReconTaxMode }) {
  return (
    <Table.Header className="bg-background-2">
      <Table.Row>
        {LEDGER_COLUMNS.map((col, idx) => {
          const isBandLead = idx === 0 || LEDGER_COLUMNS[idx - 1]?.band !== col.band
          // Cột "Thành tiền": CĐT/F2 khung VAT; CTV là PIT (không VAT) ⇒ nhãn "Thực nhận (sau TNCN)".
          const header =
            col.key === 'totals' && taxMode === 'pit' ? 'Thực nhận (sau TNCN)' : col.header
          // The last column ("Thành tiền") sticks right — handled by the scoped last-child CSS rule.
          return (
            <Table.ColumnHeaderCell
              key={col.key}
              // Vertical centering comes from the scoped `.recon-history-table .rt-TableColumnHeaderCell`
              // rule (Radix overrides Tailwind vertical-align utilities on header cells).
              className={cn(
                'border-t-2 px-3 py-2',
                BAND_BORDER_CLS[col.band],
                ALIGN_CLS[col.align],
                col.className
              )}
            >
              <div
                className={cn(
                  'flex flex-col justify-center gap-0.5',
                  col.align === 'right' && 'items-end',
                  col.align === 'center' && 'items-center'
                )}
              >
                {/* Band eyebrow rendered on every column (invisible on non-lead) so all header cells
                    share the exact same height → leaf labels stay aligned + the block centers cleanly. */}
                <span className={cn('flex items-center gap-1', !isBandLead && 'invisible')}>
                  <span
                    className={cn('size-[6px] shrink-0 rounded-full', BAND_DOT_CLS[col.band])}
                  />
                  <span className={cn('typo-body-xs-semibold uppercase', BAND_TEXT_CLS[col.band])}>
                    {col.bandName}
                  </span>
                </span>
                <span className="typo-body-xs-semibold text-content-dark-2 uppercase">
                  {header}
                </span>
              </div>
            </Table.ColumnHeaderCell>
          )
        })}
      </Table.Row>
    </Table.Header>
  )
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

/** Quyền `retrieve` phiếu + route chi tiết theo preset đối chiếu (CĐT / F2 / CTV). */
const RECON_SHEET_SUBJECT_BY_KIND: Record<ReconKind, string> = {
  investor: 'investor_reconciliation_sheet',
  f2: 'f2_reconciliation_sheet',
  ctv: 'ctv_reconciliation_sheet',
}
const RECON_DETAIL_PATH_BY_KIND: Record<ReconKind, string> = {
  investor: APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
  f2: APP_PATH.F2_RECONCILIATION_DETAIL,
  ctv: APP_PATH.CTV_RECONCILIATION_DETAIL,
}

function ReconHistoryTable({ dealId, excludeInvestorSheetId, currentRow }: ReconHistoryTableProps) {
  // Preset đối chiếu chọn endpoint + route + quyền + khung thuế (VAT/PIT) của bảng lịch sử.
  const { kind, taxMode } = useReconKind()
  const ability = useAbility()
  const canOpenSheetDetail = ability.can('retrieve', RECON_SHEET_SUBJECT_BY_KIND[kind])
  const detailPathTemplate = RECON_DETAIL_PATH_BY_KIND[kind]

  const { data, isLoading } = useQuery(buildReconHistoryQuery(kind, dealId))

  const priorRows = filterPriorHistoryRows(data?.results ?? [], excludeInvestorSheetId)
  // API sorts newest → oldest; reverse to render oldest (#1) at top, newest at the bottom.
  const historyRows = [...priorRows].reverse()
  const showCurrentRow =
    currentRow != null && currentRow.periodType !== CTVReconciliationPeriod_type.cancellation

  if (isLoading) {
    return <FullScreenLoading className="h-[unset] min-h-[unset] flex-1 py-6" />
  }

  if (historyRows.length === 0 && !showCurrentRow) {
    return (
      <p className="typo-body-base text-content-dark-3 py-4 text-center">
        Không có lịch sử đối chiếu.
      </p>
    )
  }

  const currentRound = historyRows.length + 1
  const lastHistoryRow = historyRows[historyRows.length - 1]

  const rowVMs = historyRows.map((row, idx) =>
    buildHistoryVM(row, idx > 0 ? historyRows[idx - 1] : undefined, idx)
  )

  return (
    // Single scroll container: let Radix Table.Root own the horizontal scroll (its built-in scroll
    // area). Wrapping it in another overflow-x-auto produced TWO scrollbars and offset the sticky
    // rail. Per-column min-w drives the intrinsic width that triggers Radix's scroll on small views.
    <div className="w-full">
      <Table.Root size="1" className={cn('w-full', RECON_HISTORY_TABLE_CLS)}>
        <LedgerHeader taxMode={taxMode} />
        <Table.Body>
          {rowVMs.map((vm) => (
            <LedgerRow
              key={vm.key}
              vm={vm}
              canOpenDetail={canOpenSheetDetail}
              detailPathTemplate={detailPathTemplate}
            />
          ))}
          {showCurrentRow && currentRow && (
            <LedgerRow
              vm={buildCurrentVM(currentRow, lastHistoryRow, currentRound)}
              canOpenDetail={canOpenSheetDetail}
              detailPathTemplate={detailPathTemplate}
            />
          )}
        </Table.Body>
      </Table.Root>
    </div>
  )
}

export default ReconHistoryTable
