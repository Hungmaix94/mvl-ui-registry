import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import { Chip, RateInput, Text } from '@/components/ui'
import type { ResolvedRateValue } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import MoneyPercentInput from '@/components/commons/MoneyPercentInput'
import { formatCurrencyVND, formatNumber } from '@/utils'
import {
  formatRateSpecWithEquivalent,
  fromRateSpec,
  resolveRateTriple,
  toRateSpecPayload,
  type RateSpecPayloadParts,
} from '@/utils/rate-spec'
import { LAD_F2_FIELDS } from '../../constants/lad-constants'
import type { LadF2Override } from '../../types/lad-types'
import { DeltaMoney, deltaClass } from '../detail/ladDelta'
import { LadRateInput } from './LadRateInput'
import { LadVatToggle } from './LadVatToggle'
import { type LadUnit } from './LadUnitToggle'

/** Cặp {pct, amt} hiệu lực của Hoa hồng F2: ưu tiên spec (phân số / %), nếu không có thì pct/amt. */
function commissionPair(ov: LadF2Override): { pct: number | null; amt: number | null } {
  return resolveRateTriple(ov.pct_f2_commission_spec, ov.pct_f2_commission, ov.amt_f2_commission)
}

/** Chữ ký 3 field HH F2 — phát hiện thay đổi TỪ NGOÀI để remount RateInput (uncontrolled-after-mount). */
function commissionSig(ov: LadF2Override): string {
  return JSON.stringify([
    ov.pct_f2_commission_spec ?? null,
    ov.pct_f2_commission ?? null,
    ov.amt_f2_commission ?? null,
  ])
}

interface LadF2PartnerCardProps {
  exchangeId: string
  exchangeName?: string
  exchangeCode?: string
  /** Deal codes routed through this exchange (from the preview) — "GD áp dụng" chips. */
  dealCodes?: string[]
  /** Fallback deal count from GET /{batch_id}/f2s/ when preview chips are not ready yet. */
  dealCount?: number
  /** Applied F2 rate before the batch (from GET /{batch_id}/f2s/) — HH/Thưởng cũ + Δ. */
  before?: LadF2Override | null
  value: LadF2Override
  onChange: (next: LadF2Override) => void
  disabled?: boolean
}

/** Compact display of a pct-or-amount value (summary mode). */
function curDisplay(pct?: number | null, amt?: number | null): string {
  if (pct != null) return `${formatNumber(pct)}%`
  if (amt != null) return `${formatCurrencyVND(amt)} đ`
  return '—'
}

/**
 * Card 2 — one F2 (sàn liên kết) sub-config, written to
 * payload_snapshot.f2_overrides_by_exchange[exchangeId]. Two modes: a compact SUMMARY row (identity
 * + current HH/Thưởng) and an animated EXPANDED edit mode (Hoa hồng F2 + Thưởng F2 side-by-side,
 * GD chips, Giữ giỏ hàng). Inputs reuse MoneyPercentInput / LadVatToggle; identity + "Cũ" come from
 * GET /{batch_id}/f2s/ applied rates (`is_f2_commission_include_vat = null` cascades from agency-fee VAT).
 */
export function LadF2PartnerCard({
  exchangeId,
  exchangeName,
  exchangeCode,
  dealCodes,
  dealCount,
  before,
  value,
  onChange,
  disabled,
}: LadF2PartnerCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Per-unit memory so toggling %↔đ restores the value last entered for each unit.
  const memRef = useRef<Record<string, number | null>>({})
  const set = (field: string, v: number | boolean | null) => {
    if (typeof v === 'number' || v === null) memRef.current[field] = v
    onChange({ ...value, [field]: v } as LadF2Override)
  }

  // Hoa hồng F2 (RateInput) — ghi spec + cache pct/amt (XOR) trong một lần cập nhật.
  const setCommission = (parts: RateSpecPayloadParts) => {
    onChange({
      ...value,
      pct_f2_commission_spec: parts.spec,
      pct_f2_commission: parts.pct,
      amt_f2_commission: parts.amt,
    })
  }

  const commissionSummary = commissionPair(value)
  // Summary thu gọn: khi HH F2 là phân số → hiện "5 / 8 của 2% ≈ 1,25%" thay vì chỉ % dẫn xuất (chi
  // tiết đầy đủ ở RateInput khi mở rộng). Phần "≈" là bắt buộc: summary này đóng lại theo mặc định
  // nên phân số trần là tất cả những gì người duyệt lô nhìn thấy trước khi bấm mở.
  const commissionFraction = formatRateSpecWithEquivalent(value.pct_f2_commission_spec)
  const bonusUnit: LadUnit = value.amt_f2_bonus != null ? 'amt' : 'pct'

  // Trạng thái = sàn đã có rate F2 đang áp dụng trên GD trong lô (từ /f2s/) chưa.
  // Đang áp dụng (xanh) khi có `before`; Chưa áp dụng (hổ phách) khi chưa có rate.
  const isApplied = before != null

  return (
    <div
      className="border-border-1 overflow-hidden rounded-lg border border-l-4"
      style={{
        borderLeftColor: isApplied
          ? 'var(--color-data-green-default)'
          : 'var(--color-data-orange-default)',
      }}
    >
      {/* Summary header — click to toggle edit mode */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-surface-secondary-1/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <span className="bg-data-orange-disabled text-data-orange-default flex h-9 w-9 shrink-0 items-center justify-center rounded text-xs font-bold">
          F2
        </span>
        <div className="flex min-w-0 flex-col">
          <Text className="typo-body-sm-semibold text-content-dark-1 truncate">
            {exchangeName || `Sàn liên kết #${exchangeId}`}
          </Text>
          <Text className="text-content-dark-3 truncate text-xs">
            {exchangeCode ? `${exchangeCode} · ` : ''}
            {dealCodes && dealCodes.length > 0
              ? `${dealCodes.length} GD áp dụng`
              : dealCount && dealCount > 0
                ? `${dealCount} GD áp dụng`
                : 'Chưa có GD'}
          </Text>
        </div>

        {/*
          `min-w-0` để summary co lại được: chuỗi phân số nay kèm quy đổi nên dài gấp đôi, mà flex
          item mặc định không co xuống dưới bề rộng nội dung ⇒ nó đẩy cụm chip `ml-auto` bên phải.
          Co được thì chữ tự xuống dòng — KHÔNG truncate vì chuỗi có thể chứa số tiền.
        */}
        <div className={'flex min-w-0 items-center'}>
          {!expanded && (
            <Text className="text-content-dark-2 hidden text-xs md:block">
              Hoa hồng{' '}
              {commissionFraction ?? curDisplay(commissionSummary.pct, commissionSummary.amt)} ·
              Thưởng {curDisplay(value.pct_f2_bonus, value.amt_f2_bonus)}
            </Text>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Chip
            label={isApplied ? 'Đang áp dụng' : 'Chưa áp dụng'}
            variant={isApplied ? ColoredValueVariant.GREEN : ColoredValueVariant.YELLOW}
            size="small"
            showDot
          />
          <span className="text-content-dark-3 flex items-center gap-1 text-xs font-medium">
            {expanded ? (
              'Thu gọn'
            ) : (
              <>
                <Pencil size={13} /> Sửa
              </>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
          </span>
        </div>
      </button>

      {/* Expandable edit content (animated via grid-rows) */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-border-1 flex flex-col gap-4 border-t px-4 pt-3 pb-4">
            {/* GD áp dụng */}
            {dealCodes && dealCodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Text className="text-content-dark-3 text-xs uppercase">
                  GD áp dụng ({dealCodes.length})
                </Text>
                {dealCodes.map((code) => (
                  <span
                    key={code}
                    className="bg-surface-secondary-1 text-content-dark-2 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}

            {/* Cấu hình tỷ lệ F2 — đồng bộ kiểu nhãn + bố cục nhãn-trên / input-dưới cho mọi ô.
                Chỉ chia 2 cột từ xl (≥1280) để ô "Hoa hồng F2" (RateInput) đủ rộng cho chế độ Phân số
                (tử/mẫu/số gốc) trên 1 dòng; dưới xl dồn 1 cột full-width, tránh wrap chật ở tablet. */}
            <div className="grid grid-cols-1 items-start gap-x-8 gap-y-4 xl:grid-cols-2">
              {/* Hoa hồng F2 — RateInput (%, đ trực tiếp, hoặc Phân số của một số gốc) */}
              <F2CommissionRate
                value={value}
                before={before ?? null}
                disabled={disabled}
                onCommissionChange={setCommission}
                vat={value.is_f2_commission_include_vat}
                onVat={(b) => set(LAD_F2_FIELDS.IS_COMMISSION_VAT, b)}
              />

              {/* Thưởng F2 */}
              <F2Field
                label="Thưởng F2 / căn"
                unit={bonusUnit}
                pctValue={value.pct_f2_bonus ?? null}
                amtValue={value.amt_f2_bonus ?? null}
                beforePct={before?.pct_f2_bonus ?? null}
                beforeAmt={before?.amt_f2_bonus ?? null}
                disabled={disabled}
                onUnit={(u) => {
                  if (u === 'pct') {
                    memRef.current.amt_f2_bonus = value.amt_f2_bonus ?? null
                    onChange({
                      ...value,
                      pct_f2_bonus: memRef.current.pct_f2_bonus ?? 0,
                      amt_f2_bonus: null,
                    } as LadF2Override)
                  } else {
                    memRef.current.pct_f2_bonus = value.pct_f2_bonus ?? null
                    onChange({
                      ...value,
                      amt_f2_bonus: memRef.current.amt_f2_bonus ?? 0,
                      pct_f2_bonus: null,
                    } as LadF2Override)
                  }
                }}
                onPct={(v) => set(LAD_F2_FIELDS.PCT_BONUS, v)}
                onAmt={(v) => set(LAD_F2_FIELDS.AMT_BONUS, v)}
                vat={value.is_f2_bonus_include_vat}
                onVat={(b) => set(LAD_F2_FIELDS.IS_BONUS_VAT, b)}
              />

              {/* Giữ giỏ hàng — đồng bộ nhãn-trên / input full-width như 2 ô trên (không VAT/Δ) */}
              <div className="flex flex-col gap-1.5">
                <Text className="typo-body-base-semibold text-neutral-90">Tỷ lệ Giữ giỏ hàng</Text>
                <LadRateInput
                  value={value.pct_f2_inventory_hold ?? null}
                  suffix="%"
                  disabled={disabled}
                  className="!w-full"
                  onChange={(v) => set(LAD_F2_FIELDS.PCT_INVENTORY_HOLD, v)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface F2FieldProps {
  label: string
  required?: boolean
  unit: LadUnit
  pctValue: number | null
  amtValue: number | null
  beforePct: number | null
  beforeAmt: number | null
  disabled?: boolean
  onUnit: (u: LadUnit) => void
  onPct: (v: number | null) => void
  onAmt: (v: number | null) => void
  vat?: boolean | null
  onVat: (b: boolean) => void
}

function oldDisplay(pct: number | null, amt: number | null): string {
  if (pct != null)
    return `${formatNumber(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  if (amt != null) return `${formatCurrencyVND(amt)} đ`
  return '—'
}

/** One F2 rate block (vertical): label · input + VAT · "Cũ + Δ". Used in the 2-column edit grid. */
function F2Field({
  label,
  required,
  unit,
  pctValue,
  amtValue,
  beforePct,
  beforeAmt,
  disabled,
  onUnit,
  onPct,
  onAmt,
  vat,
  onVat,
}: F2FieldProps) {
  const beforeKnown = beforePct != null || beforeAmt != null
  // Compare like-for-like units only (both % or both đ); new đ vs old % is not comparable.
  const ppDelta = beforePct != null && pctValue != null ? pctValue - beforePct : null
  const moneyDelta = beforeAmt != null && amtValue != null ? amtValue - beforeAmt : null
  const changed = (ppDelta != null && ppDelta !== 0) || (moneyDelta != null && moneyDelta !== 0)

  return (
    <div className="flex flex-col gap-1.5">
      <Text className="typo-body-base-semibold text-neutral-90">
        {label}
        {required && <span className="text-action-primary-red-default ml-0.5">*</span>}
      </Text>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <MoneyPercentInput
            mode={unit === 'amt' ? 'amount' : 'percent'}
            value={unit === 'amt' ? amtValue : pctValue}
            disabled={disabled}
            onValueChange={(v) => (unit === 'amt' ? onAmt(v) : onPct(v))}
            onModeChange={(m) => onUnit(m === 'amount' ? 'amt' : 'pct')}
          />
        </div>
        <LadVatToggle value={vat} onChange={onVat} disabled={disabled} />
      </div>
      {beforeKnown && (
        <div className="flex items-center gap-2 text-xs">
          <span className={changed ? 'text-content-dark-3 line-through' : 'text-content-dark-3'}>
            Cũ: {oldDisplay(beforePct, beforeAmt)}
          </span>
          {ppDelta != null && ppDelta !== 0 && (
            <span className={`font-semibold ${deltaClass(ppDelta)}`}>
              {`${ppDelta > 0 ? '+' : ''}${formatNumber(ppDelta, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`}
            </span>
          )}
          {moneyDelta != null && moneyDelta !== 0 && <DeltaMoney value={moneyDelta} />}
        </div>
      )}
    </div>
  )
}

interface F2CommissionRateProps {
  value: LadF2Override
  before: LadF2Override | null
  disabled?: boolean
  onCommissionChange: (parts: RateSpecPayloadParts) => void
  vat?: boolean | null
  onVat: (b: boolean) => void
}

/**
 * Hoa hồng F2 = RateInput (đồng bộ form TBC-F2): %, ₫ trực tiếp, hoặc phân số của một số gốc → ghi
 * `pct_f2_commission_spec` (+ cache pct/amt theo ràng buộc XOR). RateInput là uncontrolled-after-mount
 * nên remount bằng `key` khi giá trị HH bị đổi TỪ NGOÀI (prefill TBC bất đồng bộ); KHÔNG remount khi
 * chính nó emit (tránh mất focus). Dòng "Cũ + Δ" so cặp dẫn xuất cùng đơn vị; VAT ghim cuối hàng input.
 */
function F2CommissionRate({
  value,
  before,
  disabled,
  onCommissionChange,
  vat,
  onVat,
}: F2CommissionRateProps) {
  const lastEmitRef = useRef<string>(commissionSig(value))
  const [gen, setGen] = useState(0)
  useEffect(() => {
    const incoming = commissionSig(value)
    if (incoming !== lastEmitRef.current) {
      lastEmitRef.current = incoming
      setGen((g) => g + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pct_f2_commission_spec, value.pct_f2_commission, value.amt_f2_commission])

  const seed = fromRateSpec(
    value.pct_f2_commission_spec,
    value.pct_f2_commission,
    value.amt_f2_commission
  )

  const handleChange = (r: ResolvedRateValue) => {
    const parts = toRateSpecPayload(r)
    lastEmitRef.current = JSON.stringify([parts.spec, parts.pct, parts.amt])
    onCommissionChange(parts)
  }

  const afterPair = commissionPair(value)
  const beforePair = before ? commissionPair(before) : { pct: null, amt: null }
  const beforeKnown = beforePair.pct != null || beforePair.amt != null
  const ppDelta =
    beforePair.pct != null && afterPair.pct != null ? afterPair.pct - beforePair.pct : null
  const moneyDelta =
    beforePair.amt != null && afterPair.amt != null ? afterPair.amt - beforePair.amt : null
  const changed = (ppDelta != null && ppDelta !== 0) || (moneyDelta != null && moneyDelta !== 0)

  return (
    <div className="flex flex-col gap-1.5">
      <RateInput
        key={gen}
        label="Hoa hồng F2"
        required
        capAt100
        value={seed ?? undefined}
        disabled={disabled}
        onChange={handleChange}
        trailing={<LadVatToggle value={vat} onChange={onVat} disabled={disabled} />}
      />
      {beforeKnown && (
        <div className="flex items-center gap-2 text-xs">
          <span className={changed ? 'text-content-dark-3 line-through' : 'text-content-dark-3'}>
            Cũ: {oldDisplay(beforePair.pct, beforePair.amt)}
          </span>
          {ppDelta != null && ppDelta !== 0 && (
            <span className={`font-semibold ${deltaClass(ppDelta)}`}>
              {`${ppDelta > 0 ? '+' : ''}${formatNumber(ppDelta, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`}
            </span>
          )}
          {moneyDelta != null && moneyDelta !== 0 && <DeltaMoney value={moneyDelta} />}
        </div>
      )}
    </div>
  )
}

export default LadF2PartnerCard
