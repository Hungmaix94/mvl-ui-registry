import { Fragment } from 'react'
import { Text } from '@/components/ui'
import { formatCurrencyVND, formatRatePct } from '@/utils'
import {
  LAD_CDT_CONFIG_ROWS,
  LAD_CONFIG_GROUP_LABEL,
  LAD_F2_FIELDS,
  type LadCdtConfigRow,
} from '../../constants/lad-constants'
import type { LadF2Override, LadPayloadSnapshot } from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'
import {
  formatRateSpecWithEquivalent,
  resolveRateTriple,
  type RateSpecRequest,
} from '@/utils/rate-spec'

interface LadConfigDiffViewProps {
  payload?: LadPayloadSnapshot | null
}

type PayloadRecord = Record<string, unknown>

function num(payload: PayloadRecord, field?: string): number | null {
  if (!field) return null
  return toNum(payload[field])
}

function formatRowValue(payload: PayloadRecord, row: LadCdtConfigRow): string {
  const pct = num(payload, row.pctField)
  if (pct != null) return `${pct} %`
  const amt = num(payload, row.amtField)
  if (amt != null) return `${formatCurrencyVND(amt)} đ`
  return '—'
}

function vatLabel(payload: PayloadRecord, vatField: string | null): string {
  if (!vatField) return ''
  const v = payload[vatField]
  if (v === true) return '· có VAT'
  if (v === false) return '· ko VAT'
  return ''
}

/** Hoa hồng F2 (read-only): ưu tiên RateSpec (phân số / %) → dẫn xuất % / đ; nếu không, pct/amt thô. */
function commissionText(r: PayloadRecord): string {
  // `r` là blob JSON read-only (BE unknown) → narrow spec về shape đã biết tại ranh giới dữ liệu.
  const spec = r[LAD_F2_FIELDS.SPEC_COMMISSION] as RateSpecRequest | null | undefined
  const { pct, amt } = resolveRateTriple(
    spec,
    num(r, LAD_F2_FIELDS.PCT_COMMISSION),
    num(r, LAD_F2_FIELDS.AMT_COMMISSION)
  )
  // Phân số (5/8 của 2%) giữ làm chính + số quy đổi sau "≈"; nếu không phải phân số chỉ hiện %/đ.
  const fraction = formatRateSpecWithEquivalent(spec)
  if (fraction) return fraction
  return pct != null ? formatRatePct(pct) : amt != null ? `${formatCurrencyVND(amt)} đ` : '—'
}

/**
 * Read-only render of `payload_snapshot` — CĐT config rows (grouped) + F2 per-partner overrides.
 * Shared by the review screen (Bước 5) and the detail view.
 */
export function LadConfigDiffView({ payload }: LadConfigDiffViewProps) {
  const record = (payload ?? {}) as PayloadRecord
  const f2Entries = Object.entries(
    (record.f2_overrides_by_exchange as Record<string, LadF2Override> | undefined) ?? {}
  )

  let lastGroup: LadCdtConfigRow['group'] | null = null

  return (
    <div className="flex flex-col gap-5">
      {/* CĐT matrix (read-only) */}
      <div className="border-border-1 divide-border-1 flex flex-col divide-y rounded-lg border">
        {LAD_CDT_CONFIG_ROWS.map((row) => {
          const showGroup = row.group !== lastGroup
          lastGroup = row.group
          return (
            <Fragment key={row.key}>
              {showGroup && (
                <div className="bg-surface-secondary-1 text-content-dark-2 px-4 py-1.5 text-xs font-semibold">
                  {LAD_CONFIG_GROUP_LABEL[row.group]}
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5">
                <Text className="typo-body-sm-medium text-content-dark-2">{row.label}</Text>
                <Text className="typo-body-sm-semibold text-content-dark-1">
                  {formatRowValue(record, row)}{' '}
                  <span className="text-content-dark-3 text-xs font-normal">
                    {vatLabel(record, row.vatField)}
                  </span>
                </Text>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* F2 overrides (read-only) */}
      {f2Entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text className="typo-body-base-semibold text-content-dark-1">
            Cấu hình sàn liên kết (F2)
          </Text>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {f2Entries.map(([exchangeId, ov]) => {
              const r = ov as unknown as PayloadRecord
              const commission = commissionText(r)
              const bonus =
                num(r, LAD_F2_FIELDS.PCT_BONUS) != null
                  ? `${num(r, LAD_F2_FIELDS.PCT_BONUS)} %`
                  : num(r, LAD_F2_FIELDS.AMT_BONUS) != null
                    ? `${formatCurrencyVND(num(r, LAD_F2_FIELDS.AMT_BONUS) as number)} đ`
                    : '—'
              const hold = num(r, LAD_F2_FIELDS.PCT_INVENTORY_HOLD)
              return (
                <div key={exchangeId} className="border-border-1 rounded-lg border p-3">
                  <Text className="typo-body-sm-semibold text-content-dark-1 mb-1 block">
                    Sàn liên kết #{exchangeId}
                  </Text>
                  <div className="text-content-dark-2 flex flex-col gap-0.5 text-sm">
                    <span>Hoa hồng sàn: {commission}</span>
                    <span>Thưởng F2: {bonus}</span>
                    <span>Giữ giỏ hàng: {hold != null ? `${hold} %` : '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default LadConfigDiffView
