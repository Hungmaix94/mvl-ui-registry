import { Fragment } from 'react'
import { Info } from 'lucide-react'
import { Chip, Text } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { cn, formatCurrencyVND, formatNumber } from '@/utils'

import {
  LAD_CDT_CONFIG_ROWS,
  LAD_CONFIG_GROUP_LABEL,
  LAD_F2_FIELDS,
  type LadCdtConfigRow,
} from '../../constants/lad-constants'
import type { LadF2AppliedRate, LadPayloadSnapshot } from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'
import {
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  resolveRateTriple,
  type RateSpecRequest,
} from '@/utils/rate-spec'
import { DeltaMoney, DeltaPp } from './ladDelta'

type Rec = Record<string, unknown>

interface LadConfigSnapshotTableProps {
  /** SAU LÔ — the applied config (payload_snapshot). */
  payload?: LadPayloadSnapshot | null
  /** TRƯỚC LÔ — current config before the batch, derived from a preview line's `before` map. */
  beforeConfig?: Rec | null
  /** F2 partners (exchanges) with a deal in the batch — supplies name/code/deal_count per partner. */
  f2Rows?: LadF2AppliedRate[]
  /** Number of deals the config is applied across (subtitle). */
  dealCount?: number
  /** Applied batches are immutable — render the locked-snapshot wording + warning. */
  isLocked?: boolean
}

function n(rec: Rec | null | undefined, field?: string): number | null {
  if (!rec || !field) return null
  return toNum(rec[field])
}

interface Pair {
  pct: number | null
  amt: number | null
}

function readPair(rec: Rec | null | undefined, row: LadCdtConfigRow): Pair {
  return { pct: n(rec, row.pctField), amt: n(rec, row.amtField) }
}

type LadUnit = 'pct' | 'amt'

interface Eff {
  /** Active unit of the value; null when the side has no data at all (render "—", no delta). */
  unit: LadUnit | null
  value: number
}

/**
 * Collapse a {pct, amt} pair to its single effective value + unit. A `both`-unit field is configured
 * as EITHER % or đ, but the BE `before` map often also carries a spurious `0` in the other slot — so
 * a non-zero side always wins. When the value is zero/unset, fall back to `preferUnit` (the SAU LÔ
 * unit) so TRƯỚC LÔ lines up with SAU LÔ instead of showing "0.00 %" against an amount field.
 */
function resolveEff(pair: Pair, preferUnit: LadUnit | null): Eff {
  if (pair.amt != null && pair.amt !== 0) return { unit: 'amt', value: pair.amt }
  if (pair.pct != null && pair.pct !== 0) return { unit: 'pct', value: pair.pct }
  const unit = preferUnit ?? (pair.amt != null ? 'amt' : pair.pct != null ? 'pct' : null)
  if (unit == null) return { unit: null, value: 0 }
  return { unit, value: (unit === 'amt' ? pair.amt : pair.pct) ?? 0 }
}

/** BEFORE side: a pair with no key at all stays unknown (render "—", skip the delta). */
function resolveBeforeEff(pair: Pair, preferUnit: LadUnit | null): Eff {
  if (pair.pct == null && pair.amt == null) return { unit: null, value: 0 }
  return resolveEff(pair, preferUnit)
}

function formatEff({ unit, value }: Eff): string {
  if (unit == null) return '—'
  return unit === 'amt'
    ? `${formatCurrencyVND(value)} đ`
    : `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
}

/** Δ only when both sides are known and share a unit (a %↔đ switch isn't comparable). */
function rowDelta(before: Eff, after: Eff): { kind: 'pp' | 'money'; value: number } | null {
  if (before.unit == null || after.unit == null || before.unit !== after.unit) return null
  return { kind: after.unit === 'pct' ? 'pp' : 'money', value: after.value - before.value }
}

interface F2Metric {
  before: Eff
  after: Eff
  changed: boolean
}

/** Resolve one F2 metric (commission/bonus) before vs after into displayable Effs + a changed flag. */
function f2Metric(
  beforeRec: Rec | null,
  afterRec: Rec | null,
  pctField: string,
  amtField: string
): F2Metric {
  const after = resolveEff({ pct: n(afterRec, pctField), amt: n(afterRec, amtField) }, null)
  const before = resolveBeforeEff(
    { pct: n(beforeRec, pctField), amt: n(beforeRec, amtField) },
    after.unit
  )
  const delta = rowDelta(before, after)
  return { before, after, changed: delta != null && delta.value !== 0 }
}

/** Hoa hồng F2: cặp {pct, amt} ưu tiên RateSpec (phân số / %) — dẫn xuất %/đ để so sánh — rồi pct/amt. */
function commissionPair(rec: Rec | null): Pair {
  // `rec` là blob JSON read-only (BE unknown) → narrow spec về shape đã biết tại ranh giới dữ liệu.
  const spec = rec?.[LAD_F2_FIELDS.SPEC_COMMISSION] as RateSpecRequest | null | undefined
  return resolveRateTriple(
    spec,
    n(rec, LAD_F2_FIELDS.PCT_COMMISSION),
    n(rec, LAD_F2_FIELDS.AMT_COMMISSION)
  )
}

/** Commission metric — spec-aware (phân số dẫn xuất ra % / đ trước khi so before↔after). */
function f2CommissionMetric(beforeRec: Rec | null, afterRec: Rec | null): F2Metric {
  const after = resolveEff(commissionPair(afterRec), null)
  const before = resolveBeforeEff(commissionPair(beforeRec), after.unit)
  const delta = rowDelta(before, after)
  return { before, after, changed: delta != null && delta.value !== 0 }
}

/**
 * Detail-view config snapshot — the "Snapshot cấu hình · CĐT" table (TRƯỜNG | VAT | TRƯỚC LÔ |
 * SAU LÔ | Δ) plus the F2 per-partner cards. SAU LÔ is the immutable `payload_snapshot`; TRƯỚC LÔ
 * is derived from the preview `before` map (only the keys the BE returns — others render "—" rather
 * than inventing a delta). Used by the applied/draft detail view; the wizard review screen keeps
 * the lighter {@link LadConfigDiffView}.
 */
export function LadConfigSnapshotTable({
  payload,
  beforeConfig,
  f2Rows,
  dealCount,
  isLocked,
}: LadConfigSnapshotTableProps) {
  const after = (payload ?? {}) as Rec
  const before = (beforeConfig ?? null) as Rec | null
  // F2 cards are driven by the partners that actually have a deal in the batch (f2Rows → name/code/
  // deal_count). SAU LÔ rates come from the applied payload; TRƯỚC LÔ from the line before-snapshot.
  const f2Partners = f2Rows ?? []
  const afterF2ByExchange =
    (after.f2_overrides_by_exchange as Record<string, Rec> | undefined) ?? {}
  const beforeF2ByExchange = (before?.f2_rates_by_exchange as Record<string, Rec> | undefined) ?? {}

  const scope = dealCount != null ? ` (áp chung ${dealCount} GD)` : ''

  let lastGroup: LadCdtConfigRow['group'] | null = null

  return (
    <div className="flex flex-col gap-5">
      {/* CĐT config table */}
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 flex flex-col gap-0.5 border-b px-5 py-3.5">
          <Text className="typo-body-base-semibold text-content-dark-1">
            {isLocked ? 'Snapshot cấu hình · CĐT' : 'Cấu hình mới · CĐT'}
            {scope}
          </Text>
          <Text className="typo-body-sm-regular text-content-dark-3">
            {isLocked
              ? 'Khoá tại thời điểm áp dụng — bất biến.'
              : 'So với cấu hình hiện hành. Trường có thay đổi được tô đậm.'}
          </Text>
        </div>

        {/* Column header */}
        <div className="bg-surface-secondary-2 text-content-dark-3 grid grid-cols-[1.6fr_0.7fr_1fr_1fr_1fr] gap-3 px-5 py-2 text-xs font-semibold uppercase">
          <span>Trường</span>
          <span>VAT</span>
          <span className="text-right">Phí base</span>
          <span className="text-right">Sau lô</span>
          <span className="text-right">Δ</span>
        </div>

        <div className="divide-border-1 divide-y">
          {LAD_CDT_CONFIG_ROWS.map((row) => {
            const afterEff = resolveEff(readPair(after, row), null)
            const beforeEff = resolveBeforeEff(readPair(before, row), afterEff.unit)
            const delta = rowDelta(beforeEff, afterEff)
            const changed = delta != null && delta.value !== 0
            const showGroup = row.group !== lastGroup
            lastGroup = row.group

            const vat = row.vatField ? after[row.vatField] : undefined

            return (
              <Fragment key={row.key}>
                {showGroup && (
                  <div className="bg-surface-secondary-1 text-content-dark-2 px-5 py-1.5 text-xs font-semibold">
                    {LAD_CONFIG_GROUP_LABEL[row.group]}
                  </div>
                )}
                <div className="grid grid-cols-[1.6fr_0.7fr_1fr_1fr_1fr] items-center gap-3 px-5 py-3">
                  <Text className="typo-body-sm-medium text-content-dark-2">{row.label}</Text>
                  <span>
                    {row.vatField == null ? (
                      <span className="text-content-dark-3 text-xs">—</span>
                    ) : (
                      <Chip
                        label={vat === true ? 'CÓ VAT' : 'KHÔNG VAT'}
                        variant={vat === true ? ColoredValueVariant.BLUE : ColoredValueVariant.GREY}
                        size="small"
                      />
                    )}
                  </span>
                  <Text
                    className={`typo-body-sm-regular text-right ${
                      changed ? 'text-content-dark-3 line-through' : 'text-content-dark-2'
                    }`}
                  >
                    {formatEff(beforeEff)}
                  </Text>
                  <Text className="typo-body-sm-semibold text-content-dark-1 text-right">
                    {formatEff(afterEff)}
                  </Text>
                  <span className="text-right text-sm">
                    {delta == null ? (
                      <span className="text-content-dark-3">—</span>
                    ) : delta.kind === 'pp' ? (
                      <DeltaPp value={delta.value || null} />
                    ) : (
                      <DeltaMoney value={delta.value || null} />
                    )}
                  </span>
                </div>
              </Fragment>
            )
          })}
        </div>

        {isLocked && (
          <div className="border-lime-yellow-30 bg-data-yellow-disabled m-4 flex items-start gap-2.5 rounded-lg border px-4 py-3">
            <Info className="text-data-yellow-hover mt-px h-4 w-4 shrink-0" />
            <Text className="typo-body-sm-regular text-content-dark-2">
              Lô đã khoá. Nếu cần sửa, hãy{' '}
              <span className="text-content-dark-1 font-semibold">sao chép lô</span> để tạo một lô
              nháp mới thay thế — không chỉnh sửa trực tiếp lô đã áp dụng.
            </Text>
          </div>
        )}
      </section>

      {/* F2 per-partner cards */}
      {f2Partners.length > 0 && (
        <section className="border-border-1 overflow-hidden rounded-xl border">
          <div className="border-border-1 flex flex-col gap-0.5 border-b px-5 py-3.5">
            <Text className="typo-body-base-semibold text-content-dark-1">
              {isLocked
                ? 'Snapshot cấu hình · F2 (per partner)'
                : 'Cấu hình mới · F2 (per partner)'}
            </Text>
            <Text className="typo-body-sm-regular text-content-dark-3">
              {f2Partners.length} đối tác F2 có giao dịch trong lô. Đối tác chưa ký phụ lục sẽ giữ
              cấu hình cũ tới khi ký.
            </Text>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {f2Partners.map((partner) => (
              <F2PartnerCard
                key={partner.exchange.id}
                partner={partner}
                beforeRec={beforeF2ByExchange[String(partner.exchange.id)] ?? null}
                afterRec={afterF2ByExchange[String(partner.exchange.id)] ?? null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function F2PartnerCard({
  partner,
  beforeRec,
  afterRec,
}: {
  partner: LadF2AppliedRate
  beforeRec: Rec | null
  afterRec: Rec | null
}) {
  const commission = f2CommissionMetric(beforeRec, afterRec)
  // Khi HH F2 cấu hình kiểu phân số → giữ dạng "x / y của z" làm chính (% dẫn xuất hiện mờ bên dưới),
  // thay vì chỉ % BE tính lại. Đồng bộ với bảng F2 của SaleAllocation.
  const commissionSpec = afterRec?.[LAD_F2_FIELDS.SPEC_COMMISSION] as
    | RateSpecRequest
    | null
    | undefined
  const commissionFraction = formatRateSpecFraction(commissionSpec)
  const commissionEquivalent = formatRateSpecEquivalent(commissionSpec)
  const bonus = f2Metric(beforeRec, afterRec, LAD_F2_FIELDS.PCT_BONUS, LAD_F2_FIELDS.AMT_BONUS)

  const holdBefore = n(beforeRec, LAD_F2_FIELDS.PCT_INVENTORY_HOLD)
  const holdAfter = n(afterRec, LAD_F2_FIELDS.PCT_INVENTORY_HOLD)
  const holdChanged = holdBefore != null && holdAfter != null && holdBefore !== holdAfter

  const changed = commission.changed || bonus.changed || holdChanged
  // Green accent when this partner's rate changed in the batch, amber when it carries over unchanged.
  const accentColor = changed
    ? 'var(--color-data-green-default)'
    : 'var(--color-data-orange-default)'

  const subtitleParts = [partner.exchange.code, `${partner.deal_count} GD`].filter(Boolean)

  return (
    <div
      className="border-border-1 rounded-lg border px-4 py-3.5"
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.8fr_repeat(2,1fr)] md:items-center">
        <div className="flex items-center gap-2.5">
          <span className="bg-data-yellow-disabled text-data-yellow-hover rounded px-2 py-1 text-xs font-semibold">
            F2
          </span>
          <div className="flex min-w-0 flex-col">
            <Text
              className="typo-body-sm-semibold text-content-dark-1 truncate"
              title={partner.exchange.name}
            >
              {partner.exchange.name}
            </Text>
            <Text className="text-content-dark-3 text-xs">{subtitleParts.join(' · ')}</Text>
          </div>
        </div>
        <F2MetricCell
          label="Hoa hồng"
          value={formatEff(commission.after)}
          fraction={commissionFraction}
          equivalent={commissionEquivalent}
          strong
        />
        <F2MetricCell label="Thưởng" value={formatEff(bonus.after)} strong />
      </div>

      <div className="border-border-1 mt-3 border-t pt-2.5">
        <Text className="text-content-dark-3 text-xs">
          Giữ giỏ hàng:{' '}
          <span className="typo-body-sm-semibold text-content-dark-1">
            {holdAfter != null
              ? `${formatNumber(holdAfter, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
              : holdBefore != null
                ? `${formatNumber(holdBefore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
                : '—'}
          </span>
        </Text>
      </div>
    </div>
  )
}

function F2MetricCell({
  label,
  value,
  fraction,
  equivalent,
  struck,
  strong,
}: {
  label: string
  value: string
  /** Dạng phân số "x / y của z" (RateSpec) — khi có thì làm giá trị chính, quy đổi thành "≈ …" mờ bên dưới. */
  fraction?: string | null
  /**
   * Số quy đổi của phân số (`formatRateSpecEquivalent`) cho dòng "≈ …". Chỉ dùng khi có `fraction`.
   * Bỏ trống ⇒ rơi về `value` (số BE tính lại) — giữ hành vi cũ cho các ô chưa truyền.
   */
  equivalent?: string | null
  struck?: boolean
  strong?: boolean
}) {
  const valueClass = cn(
    strong ? 'typo-body-sm-semibold text-content-dark-1' : 'typo-body-sm-regular',
    struck ? 'text-content-dark-3 line-through' : strong ? '' : 'text-content-dark-2'
  )
  return (
    <div className="flex flex-col gap-0.5">
      <Text className="text-content-dark-3 text-[11px] uppercase">{label}</Text>
      {fraction ? (
        <div className="flex flex-col">
          <Text className={valueClass}>{fraction}</Text>
          <Text className="text-content-dark-3 text-xs">≈ {equivalent ?? value}</Text>
        </div>
      ) : (
        <Text className={valueClass}>{value}</Text>
      )}
    </div>
  )
}

export default LadConfigSnapshotTable
