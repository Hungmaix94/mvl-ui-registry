import { type ChangeEvent, type ReactNode } from 'react'
import {
  Controller,
  useFormContext,
  useFormState,
  type Control,
  type FieldPath,
} from 'react-hook-form'

import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { ColoredValueVariant } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { formatRateSpecEquivalent, formatRateSpecFraction } from '@/utils/rate-spec'

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { getReconPartVisibility } from '@/features/sales/_shared/reconciliation/recon-period-type'
import type { ReconMvReference } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import type { ReconLineDerived } from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import {
  pickReconCheckDisplay,
  type ReconCheck,
} from '@/features/sales/_shared/reconciliation/recon-server-check'
import {
  resolveProgressBeforePct,
  resolveReconVatRate,
  toNum,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import ReconVatToggle from './ReconVatToggle'
import ReconDualProgress from './ReconDualProgress'
import ReconPctAmountInline from './ReconPctAmountInline'
import {
  type ReconCompareUnit,
  formatReconUnit,
  RECON_NO_REFERENCE_TEXT,
  ReconCheckChip,
  ReconLockedToMv,
  ReconRowLabelWithFormula,
  ReconTableBand,
  ReconTableRow,
  vatInclusionLabel,
  withVatInclusion,
} from './ReconConfigTableRow'

const PRICE_FORMULA = 'Giá tính phí (A) = giá CĐT dùng để tính hoa hồng đại lý.'
const APRIME_FORMULA =
  "Giá tính phí nội bộ (A') chỉ dùng tính HH Sale & F2 nội bộ; KHÔNG ảnh hưởng đối chiếu CĐT. Bỏ trống ⇒ dùng A."
const RETRO_FORMULA =
  'Số tiền điều chỉnh truy hồi = (Tổng phí ĐL mới − Tổng phí ĐL cũ) × (Tỉ lệ đã đối chiếu). Áp khi đổi giá hoặc đổi % HH.'
const PERIOD_COMMISSION_FORMULA = 'Hoa hồng đợt này = Giá tính phí × Tỷ lệ HH × Δ tiến độ kỳ này.'

const wrapperCls = 'border-border-1 rounded-sm border-[1px] min-h-[40px]'

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${money(Math.abs(value))}`
}

/** Màu "Số tiền điều chỉnh truy hồi": > 0 → xanh lá, = 0 → xám, < 0 → đỏ. */
function retroToneClass(value: number): string {
  if (value > 0) return 'text-data-green-default'
  if (value < 0) return 'text-data-red-default'
  return 'text-content-dark-3'
}

type ItemFieldPath = FieldPath<InvestorReconciliationSheetCreateValues>

/**
 * RHF-bound number cell for the table. Module-scope (NOT defined inside render) so the input keeps
 * focus across re-renders. `emptyValue` controls what an empty string maps to (0 for required money
 * fields, null for nullable ones).
 */
function ReconNumberField({
  control,
  name,
  isPercent,
  placeholder,
  disabled,
  emptyValue,
  min = 0,
  max,
  className,
  wrapperClassName,
}: {
  control: Control<InvestorReconciliationSheetCreateValues>
  name: ItemFieldPath
  isPercent?: boolean
  placeholder?: string
  disabled?: boolean
  emptyValue: 0 | null
  min?: number
  max?: number
  className?: string
  /** Lớp bọc ô input — mặc định `w-full` (tràn hết cột); dòng có toggle VAT truyền `flex-1 min-w-0`. */
  wrapperClassName?: string
}) {
  const { isReadOnly } = useReconMode()
  return (
    <div className={wrapperClassName ?? 'w-full'}>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          // Màn chi tiết (view/approval): hiển thị số dạng text thường thay vì ô input disabled mờ.
          if (isReadOnly) {
            const v = field.value as number | null | undefined
            return (
              <span className="typo-body-base-medium text-content-dark-1 block text-right">
                {/* Ô `percent` duy nhất đi qua đây là núm tiến độ `shared_bonus_to_sale_pct` —
                    giữ 3 chữ số thập phân như cũ, KHÔNG nới theo tỷ lệ cấu hình. */}
                {v == null ? '—' : formatReconUnit(toNum(v), isPercent ? 'percent' : 'currency', 3)}
              </span>
            )
          }
          return (
            <FullCellNumberInput
              value={(field.value as number | null | undefined) ?? ''}
              suffix={isPercent ? '%' : 'vnd'}
              isHideSuffix={!isPercent}
              min={min}
              max={max}
              placeholder={placeholder}
              disabled={disabled}
              inputWrapperClassName={wrapperCls}
              isError={!!fieldState.error}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value
                if (raw === '') {
                  field.onChange(emptyValue)
                  return
                }
                if (raw === '.' || raw.endsWith('.')) return
                const num = Number(raw)
                if (!Number.isFinite(num)) return
                field.onChange(num)
              }}
              className={className ? className : 'typo-body-base-medium'}
            />
          )
        }}
      />
    </div>
  )
}

export interface ReconConfigTableProps {
  index: number
  item: InvestorReconciliationSheetCreateItemValues
  mv: ReconMvReference
  derived: ReconLineDerived
  disabled?: boolean
  /** Phần 4 — phí tăng thêm (per-line opt-in). */
  showExtra: boolean
  /** Giá riêng Sale/F2 (A') opt-in. */
  showAprime: boolean
  /** Tiến độ TT lũy kế đã phê duyệt (lịch sử căn) — căn chỉnh dòng "trước đối chiếu". */
  priorPaymentProgressPct?: number | null
  /** Tiến độ phí tăng thêm lũy kế đã phê duyệt. */
  priorExtraProgressPct?: number | null
  /**
   * Khóa các field KẾ THỪA (read-only) — tiến độ Phần 1 / Phần 4. Dùng cho F2/CTV: tiến độ lấy từ
   * CĐT cha, KHÔNG nằm trong payload nên không cho sửa. Default false ⇒ CĐT giữ nguyên (cho sửa).
   */
  inheritedReadOnly?: boolean
  /**
   * Hiển thị nhóm "Số tiền đối chiếu kỳ này" (các dòng tổng do BE tính). Default `true` (F2 giữ
   * nguyên). Investor truyền `false` khi căn chưa xác nhận / chưa có số BE → ẩn cả nhóm tổng.
   */
  showComputedTotals?: boolean
  /**
   * recon_check của BE (so submitted vs cấu hình MV mới nhất). Khi có (căn đã xác nhận & khớp), cột
   * "Đối chiếu" ở dòng input hiển thị Khớp/Lệch theo BE (item nào chưa match). Bỏ trống ⇒ FE so advisory.
   */
  reconCheck?: ReconCheck
  /**
   * Lũy kế giảm trừ các kỳ ĐÃ DUYỆT (PRE-VAT, khớp `prior_*` BE) — hint dưới ô "Giảm trừ khác" +
   * "· Trong đó Sale / F2 phải chịu". `undefined` = đang tải / chưa chọn căn ⇒ KHÔNG render hint;
   * đã tải mà bằng 0 ⇒ vẫn hiện "0 đ".
   */
  priorDeduction?: { total: number; toSale: number }
}

/**
 * Đối-chiếu config table for one line — ONE 4-column `<table>` (mockup `rf5-tbl`):
 * `nhãn | CĐT đề nghị | MV ghi nhận | Đối chiếu`. Section titles are full-width band rows
 * (`ReconTableBand`, `colspan=4`); every data row fills all 4 columns; the period totals
 * ("Số tiền đối chiếu kỳ này") are rows inside the same table.
 *
 * Part visibility follows the show-all model (see `_docs/period-types-spec.md` §0): non-cancel kinds
 * render Phần 0+1+2+3; Kỳ hủy cọc renders Phần 0 (read-only) + Phần 3. Phần 4 + giá riêng Sale/F2
 * are opt-in toggles.
 */
function ReconConfigTable({
  index,
  item,
  mv,
  derived,
  disabled,
  showExtra,
  showAprime,
  priorPaymentProgressPct = null,
  priorExtraProgressPct = null,
  inheritedReadOnly = false,
  showComputedTotals = true,
  reconCheck,
  priorDeduction,
}: ReconConfigTableProps) {
  const { control, setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()
  // Lỗi validation tiến độ (Phần 1 / Phần 4) phải HIỆN ra — nếu không, cặp từ-có/đến-trống sẽ chặn
  // submit âm thầm (FullCellNumberInput ô delta trước đây không nhận isError nên không báo gì).
  const { errors } = useFormState({ control })
  const itemErrors = errors.items?.[index]
  const paymentProgressError =
    itemErrors?.pct_period_commission?.message ?? itemErrors?.amt_period_commission?.message
  const extraProgressError = itemErrors?.extra_bonus_progress_to_pct?.message
  const { isReadOnly } = useReconMode()
  // Cờ hiển thị theo preset (CĐT=rich bật hết; F2=simple tắt phí tăng thêm + phân bổ Sale) + nhãn
  // header cột "bên đề nghị" (CĐT đề nghị / F2 đề nghị) theo loại đối chiếu.
  const { features, proposalColumnLabel, payerLabel, profile, taxMode, kind } = useReconKind()
  // CTV (taxMode 'pit'): không VAT — section tổng kết hiện Tổng (trước thuế)/Thuế TNCN/Thực nhận sau
  // thuế (số BE) và mọi hậu tố "(gồm VAT)" bị ẩn. CĐT/F2 ('vat') giữ nguyên.
  const isPit = taxMode === 'pit'
  // Simple preset (F2/CTV) = bảng CHỈ XEM 1 cột giá trị: bỏ cột "MV ghi nhận" đối chứng + "Đối chiếu";
  // cột giá trị duy nhất (vốn là "đề nghị") đổi nhãn header thành "MV ghi nhận" (số map thẳng từ BE).
  const valueOnly = profile === 'simple'
  const effectiveDisabled = disabled || isReadOnly
  // Tiến độ (Phần 1 / Phần 4) read-only khi kế thừa từ phiếu cha (F2/CTV) — ngoài việc bị `disabled`.
  const progressDisabled = effectiveDisabled || inheritedReadOnly
  // IR (rich) sở hữu bộ 4 trường thưởng đại lý: tổng / ghi-nhận-kỳ / núm-%-chia. F2/CTV (simple) chỉ
  // hiển thị "Tổng thưởng đại lý" read-only (prefill từ phiếu CĐT cha) — không có ghi-nhận-kỳ / núm-chia.
  const isInvestorRecon = profile === 'rich'

  const parts = getReconPartVisibility(item.period_type)
  // Phần 2 (điều chỉnh) ⇒ price & %HH are editable; otherwise locked to the agreed (MV) values.
  const priceEditable = parts.p2 && !effectiveDisabled

  const refPrice = mv.feeCalculationPrice ?? mv.listedPrice
  const feeCalculationPrice = item.fee_calculation_price ?? refPrice ?? 0

  // "% Hoa hồng (theo HĐPP)" — khi MV cấu hình HH đại lý dạng PHÂN SỐ (F2: pct_f2_commission_spec) thì
  // GIỮ công thức "num/den của base" làm chính khi hiển thị read-only, %/₫ dẫn xuất chỉ hiện mờ "≈ …"
  // (mirror LadDetailModal.renderF2Commission). null ⇒ không phải phân số, hiện số như thường.
  const agencyFeeFraction = formatRateSpecFraction(mv.agencyFeeSpec)
  const agencyFeeEquivalent = formatRateSpecEquivalent(mv.agencyFeeSpec)

  // Cột "Đối chiếu" CHỈ lấy recon_check của BE (item nào chưa match). FE KHÔNG tự so sánh/tính delta:
  // không có recon_check ⇒ để trống (—). Với dòng map NHIỀU field (cặp %/₫ loại trừ nhau), ưu tiên
  // field ĐANG LỆCH bất kể thứ tự — tránh ô "rỗng" (null/0) match=true che lấp ô có giá trị thực đang
  // lệch (vd Tổng phí tăng thêm: ₫ rỗng "khớp" che % đang lệch). Đơn vị delta lấy theo ĐÚNG field hiển
  // thị (% hay ₫); `fallbackUnit` chỉ dùng khi field không suy ra được đơn vị.
  const reconCheckCell = (
    fallbackUnit: ReconCompareUnit | undefined,
    ...fields: string[]
  ): ReactNode | null => {
    const display = pickReconCheckDisplay(reconCheck, fields)
    if (!display) return null
    return (
      <ReconCheckChip
        match={display.match}
        delta={display.delta}
        unit={display.unit ?? fallbackUnit}
      />
    )
  }

  // MV reference cho phí tăng thêm = tiền thưởng CĐT theo cấu hình (cột "MV ghi nhận", map thẳng).
  const mvExtraAmount = mv.amtInvestorBonus

  // Thưởng GHI NHẬN kỳ này — số cộng vào tổng phụ (khác tổng thưởng benchmark `shared_bonus_amount`).
  // F2/CTV adapter map period_amount = shared_bonus_amount nên footer/tính tiền dùng chung field này.
  const sharedBonusPeriodAmount = item.shared_bonus_period_amount ?? 0
  const feeDeduction = item.fee_deduction ?? 0

  // CĐT: khi "Tổng thưởng đại lý" (benchmark, nhập ₫ `shared_bonus_amount` HOẶC %
  // `shared_bonus_pct`) = 0 thì khoá nhập các ô phụ thuộc kỳ này: Thưởng ghi nhận /
  // % chia Sale-F2 / Giảm trừ khác / Trừ từ lương Sale.
  const sharedBonusBenchmarkZero =
    isInvestorRecon && !(Number(item.shared_bonus_amount) > 0 || Number(item.shared_bonus_pct) > 0)

  // VAT theo TỪNG MỤC (per-field): mỗi dòng HH / Thưởng / Phí tăng thêm / Khấu trừ có toggle riêng
  // đặt cờ is_*_include_vat của mục đó. Mức VAT (`vat_rate`) LUÔN áp dụng cho căn (mặc định 10%) —
  // cờ chỉ nói số NHẬP đã gồm VAT hay chưa. GIÁ TRỊ các mục BẤT BIẾN khi toggle (số theo giá nhập);
  // chỉ NET đổi. NET tính per-field (derived.netAmount — chỉ trừ VAT ở mục bật cờ).
  const agencyVatOn = !!item.is_agency_fee_include_vat
  const extraVatOn = !!item.is_extra_bonus_include_vat
  const sharedBonusVatOn = !!item.is_shared_bonus_include_vat
  const deductionVatOn = !!item.is_fee_deduction_include_vat
  const effectiveVatRate = resolveReconVatRate(item.vat_rate)
  const netAmount = derived.netAmount
  // "Phải thu (CĐT trả)" cơ sở GỒM VAT: mục đã gồm VAT giữ nguyên, mục CHƯA gồm VAT ×(1+rate/100) =
  // netAmount×(1+rate/100). Dùng chung helper qua derived.receivableInclusive (đồng bộ Lịch sử/footer).
  const receivableInclusive = derived.receivableInclusive
  // VAT lấy THẲNG từ BE (vat_amount qua derived.vatAmount) — FE không tự lấy hiệu Phải-thu − NET.
  const vatTotal = derived.vatAmount
  // CTV (PIT): thuế TNCN + thực nhận sau thuế lấy thẳng từ BE (derived.* ← serverComputed). VAT mode = 0.
  const pitAmount = derived.pitAmount
  const totalAmountAfterPit = derived.totalAmountAfterPit
  const pitRate = derived.pitRate
  /**
   * Hậu tố "(đã gồm/chưa gồm VAT)" — LUÔN hiện (tắt hết VAT ⇒ "(chưa gồm VAT)"). Chữ nhỏ & mờ
   * (typo-body-xs-regular / content-dark-3) để ĐỒNG NHẤT ở mọi dòng, kể cả "Phải thu (CĐT trả)".
   */
  const fieldVatLabel = (on: boolean) =>
    isPit ? null : (
      <span className="typo-body-xs-regular text-content-dark-3"> {vatInclusionLabel(on)}</span>
    )

  type VatFlagField =
    | 'is_agency_fee_include_vat'
    | 'is_extra_bonus_include_vat'
    | 'is_shared_bonus_include_vat'
    | 'is_fee_deduction_include_vat'
  /** Đặt cờ VAT của một mục. `vat_rate` cấp căn KHÔNG đổi theo cờ — luôn là mức mặc định 10%. */
  const setVatFlag = (flag: VatFlagField, next: boolean) => {
    setValue(`items.${index}.${flag}`, next, { shouldDirty: true })
  }

  const th = 'typo-body-xs-semibold text-content-dark-3 px-2 py-2 uppercase'

  /** "% ĐC đợt này" (CĐT) → `pct_period_commission` / `amt_period_commission` (XOR, không VAT). */
  const periodCommissionInput = {
    pct: item.pct_period_commission,
    amt: item.amt_period_commission,
    setValues: ({ pct, amt }: { pct: number | null; amt: number | null }) => {
      setValue(`items.${index}.pct_period_commission`, pct, { shouldDirty: true })
      setValue(`items.${index}.amt_period_commission`, amt, { shouldDirty: true })
    },
  }

  /**
   * Phần 1 (CĐT): tiến độ lũy kế do BE tính (readonly); user nhập % ĐC đợt này qua pct/amt_period_commission.
   */
  const renderInvestorPaymentProgress = () => {
    const before = resolveProgressBeforePct(item.progress_from_pct, priorPaymentProgressPct)
    const after =
      item.progress_to_pct == null
        ? before
        : Math.min(100, Math.max(0, toNum(item.progress_to_pct)))

    return (
      <>
        <ReconTableRow
          label="Tiến độ đã đối chiếu các kỳ trước"
          cdt={
            <span className="typo-body-base-medium text-content-dark-1">
              {formatPercent(before)}
            </span>
          }
          mv={formatPercent(before)}
          delta={reconCheckCell('percent', 'progress_from_pct') ?? undefined}
        />
        <ReconTableRow
          id={`recon-row-${index}-pct_period_commission`}
          label="% ĐC đợt này"
          sub="Nhập % hoặc bấm ₫ để đổi sang số tiền (không VAT)"
          cdt={
            isReadOnly || progressDisabled ? (
              <span className="typo-body-base-medium text-content-dark-1 block text-right">
                {periodCommissionInput.amt != null
                  ? money(periodCommissionInput.amt)
                  : periodCommissionInput.pct != null
                    ? // Núm tiến độ `pct_period_commission` — giữ 3 chữ số thập phân như cũ.
                      formatReconUnit(periodCommissionInput.pct, 'percent', 3)
                    : '—'}
              </span>
            ) : (
              <div className="w-full">
                <ReconPctAmountInline
                  pct={periodCommissionInput.pct}
                  amt={periodCommissionInput.amt}
                  feeCalculationPrice={feeCalculationPrice}
                  disabled={progressDisabled}
                  onChange={periodCommissionInput.setValues}
                  wrapperClassname="min-w-0 w-full"
                />
                {paymentProgressError && (
                  <p className="typo-body-xs-regular text-data-red-default mt-1">
                    {paymentProgressError}
                  </p>
                )}
              </div>
            )
          }
          delta={
            reconCheckCell('percent', 'pct_period_commission', 'amt_period_commission') ?? undefined
          }
        />
        <ReconTableRow
          label="Tiến độ sau đối chiếu"
          strong
          cdt={
            <span className="typo-body-base-medium text-content-dark-1">
              {formatPercent(after)}
            </span>
          }
          mv={formatPercent(after)}
          delta={reconCheckCell('percent', 'progress_to_pct') ?? undefined}
        />
      </>
    )
  }

  /** F2/CTV kế thừa tiến độ từ CĐT cha — vẫn dùng progress trio (readonly). */
  const paymentProgress = {
    setFromValue: (v: number) =>
      setValue(`items.${index}.progress_from_pct`, v, { shouldDirty: true }),
    setToValue: (v: number) => setValue(`items.${index}.progress_to_pct`, v, { shouldDirty: true }),
    fromVal: item.progress_from_pct,
    toVal: item.progress_to_pct,
  }

  /** "% tăng thêm đợt này" → `extra_bonus_progress_from_pct` / `extra_bonus_progress_to_pct`. */
  const extraProgress = {
    setFromValue: (v: number) =>
      setValue(`items.${index}.extra_bonus_progress_from_pct`, v, { shouldDirty: true }),
    setToValue: (v: number) =>
      setValue(`items.${index}.extra_bonus_progress_to_pct`, v, { shouldDirty: true }),
    fromVal: item.extra_bonus_progress_from_pct,
    toVal: item.extra_bonus_progress_to_pct,
  }

  /**
   * Progress trio (mockup): "trước đối chiếu" (`fromVal`) → "% đợt này" (delta = to − from) →
   * "sau đối chiếu" (`toVal`). Ô delta ghi `to = from + delta` (và materialise `from = 0` nếu null).
   */
  const renderProgressTrio = (opts: {
    setFromValue: (next: number) => void
    setToValue: (next: number) => void
    fromVal: number | null
    toVal: number | null
    priorCumulativePct: number | null
    labelBefore: string
    labelDelta: string
    labelDeltaSub?: string
    labelAfter: string
    /** Message lỗi của field "đến" (progress_to / extra_progress_to) — hiện viền đỏ + chữ dưới ô. */
    errorMessage?: string
    /**
     * recon_check field cho dòng "trước/sau đối chiếu" — cột "Đối chiếu" lấy Khớp/Lệch TỪ BE (KHÔNG
     * hardcode "Khớp"). BE chưa so tiến độ ⇒ match=null ⇒ reconCheckCell trả null ⇒ để trống "—".
     */
    beforeReconField: string
    afterReconField: string
  }) => {
    const before = resolveProgressBeforePct(opts.fromVal, opts.priorCumulativePct)
    const to = opts.toVal == null ? before : opts.toVal
    const hasExplicitBounds = opts.fromVal != null && opts.toVal != null
    const delta = hasExplicitBounds
      ? Math.round((toNum(opts.toVal) - toNum(opts.fromVal)) * 100) / 100
      : opts.toVal != null
        ? Math.round((to - before) * 100) / 100
        : null
    // Cột MV mirror CĐT (mockup sameVal).
    return (
      <>
        <ReconTableRow
          label={opts.labelBefore}
          cdt={
            <span className="typo-body-base-medium text-content-dark-1">
              {formatPercent(before)}
            </span>
          }
          mv={formatPercent(before)}
          delta={reconCheckCell('percent', opts.beforeReconField) ?? undefined}
        />
        <ReconTableRow
          label={opts.labelDelta}
          sub={opts.labelDeltaSub ?? 'Bắt buộc > 0 khi có tiến độ'}
          cdt={
            isReadOnly ? (
              // % đợt này = tiến độ "sau" − "trước" (delta đã tính ở trên, cùng số edit-mode hiển thị).
              // Read-only trước đây để "—"; nay hiện delta cho khớp dữ liệu (yêu cầu 2026-06-24).
              <span className="typo-body-base-medium text-content-dark-1 block text-right">
                {delta == null ? '—' : formatPercent(delta)}
              </span>
            ) : (
              <div className="w-full">
                <FullCellNumberInput
                  value={delta ?? ''}
                  isError={!!opts.errorMessage}
                  suffix="%"
                  min={0}
                  max={100}
                  disabled={progressDisabled}
                  inputWrapperClassName={wrapperCls}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const raw = e.target.value
                    const effectiveFrom = resolveProgressBeforePct(
                      opts.fromVal,
                      opts.priorCumulativePct
                    )
                    if (raw === '') {
                      if (opts.fromVal == null || (opts.fromVal ?? 0) < effectiveFrom) {
                        opts.setFromValue(effectiveFrom)
                      }
                      opts.setToValue(effectiveFrom)
                      return
                    }
                    if (raw === '.' || raw.endsWith('.')) return
                    const d = Number(raw)
                    if (!Number.isFinite(d)) return
                    if (opts.fromVal == null || (opts.fromVal ?? 0) < effectiveFrom) {
                      opts.setFromValue(effectiveFrom)
                    }
                    opts.setToValue(Math.min(100, effectiveFrom + d))
                  }}
                  className={'typo-body-base-medium'}
                />
                {opts.errorMessage && (
                  <p className="typo-body-xs-regular text-data-red-default mt-1">
                    {opts.errorMessage}
                  </p>
                )}
              </div>
            )
          }
        />
        <ReconTableRow
          label={opts.labelAfter}
          strong
          cdt={
            <span className="typo-body-base-medium text-content-dark-1">{formatPercent(to)}</span>
          }
          mv={formatPercent(to)}
          delta={reconCheckCell('percent', opts.afterReconField) ?? undefined}
        />
      </>
    )
  }

  return (
    <div className="border-border-1 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse">
        <colgroup>
          {valueOnly ? (
            <>
              <col className="w-[58%]" />
              <col className="w-[42%]" />
            </>
          ) : (
            <>
              <col className="w-[30%]" />
              <col className="w-[35%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="border-border-1 bg-background-2 border-b">
            <th className={`${th} text-left`} />
            {valueOnly ? (
              <th className={`${th} text-right`}>MV ghi nhận</th>
            ) : (
              <>
                <th className={`${th} text-right`}>{proposalColumnLabel}</th>
                <th className={`${th} text-right`}>
                  MV ghi nhận <br />
                  <span className="typo-body-xs-regular text-content-dark-4 normal-case">
                    (theo bảng theo dõi / HĐPP)
                  </span>
                </th>
                <th className={`${th} text-right`}>Đối chiếu</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {/* ───────── PHẦN 0 — Giá tính phí & Tỷ lệ HH (luôn hiện) ───────── */}
          <ReconTableBand
            label="Giá tính phí & Tỷ lệ HH"
            color={ColoredValueVariant.GREY}
            hint={priceEditable ? undefined : 'Khoá theo giá đã chốt'}
          />

          <ReconTableRow
            id={`recon-row-${index}-fee_calculation_price`}
            label={<ReconRowLabelWithFormula label="Giá tính phí (HĐMB)" formula={PRICE_FORMULA} />}
            sub={
              priceEditable
                ? 'Có thể nhập số khác để điều chỉnh — để trống = giữ nguyên'
                : 'Bật kỳ điều chỉnh nếu CĐT đưa giá khác bảng theo dõi'
            }
            cdt={
              priceEditable ? (
                <ReconNumberField
                  control={control}
                  name={`items.${index}.fee_calculation_price`}
                  emptyValue={null}
                  disabled={effectiveDisabled}
                />
              ) : // F2 (valueOnly): cột giá trị là "MV ghi nhận" — hiện thẳng số BE, KHÔNG dùng "= MV (…)".
              parts.p2 || valueOnly ? (
                <span className="typo-body-base-medium text-content-dark-1">
                  {money(feeCalculationPrice)}
                </span>
              ) : (
                <ReconLockedToMv>= MV ({money(refPrice ?? 0)})</ReconLockedToMv>
              )
            }
            mv={refPrice == null ? undefined : money(refPrice)}
            delta={reconCheckCell('currency', 'fee_calculation_price') ?? undefined}
          />

          <ReconTableRow
            id={`recon-row-${index}-pct_agency_fee`}
            label="% Hoa hồng (theo HĐPP)"
            sub={priceEditable ? 'Nhập % khác hoặc bấm ₫ để đổi sang phí cố định' : undefined}
            cdt={
              // Toggle VAT bám phải; ô % Hoa hồng (theo HĐPP) chiếm hết phần còn lại của cột.
              <div className="flex w-full items-center gap-3">
                {priceEditable ? (
                  <ReconPctAmountInline
                    pct={item.pct_agency_fee}
                    amt={item.amt_agency_fee}
                    feeCalculationPrice={feeCalculationPrice}
                    disabled={!priceEditable}
                    onChange={({ pct, amt }) => {
                      setValue(`items.${index}.pct_agency_fee`, pct, { shouldDirty: true })
                      setValue(`items.${index}.amt_agency_fee`, amt, { shouldDirty: true })
                    }}
                    wrapperClassname={'min-w-0 flex-1'}
                  />
                ) : valueOnly && agencyFeeFraction ? (
                  // F2: HH đại lý cấu hình dạng PHÂN SỐ → giữ công thức "num/den của base" làm chính,
                  // %/₫ dẫn xuất mờ bên dưới (mirror LadDetailModal.renderF2Commission). KHÔNG chỉ hiện
                  // số đã tính (yêu cầu: hiển thị đúng công thức thiết lập).
                  <span className="typo-body-base-medium text-content-dark-1 flex flex-1 flex-col items-end">
                    <span>{agencyFeeFraction}</span>
                    <span className="typo-body-xs-regular text-content-dark-3">
                      ≈{' '}
                      {agencyFeeEquivalent ??
                        (mv.amtAgencyFee != null
                          ? money(mv.amtAgencyFee)
                          : formatReconUnit(mv.pctAgencyFee ?? 0, 'percent'))}
                    </span>
                  </span>
                ) : valueOnly ? (
                  // F2 (không phải phân số): hiện số phẳng đã ghi ở dòng; khi BE để trống (cấu hình số
                  // tiền cố định ⇒ pct=0/amt=null) thì dùng số MV đã resolve để không hiện nhầm 0%.
                  <span className="typo-body-base-medium text-content-dark-1 flex-1 text-right">
                    {item.amt_agency_fee != null
                      ? money(item.amt_agency_fee)
                      : item.pct_agency_fee != null && item.pct_agency_fee !== 0
                        ? formatReconUnit(item.pct_agency_fee, 'percent')
                        : mv.amtAgencyFee != null
                          ? money(mv.amtAgencyFee)
                          : formatReconUnit(mv.pctAgencyFee ?? item.pct_agency_fee ?? 0, 'percent')}
                  </span>
                ) : parts.p2 ? (
                  // Read-only kỳ điều chỉnh (CĐT): hiện ĐÚNG giá trị đã ghi nhận (₫ hoặc %), KHÔNG khoá
                  // hiển thị theo MV-reference (tránh lệch số so với giá trị đã nhập).
                  <span className="typo-body-base-medium text-content-dark-1 flex-1 text-right">
                    {item.amt_agency_fee != null
                      ? money(item.amt_agency_fee)
                      : formatReconUnit(item.pct_agency_fee ?? 0, 'percent')}
                  </span>
                ) : (
                  <span className="flex-1 text-right">
                    <ReconLockedToMv>
                      = MV ({formatReconUnit(mv.pctAgencyFee ?? 0, 'percent')})
                    </ReconLockedToMv>
                  </span>
                )}
                {isReadOnly ? (
                  fieldVatLabel(agencyVatOn)
                ) : (
                  <ReconVatToggle
                    checked={agencyVatOn}
                    disabled={effectiveDisabled}
                    onChange={(next) => setVatFlag('is_agency_fee_include_vat', next)}
                    direction={'column'}
                  />
                )}
              </div>
            }
            mv={
              mv.pctAgencyFee == null
                ? undefined
                : withVatInclusion(
                    formatReconUnit(mv.pctAgencyFee, 'percent'),
                    mv.isAgencyFeeIncludeVat
                  )
            }
            delta={reconCheckCell('percent', 'pct_agency_fee', 'amt_agency_fee') ?? undefined}
          />

          {showAprime && (
            <ReconTableRow
              label={
                <ReconRowLabelWithFormula
                  label="Giá tính phí riêng (Sale/F2)"
                  formula={APRIME_FORMULA}
                />
              }
              sub="Chỉ tính HH Sale/F2 nội bộ — không ảnh hưởng đối chiếu CĐT."
              cdt={
                <ReconNumberField
                  control={control}
                  name={`items.${index}.commission_fee_calculation_price`}
                  emptyValue={null}
                  placeholder="Bỏ trống ⇒ dùng giá A"
                  disabled={effectiveDisabled}
                />
              }
            />
          )}

          {/* ───────── PHẦN 1 — Tiến độ đối chiếu ───────── */}
          {parts.p1 && (
            <>
              <ReconTableBand label="Tiến độ đối chiếu" color={ColoredValueVariant.BLUE} />

              {isInvestorRecon && !inheritedReadOnly
                ? renderInvestorPaymentProgress()
                : renderProgressTrio({
                    ...paymentProgress,
                    priorCumulativePct: priorPaymentProgressPct,
                    labelBefore: 'Tiến độ đã đối chiếu các kỳ trước',
                    labelDelta: '% ĐC đợt này',
                    labelAfter: 'Tiến độ sau đối chiếu',
                    errorMessage: paymentProgressError,
                    beforeReconField: 'progress_from_pct',
                    afterReconField: 'progress_to_pct',
                  })}
            </>
          )}

          {/* ───────── PHẦN 2 — Điều chỉnh truy hồi (read-only) ───────── */}
          {/* CTV không còn truy hồi ở tầng đối chiếu (BE 2026-08-06): việc đổi rate áp lên
              tiến độ đã trả nay được thu hồi thẳng trong luồng chi hoa hồng, nên band này
              luôn hiện "0 đ" và làm kế toán tưởng sẽ có số phát sinh sau khi duyệt. Gate
              theo `kind` chứ KHÔNG tắt `parts.p2` — cờ đó còn mở quyền sửa "Giá tính phí"
              và "% Hoa hồng" cho CTV. F2 giữ nguyên truy hồi. */}
          {parts.p2 && kind !== 'ctv' && (
            <>
              <ReconTableBand
                label="Điều chỉnh truy hồi"
                color={ColoredValueVariant.ORANGE}
                hint="Tự động khi xác nhận"
              />
              <ReconTableRow
                label={
                  <ReconRowLabelWithFormula
                    label="Số tiền điều chỉnh truy hồi"
                    formula={RETRO_FORMULA}
                  />
                }
                muted
                cdt={
                  <span
                    className={`typo-body-base-medium ${retroToneClass(derived.retroactiveAdjustment)}`}
                  >
                    {signedMoney(derived.retroactiveAdjustment)}
                  </span>
                }
              />
            </>
          )}

          {/* ───────── PHẦN 3 — Thưởng đại lý / Khấu trừ ───────── */}
          {parts.p3 && (
            <>
              <ReconTableBand label="Thưởng đại lý / Khấu trừ" color={ColoredValueVariant.GREEN} />

              <ReconTableRow
                id={`recon-row-${index}-shared_bonus_amount`}
                label="Tổng thưởng đại lý"
                sub={
                  isInvestorRecon
                    ? 'Tổng thưởng CĐT (benchmark đối soát) — KHÔNG cộng thẳng vào kỳ; ghi nhận qua ô bên dưới.'
                    : 'Phần thưởng đại lý chia về kỳ này (prefill từ phiếu CĐT cha).'
                }
                cdt={
                  <div className="flex w-full flex-col items-end gap-2">
                    {isReadOnly ? (
                      <span className="typo-body-base-medium text-content-dark-1 block text-right">
                        {item.shared_bonus_amount != null && Number(item.shared_bonus_amount) !== 0
                          ? money(item.shared_bonus_amount)
                          : item.shared_bonus_pct != null
                            ? formatPercent(item.shared_bonus_pct)
                            : '—'}
                      </span>
                    ) : (
                      <ReconPctAmountInline
                        pct={item.shared_bonus_pct}
                        amt={item.shared_bonus_amount}
                        feeCalculationPrice={feeCalculationPrice}
                        disabled={effectiveDisabled || !isInvestorRecon}
                        onChange={({ pct, amt }) => {
                          setValue(`items.${index}.shared_bonus_pct`, pct, { shouldDirty: true })
                          setValue(`items.${index}.shared_bonus_amount`, amt ?? 0, {
                            shouldDirty: true,
                          })
                        }}
                        wrapperClassname="w-full"
                      />
                    )}
                    {isReadOnly ? (
                      fieldVatLabel(sharedBonusVatOn)
                    ) : (
                      <ReconVatToggle
                        checked={sharedBonusVatOn}
                        disabled={effectiveDisabled || !isInvestorRecon}
                        onChange={(next) => setVatFlag('is_shared_bonus_include_vat', next)}
                      />
                    )}
                  </div>
                }
                mv={
                  // Config Thưởng đại lý is XOR pct/amt (like agency fee): show the fixed
                  // amount when set, else the % (deal 1696 has pct_shared_bonus=2, amt null).
                  mv.amtSharedBonus != null
                    ? withVatInclusion(money(mv.amtSharedBonus), mv.isSharedBonusIncludeVat)
                    : mv.pctSharedBonus != null
                      ? withVatInclusion(
                          formatReconUnit(mv.pctSharedBonus, 'percent'),
                          mv.isSharedBonusIncludeVat
                        )
                      : RECON_NO_REFERENCE_TEXT
                }
                delta={
                  reconCheckCell('currency', 'shared_bonus_amount', 'shared_bonus_pct') ?? undefined
                }
              />

              {isInvestorRecon && (
                <ReconTableRow
                  id={`recon-row-${index}-shared_bonus_period_amount`}
                  label="Thưởng ghi nhận kỳ này"
                  sub="Thưởng CĐT thực ghi nhận kỳ này — cộng vào tổng phụ. Mặc định 0."
                  cdt={
                    <div className="w-full">
                      <ReconNumberField
                        control={control}
                        name={`items.${index}.shared_bonus_period_amount`}
                        emptyValue={0}
                        disabled={effectiveDisabled || sharedBonusBenchmarkZero}
                      />
                    </div>
                  }
                  delta={reconCheckCell('currency', 'shared_bonus_period_amount') ?? undefined}
                />
              )}

              {isInvestorRecon && (
                <ReconTableRow
                  indent
                  label="· Tiến độ thanh toán thưởng sale/F2 kỳ này"
                  sub="Núm % chia thưởng cho Sale (F2 + CTV) kỳ này. 0 / trống = tạm dừng chia (vẫn ghi nhận thưởng)."
                  cdt={
                    <ReconNumberField
                      control={control}
                      name={`items.${index}.shared_bonus_to_sale_pct`}
                      isPercent
                      emptyValue={null}
                      min={0}
                      max={100}
                      disabled={effectiveDisabled || sharedBonusBenchmarkZero}
                    />
                  }
                />
              )}

              <ReconTableRow
                id={`recon-row-${index}-fee_deduction`}
                label="Giảm trừ khác"
                sub={
                  <>
                    CĐT khấu trừ trong kỳ — trừ 100%, không scale.
                    {priorDeduction != null && (
                      <span className="mt-0.5 block">
                        Đã giảm trừ lũy kế các kỳ đã duyệt: {money(priorDeduction.total)}
                      </span>
                    )}
                  </>
                }
                cdt={
                  <div className="flex w-full items-center gap-3">
                    <ReconNumberField
                      control={control}
                      name={`items.${index}.fee_deduction`}
                      emptyValue={0}
                      disabled={effectiveDisabled || sharedBonusBenchmarkZero}
                      wrapperClassName="min-w-0 flex-1"
                    />
                    {isReadOnly ? (
                      fieldVatLabel(deductionVatOn)
                    ) : (
                      <ReconVatToggle
                        checked={deductionVatOn}
                        disabled={effectiveDisabled || sharedBonusBenchmarkZero}
                        onChange={(next) => setVatFlag('is_fee_deduction_include_vat', next)}
                        direction={'column'}
                      />
                    )}
                  </div>
                }
                mv={RECON_NO_REFERENCE_TEXT}
              />

              {features.saleSplit && feeDeduction > 0 && (
                <ReconTableRow
                  indent
                  label="· Trong đó Sale / F2 phải chịu"
                  sub={
                    <>
                      Phần khấu trừ áp vào Sale (F2 + CTV) — để trống hoặc 0 = không trừ vào lương
                      Sale.
                      {priorDeduction != null && (
                        <span className="mt-0.5 block">
                          Đã trừ từ HH Sale/F2 lũy kế các kỳ đã duyệt:{' '}
                          {money(priorDeduction.toSale)}
                        </span>
                      )}
                    </>
                  }
                  cdt={
                    isReadOnly ? (
                      <span className="typo-body-base-medium text-content-dark-1 block text-right">
                        {item.fee_deduction_to_sale_amount == null
                          ? '—'
                          : money(item.fee_deduction_to_sale_amount)}
                      </span>
                    ) : (
                      <div className="w-full">
                        <Controller
                          name={`items.${index}.fee_deduction_to_sale_amount`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <FullCellNumberInput
                              value={(field.value as number | null | undefined) ?? ''}
                              isHideSuffix
                              suffix="vnd"
                              min={0}
                              max={feeDeduction}
                              disabled={effectiveDisabled || sharedBonusBenchmarkZero}
                              inputWrapperClassName={wrapperCls}
                              isError={!!fieldState.error}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                field.onChange(
                                  e.target.value === ''
                                    ? null
                                    : Math.min(Number(e.target.value), feeDeduction)
                                )
                              }
                              className={'typo-body-base-medium'}
                            />
                          )}
                        />
                      </div>
                    )
                  }
                />
              )}
            </>
          )}

          {/* ───────── PHẦN 4 — Phí tăng thêm (toggle, tiến độ độc lập) ───────── */}
          {showExtra && features.extraBonus && (
            <>
              <ReconTableBand
                label="Phí tăng thêm (tiến độ độc lập)"
                color={ColoredValueVariant.YELLOW}
              />

              <tr className="border-border-1 border-b">
                <td colSpan={valueOnly ? 2 : 4} className="px-3 py-2">
                  <ReconDualProgress
                    base={{ fromPct: item.progress_from_pct, toPct: item.progress_to_pct }}
                    extra={{
                      fromPct: item.extra_bonus_progress_from_pct,
                      toPct: item.extra_bonus_progress_to_pct,
                    }}
                    baseLabel="Phí base"
                    extraLabel="Phí tăng thêm"
                  />
                </td>
              </tr>

              <ReconTableRow
                id={`recon-row-${index}-extra_bonus_amount`}
                label="Tổng phí tăng thêm (thỏa thuận)"
                sub="Tổng phí tăng thêm CĐT cam kết cho căn này (trọn gói). Nhập theo ₫ trọn gói hoặc % trên giá tính phí — đều bật/tắt VAT. Để trống = dùng số MV ghi nhận."
                cdt={
                  <div className="flex w-full flex-col items-end gap-2">
                    {isReadOnly ? (
                      <span className="typo-body-base-medium text-content-dark-1 block text-right">
                        {item.extra_bonus_amount != null
                          ? money(item.extra_bonus_amount)
                          : item.extra_bonus_pct != null
                            ? formatPercent(item.extra_bonus_pct)
                            : '—'}
                      </span>
                    ) : (
                      <ReconPctAmountInline
                        pct={item.extra_bonus_pct}
                        amt={item.extra_bonus_amount}
                        feeCalculationPrice={feeCalculationPrice}
                        disabled={effectiveDisabled}
                        onChange={({ pct, amt }) => {
                          setValue(`items.${index}.extra_bonus_pct`, pct, { shouldDirty: true })
                          setValue(`items.${index}.extra_bonus_amount`, amt, {
                            shouldDirty: true,
                          })
                        }}
                        wrapperClassname="w-full"
                      />
                    )}
                    {isReadOnly ? (
                      fieldVatLabel(extraVatOn)
                    ) : (
                      <ReconVatToggle
                        checked={extraVatOn}
                        disabled={effectiveDisabled}
                        onChange={(next) => setVatFlag('is_extra_bonus_include_vat', next)}
                      />
                    )}
                  </div>
                }
                mv={
                  mvExtraAmount == null
                    ? RECON_NO_REFERENCE_TEXT
                    : withVatInclusion(money(mvExtraAmount), mv.isInvestorBonusIncludeVat)
                }
                delta={
                  reconCheckCell('currency', 'extra_bonus_amount', 'extra_bonus_pct') ?? undefined
                }
              />

              {renderProgressTrio({
                ...extraProgress,
                priorCumulativePct: priorExtraProgressPct,
                labelBefore: 'Tiến độ tăng thêm trước đối chiếu',
                labelDelta: '% tăng thêm đợt này',
                labelDeltaSub: 'Tiến độ rút phí tăng thêm — ĐỘC LẬP với % TT base ở Phần 1',
                labelAfter: 'Tiến độ tăng thêm sau đối chiếu',
                errorMessage: extraProgressError,
                beforeReconField: 'extra_bonus_progress_from_pct',
                afterReconField: 'extra_bonus_progress_to_pct',
              })}
            </>
          )}

          {/* ───────── TỔNG KẾT — Số tiền đối chiếu kỳ này (chỉ hiện khi đã có số BE) ───────── */}
          {showComputedTotals && (
            <>
              <ReconTableBand label="Số tiền đối chiếu kỳ này" color={ColoredValueVariant.PURPLE} />

              {parts.p1 && (
                <ReconTableRow
                  label={
                    <ReconRowLabelWithFormula
                      label="Hoa hồng đợt này (phí đại lý)"
                      formula={PERIOD_COMMISSION_FORMULA}
                    />
                  }
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      {money(derived.periodCommission)}
                      {fieldVatLabel(agencyVatOn)}
                    </span>
                  }
                />
              )}

              {features.extraBonus && derived.extraBonusPeriodAmount !== 0 && (
                <ReconTableRow
                  label="Phí tăng thêm đợt này"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      {signedMoney(derived.extraBonusPeriodAmount)}
                      {fieldVatLabel(extraVatOn)}
                    </span>
                  }
                />
              )}

              {derived.retroactiveAdjustment !== 0 && (
                <ReconTableRow
                  label="Điều chỉnh truy hồi"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      {signedMoney(derived.retroactiveAdjustment)}
                      {fieldVatLabel(agencyVatOn)}
                    </span>
                  }
                />
              )}

              {/* Investor (rich): LUÔN hiện "Thưởng kỳ này" trong section tổng để khớp ô nhập "Thưởng ghi
                  nhận kỳ này" ở trên (kể cả khi = 0). F2/CTV giữ cũ: chỉ hiện khi > 0. */}
              {parts.p3 && (isInvestorRecon || sharedBonusPeriodAmount > 0) && (
                <ReconTableRow
                  label="Thưởng kỳ này"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      +{money(sharedBonusPeriodAmount)}
                      {fieldVatLabel(sharedBonusVatOn)}
                    </span>
                  }
                />
              )}

              {parts.p3 && feeDeduction > 0 && (
                <ReconTableRow
                  label="Khấu trừ kỳ này"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      −{money(feeDeduction)}
                      {fieldVatLabel(deductionVatOn)}
                    </span>
                  }
                />
              )}

              {isPit ? (
                <>
                  {/* CTV (thuế TNCN): Tổng (trước thuế) → Thuế TNCN (−) → Thực nhận sau thuế. Số lấy
                      THẲNG từ BE (derived.* ← serverComputed); KHÔNG tính FE; không có nhãn VAT. */}
                  <ReconTableRow
                    label="Tổng tiền (trước thuế)"
                    strong
                    cdt={
                      <span
                        className={
                          netAmount < 0
                            ? 'typo-body-lg-semibold text-semantic-danger-default'
                            : 'typo-body-lg-semibold text-content-dark-1'
                        }
                      >
                        {signedMoney(netAmount)}
                      </span>
                    }
                  />

                  <ReconTableRow
                    label={`Thuế TNCN (${pitRate}%)`}
                    muted
                    cdt={
                      <span className="typo-body-base-medium text-content-dark-1">
                        {signedMoney(-Math.abs(pitAmount))}
                      </span>
                    }
                  />

                  <ReconTableRow
                    label="Thực nhận sau thuế"
                    strong
                    cdt={
                      <span
                        className={
                          totalAmountAfterPit < 0
                            ? 'typo-body-lg-semibold text-semantic-danger-default'
                            : 'typo-body-lg-semibold text-content-dark-1'
                        }
                      >
                        {signedMoney(totalAmountAfterPit)}
                      </span>
                    }
                  />
                </>
              ) : (
                <>
                  {/* NET (chưa VAT) PER-FIELD: chỉ trừ VAT ở các mục bật cờ; tắt hết cờ ⇒ NET = tổng các mục.
                      Phần VAT tách thành 1 dòng riêng bên dưới (yêu cầu 2026-06-24) để dễ đọc: NET + VAT = Phải thu.
                      Hậu tố "(chưa gồm VAT)" đặt CẠNH SỐ TIỀN — đồng bộ với các dòng khác trong section (fieldVatLabel). */}
                  <ReconTableRow
                    label="TIỀN NHẬN KỲ NÀY (NET)"
                    strong
                    cdt={
                      <span
                        className={
                          netAmount < 0
                            ? 'typo-body-lg-semibold text-semantic-danger-default'
                            : 'typo-body-lg-semibold text-content-dark-1'
                        }
                      >
                        {signedMoney(netAmount)}
                        {fieldVatLabel(false)}
                      </span>
                    }
                  />

                  {/* Tiền VAT — tách riêng 1 dòng (chỉ hiện khi VAT thực sự áp dụng). */}
                  {Math.abs(vatTotal) >= 1 && (
                    <ReconTableRow
                      label="Tiền VAT"
                      sub={`VAT ${effectiveVatRate}%`}
                      muted
                      cdt={
                        <span className="typo-body-base-medium text-content-dark-1">
                          {signedMoney(vatTotal)}
                        </span>
                      }
                    />
                  )}

                  {/* "Phải thu (CĐT trả)" trên cơ sở GỒM VAT — LUÔN hiện (VAT luôn áp dụng, mặc định 10%):
                  mục đã gồm VAT giữ nguyên, mục chưa gồm VAT ×(1+rate/100) (receivableInclusive). */}
                  <ReconTableRow
                    label={`Phải thu (${payerLabel} trả)`}
                    strong
                    cdt={
                      <span
                        className={
                          receivableInclusive < 0
                            ? 'typo-body-lg-semibold text-semantic-danger-default'
                            : 'typo-body-lg-semibold text-content-dark-1'
                        }
                      >
                        {signedMoney(receivableInclusive)}
                        {fieldVatLabel(true)}
                      </span>
                    }
                  />

                  {/* Tạm ứng thưởng CĐT: "Phải thu" giữ nguyên làm tổng nghĩa vụ; phần đã tạm ứng cấn
                      trừ + "Còn phải thu" (amount_to_collect) là số BE — chỉ hiện khi có cấn kỳ này. */}
                  {isInvestorRecon &&
                    derived.sharedBonusPrepaidAmount != null &&
                    derived.sharedBonusPrepaidAmount > 0 && (
                      <>
                        <ReconTableRow
                          label="Đã trích quỹ tạm ứng (đối trừ ở phiếu thu)"
                          muted
                          cdt={
                            <span className="typo-body-base-medium text-content-dark-1">
                              {money(derived.sharedBonusPrepaidAmount)}
                            </span>
                          }
                        />
                        <ReconTableRow
                          label={`Còn phải thu (${payerLabel} chuyển)`}
                          sub="= Phải thu − tạm ứng thưởng đã cấn. Trước phê duyệt là số dự kiến."
                          strong
                          cdt={
                            <span
                              className={
                                (derived.amountToCollect ?? 0) < 0
                                  ? 'typo-body-lg-semibold text-semantic-danger-default'
                                  : 'typo-body-lg-semibold text-content-dark-1'
                              }
                            >
                              {derived.amountToCollect != null
                                ? signedMoney(derived.amountToCollect)
                                : '—'}
                            </span>
                          }
                        />
                      </>
                    )}
                </>
              )}

              {features.payoutRatio && derived.payoutRatio != null && (
                <ReconTableRow
                  label="Tỷ lệ chi trả"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      {formatPercent(derived.payoutRatio * 100)}
                    </span>
                  }
                />
              )}

              {derived.priorReceivedTotal != null && (
                <ReconTableRow
                  label="Đã nhận trước kỳ"
                  muted
                  cdt={
                    <span className="typo-body-base-medium text-content-dark-1">
                      {money(derived.priorReceivedTotal)}
                    </span>
                  }
                />
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ReconConfigTable
