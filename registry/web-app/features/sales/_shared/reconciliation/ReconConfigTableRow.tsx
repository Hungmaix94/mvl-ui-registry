import { type ReactNode } from 'react'

import FormulaInfo from '@/features/sales/_shared/components/FormulaInfo'
import { ColoredValueVariant } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import { isSimpleProfile } from '@/features/sales/_shared/reconciliation/recon-kind'

/**
 * Primitives for the ConfigTable — one real `<table>` (mockup `rf5-tbl`): a full-width section band
 * (`ReconTableBand`, mockup `PhanHd5`) and a data row (`ReconTableRow`).
 *
 * Two layouts, driven by the active recon preset:
 * - rich (CĐT): 4 columns — `nhãn | CĐT đề nghị | MV ghi nhận | Đối chiếu`.
 * - simple (F2/CTV): 2 columns — `nhãn | MV ghi nhận` (F2 chỉ XEM, map thẳng số BE; KHÔNG có cột
 *   "MV ghi nhận" đối chứng + "Đối chiếu" nữa — cột giá trị duy nhất chính là "MV ghi nhận").
 */

export type ReconCompareUnit = 'currency' | 'percent'

/** Tolerance below which the CĐT input and the MV reference count as "Khớp". */
const DELTA_EPSILON_BY_UNIT: Record<ReconCompareUnit, number> = {
  currency: 1, // VND
  percent: 0.01, // percentage points
}

/** MV cell text when the system has no recorded value for the row. */
export const RECON_NO_REFERENCE_TEXT = '— (không quy định)'

/**
 * Hậu tố VAT cho ô "MV ghi nhận" — căn cứ cờ `is_*_include_vat` từ deal commission config.
 * `true` → "(đã gồm VAT)", `false` → "(chưa gồm VAT)", `null/undefined` → '' (không xác định).
 */
export function vatInclusionLabel(includeVat: boolean | null | undefined): string {
  if (includeVat == null) return ''
  return includeVat ? '(đã gồm VAT)' : '(chưa gồm VAT)'
}

/** Ghép giá trị MV với hậu tố "(đã gồm/chưa gồm VAT)" nếu cờ xác định. */
export function withVatInclusion(text: string, includeVat: boolean | null | undefined): string {
  const suffix = vatInclusionLabel(includeVat)
  return suffix ? `${text} ${suffix}` : text
}

export interface ReconDelta {
  match: boolean
  /** CĐT input − MV reference (dương ⇒ CĐT đề nghị CAO HƠN MV; âm ⇒ THẤP HƠN). */
  diff: number
}

/**
 * delta = (CĐT input) − (MV reference). Dương ⇒ CĐT đề nghị cao hơn MV (chip xanh dương), âm ⇒ thấp
 * hơn (chip đỏ). Trả `null` khi không có MV reference, để dòng hiện {@link RECON_NO_REFERENCE_TEXT} và
 * không có chip.
 */
export function computeReconDelta(
  cdt: number | null | undefined,
  mv: number | null | undefined,
  unit: ReconCompareUnit
): ReconDelta | null {
  if (mv == null) return null
  const diff = (cdt ?? 0) - mv
  return { match: Math.abs(diff) <= DELTA_EPSILON_BY_UNIT[unit], diff }
}

/**
 * `maximumFractionDigits` mặc định 10 vì phần lớn ô `percent` của bảng cấu hình là tỷ lệ CẤU
 * HÌNH (`pct_agency_fee`, `pct_shared_bonus`, `pct_investor_bonus`) — BE đã nới các cột này lên
 * numeric(14,10), cắt còn 3 chữ số thập phân là làm mất dữ liệu thật.
 *
 * Các núm TIẾN ĐỘ (`pct_period_commission`, `shared_bonus_to_sale_pct`) không nằm trong nhóm đó:
 * call site của chúng truyền 3 để giữ nguyên cách hiển thị cũ.
 */
export function formatReconUnit(
  value: number,
  unit: ReconCompareUnit,
  maximumFractionDigits: number = 10
): string {
  if (unit === 'percent') return formatPercent(value, false, maximumFractionDigits)
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

function formatSigned(value: number, unit: ReconCompareUnit): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatReconUnit(Math.abs(value), unit)}`
}

/**
 * Delta chip (mockup `rf5-chip`): "Khớp" (xanh lá) trong ngưỡng; lệch thì tô màu theo hướng —
 * CĐT cao hơn MV → "Lệch +…" (xanh dương), thấp hơn → "Lệch −…" (đỏ).
 */
export function ReconDeltaChip({ delta, unit }: { delta: ReconDelta; unit: ReconCompareUnit }) {
  if (delta.match) {
    return <ReconMatchChip />
  }
  return (
    // Chip lệch chỉ hiện SỐ delta (đã có dấu + chấm tròn màu chỉ hướng) — bỏ tiền tố "Lệch" (yêu cầu 2026-06-24).
    <ReconStateChip
      label={formatSigned(delta.diff, unit)}
      variant={delta.diff > 0 ? ColoredValueVariant.BLUE : ColoredValueVariant.RED}
    />
  )
}

/** Muted "—" placeholder used in the MV / Đối chiếu columns when a row has no reference. */
export function ReconMutedDash() {
  return <span className="text-content-dark-4">—</span>
}

/** Màu chip trạng thái (outlined: chữ + nền nhạt) cho Khớp (xanh lá) / Lệch (đỏ / xanh dương). */
const RECON_STATE_CHIP_CLS: Partial<Record<ColoredValueVariant, string>> = {
  [ColoredValueVariant.GREEN]: 'text-data-green-default bg-data-green-disabled',
  [ColoredValueVariant.RED]: 'text-data-red-default bg-data-red-disabled',
  [ColoredValueVariant.BLUE]: 'text-data-blue-default bg-data-blue-disabled',
}
const RECON_STATE_CHIP_DOT: Partial<Record<ColoredValueVariant, string>> = {
  [ColoredValueVariant.GREEN]: 'bg-data-green-default',
  [ColoredValueVariant.RED]: 'bg-data-red-default',
  [ColoredValueVariant.BLUE]: 'bg-data-blue-default',
}

/**
 * Chip trạng thái Khớp/Lệch cột "Đối chiếu" — DÙNG CHUNG: pill cỡ chữ nhỏ (`typo-body-xs-medium`) +
 * chấm tròn, chỉ khác màu theo variant. Khớp & Lệch vì vậy hài hoà (cùng kích thước / cỡ chữ / padding
 * / đều có chấm tròn). Dùng span riêng thay vì component Chip để chủ động cỡ chữ nhỏ (Chip small cố
 * định `typo-body-sm`, không override qua className được do thứ tự CSS).
 */
function ReconStateChip({ label, variant }: { label: string; variant: ColoredValueVariant }) {
  return (
    <span
      className={cn(
        'typo-body-xs-medium inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5',
        RECON_STATE_CHIP_CLS[variant]
      )}
    >
      <span className={cn('size-[6px] shrink-0 rounded-full', RECON_STATE_CHIP_DOT[variant])} />
      {label}
    </span>
  )
}

/** Chip "Khớp" (xanh lá) — alias {@link ReconStateChip}. Dùng chung cho cột "Đối chiếu" (qua
 * {@link ReconCheckChip}) để cả bảng chỉ có MỘT kiểu hiển thị "khớp" (cùng chip + chấm tròn, hài hoà
 * với chip "Lệch"). */
export function ReconMatchChip() {
  return <ReconStateChip label="Khớp" variant={ColoredValueVariant.GREEN} />
}

/**
 * Standalone "Lệch" chip for rows where MV records nothing ("— (không quy định)") but the CĐT
 * proposes a value — CĐT đề nghị cao hơn (MV = 0) nên dùng màu xanh dương. Không có MV reference để
 * feed {@link computeReconDelta} nên caller tự format nhãn.
 */
export function ReconMismatchChip({ label }: { label: string }) {
  return <ReconStateChip label={label} variant={ColoredValueVariant.BLUE} />
}

/**
 * Đối-chiếu cell lấy TỪ recon_check của BE: `match=true` → "Khớp" (xanh lá), `match=false` → "Lệch".
 * Khi BE trả `delta` (submitted − mv_config, CÙNG đơn vị) và caller biết `unit` → hiện "Lệch <±delta>"
 * (xanh dương nếu CĐT cao hơn MV, đỏ nếu thấp hơn) thay vì chỉ "Lệch". Không có delta/đơn vị (khác
 * đơn vị, không trừ được) → chỉ "Lệch". Số liệu chi tiết vẫn ở khối "Lệch so với MV đang ghi nhận" dưới bảng.
 */
export function ReconCheckChip({
  match,
  delta,
  unit,
}: {
  match: boolean
  delta?: string | number | null
  unit?: ReconCompareUnit
}) {
  if (match) {
    return <ReconMatchChip />
  }
  const deltaNum = delta == null ? null : typeof delta === 'number' ? delta : Number(delta)
  const hasDelta = deltaNum != null && Number.isFinite(deltaNum) && unit != null
  return (
    // Có số delta ⇒ chỉ hiện số (bỏ "Lệch"); không có số (khác đơn vị, không trừ được) ⇒ giữ nhãn "Lệch".
    <ReconStateChip
      label={hasDelta ? formatSigned(deltaNum, unit) : 'Lệch'}
      variant={hasDelta && deltaNum > 0 ? ColoredValueVariant.BLUE : ColoredValueVariant.RED}
    />
  )
}

/** "= MV (…)" hint shown in the CĐT cell when a Phần-0 field is locked (read-only, p2 off). */
export function ReconLockedToMv({ children }: { children: ReactNode }) {
  return <span className="typo-body-sm-regular text-content-dark-3">{children}</span>
}

const BAND_BG: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'bg-data-green-disabled',
  [ColoredValueVariant.BLUE]: 'bg-data-blue-disabled',
  [ColoredValueVariant.YELLOW]: 'bg-data-yellow-disabled',
  [ColoredValueVariant.PURPLE]: 'bg-data-purple-disabled',
  [ColoredValueVariant.RED]: 'bg-data-red-disabled',
  [ColoredValueVariant.ORANGE]: 'bg-data-orange-disabled',
  [ColoredValueVariant.GREY]: 'bg-data-light-grey-disabled',
}

const BAND_TEXT: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'text-data-green-default',
  [ColoredValueVariant.BLUE]: 'text-data-blue-default',
  [ColoredValueVariant.YELLOW]: 'text-data-yellow-default',
  [ColoredValueVariant.PURPLE]: 'text-data-purple-default',
  [ColoredValueVariant.RED]: 'text-data-red-default',
  [ColoredValueVariant.ORANGE]: 'text-data-orange-default',
  [ColoredValueVariant.GREY]: 'text-content-dark-3',
}

const BAND_DOT: Record<ColoredValueVariant, string> = {
  [ColoredValueVariant.GREEN]: 'bg-data-green-default',
  [ColoredValueVariant.BLUE]: 'bg-data-blue-default',
  [ColoredValueVariant.YELLOW]: 'bg-data-yellow-default',
  [ColoredValueVariant.PURPLE]: 'bg-data-purple-default',
  [ColoredValueVariant.RED]: 'bg-data-red-default',
  [ColoredValueVariant.ORANGE]: 'bg-data-orange-default',
  [ColoredValueVariant.GREY]: 'bg-content-dark-3',
}

export interface ReconTableBandProps {
  label: string
  color?: ColoredValueVariant
  /** Optional right-aligned hint (e.g. "Tự động khi xác nhận"). */
  hint?: ReactNode
}

/**
 * Full-width section header row (mockup `rf5-phan-hd hd-{color}`). Spans all columns — 4 for the rich
 * (CĐT) layout, 2 for the simple (F2/CTV) value-only layout.
 */
export function ReconTableBand({
  label,
  color = ColoredValueVariant.GREY,
  hint,
}: ReconTableBandProps) {
  const valueOnly = isSimpleProfile(useReconKind())
  return (
    <tr>
      <td colSpan={valueOnly ? 2 : 4} className={cn('px-3 py-1.5', BAND_BG[color])}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn('size-[7px] shrink-0 rounded-full', BAND_DOT[color])} />
            <span className={cn('typo-body-sm-semibold', BAND_TEXT[color])}>{label}</span>
          </div>
          {hint != null && <span className="typo-body-xs-regular text-content-dark-3">{hint}</span>}
        </div>
      </td>
    </tr>
  )
}

export interface ReconTableRowProps {
  label: ReactNode
  /** Formula/usage hint shown under the label (mockup `lbl-sub`). */
  sub?: ReactNode
  /** CĐT đề nghị cell — input node or a value. */
  cdt: ReactNode
  /** MV ghi nhận cell — read-only reference. Omit ⇒ muted "—". */
  mv?: ReactNode
  /** Đối chiếu cell — delta chip / ok-tick. Omit ⇒ muted "—". */
  delta?: ReactNode
  /** Bold the row (mockup `row-strong`: Tiến độ sau ĐC, NET). */
  strong?: boolean
  /** Dim the row (mockup `row-muted`: computed rows whose MV = "—"). */
  muted?: boolean
  /** Warning background (mockup `row-warn`). */
  warn?: boolean
  /** Indent the label (mockup "· Trong đó …" sub-rows). */
  indent?: boolean
  /** Anchor id (vd `recon-row-{index}-{field}`) — để khối "Lệch so với MV đang ghi nhận" cuộn tới dòng. */
  id?: string
}

/**
 * One data row of the ConfigTable.
 * - rich (CĐT): 4 cells — `nhãn | giá trị (cdt) | MV ghi nhận | Đối chiếu`. Pass `undefined` for
 *   `mv`/`delta` to render the muted "—" the mockup shows for computed/locked rows.
 * - simple (F2/CTV): 2 cells — `nhãn | giá trị (cdt)`. The `mv`/`delta` cells are dropped entirely;
 *   the single value column IS "MV ghi nhận" (F2 chỉ xem, số map thẳng từ BE).
 */
export function ReconTableRow({
  label,
  sub,
  cdt,
  mv,
  delta,
  strong,
  muted,
  warn,
  indent,
  id,
}: ReconTableRowProps) {
  const valueOnly = isSimpleProfile(useReconKind())
  return (
    <tr
      id={id}
      className={cn('border-border-1 scroll-mt-24 border-b', warn && 'bg-semantic-danger-subtle')}
    >
      <td className={cn('px-2 py-1.5 align-middle', muted && 'opacity-70')}>
        <span
          className={cn(
            'block',
            strong
              ? 'typo-body-base-semibold text-content-dark-1'
              : 'typo-body-base text-content-dark-2',
            indent && 'pl-4'
          )}
        >
          {label}
        </span>
        {sub != null && (
          <span className="typo-body-xs-regular text-content-dark-3 mt-0.5 block">{sub}</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex justify-end">{cdt}</div>
      </td>
      {!valueOnly && (
        <>
          <td
            className={cn(
              'typo-body-base-medium text-content-dark-1 px-2 py-1.5 text-right align-middle',
              muted && 'opacity-70'
            )}
          >
            {mv ?? <ReconMutedDash />}
          </td>
          <td className="px-2 py-1.5 text-right align-middle">{delta ?? <ReconMutedDash />}</td>
        </>
      )}
    </tr>
  )
}

/** Label cell with an info-tooltip formula (used when the hint is long / interactive). */
export function ReconRowLabelWithFormula({ label, formula }: { label: string; formula: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <FormulaInfo formula={formula} size={14} />
    </span>
  )
}
