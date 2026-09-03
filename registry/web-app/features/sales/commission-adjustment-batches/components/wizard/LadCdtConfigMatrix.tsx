import { Fragment, useRef } from 'react'
import { Text } from '@/components/ui'
import MoneyPercentInput from '@/components/commons/MoneyPercentInput'
import { formatCurrencyVND, formatNumber } from '@/utils'
import {
  LAD_CDT_CONFIG_ROWS,
  LAD_CONFIG_GROUP_LABEL,
  type LadCdtConfigRow,
} from '../../constants/lad-constants'
import type { LadPayloadSnapshot } from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'
import { LadRateInput } from './LadRateInput'
import { LadVatToggle } from './LadVatToggle'
import { type LadUnit } from './LadUnitToggle'

interface LadCdtConfigMatrixProps {
  value: LadPayloadSnapshot
  onChange: (next: LadPayloadSnapshot) => void
  /** Current config (TBC) for the "Hiện hành" column. */
  beforeConfig?: Record<string, unknown> | null
  errors?: Record<string, string>
  disabled?: boolean
}

type PayloadRecord = Record<string, unknown>

/** Per-row helper copy (mockup). UI text only — keyed by the stable row key. */
const ROW_DESC: Record<string, string> = {
  agency_fee: '% trên giá HĐ hoặc số tiền cố định / GD',
  investor_bonus: 'Phụ phí CĐT hỗ trợ thêm, ngoài phí đại lý theo %',
  shared_bonus: 'Cố định / GD (ký + bàn giao)',
  sale_commission: '% áp cho GD nội bộ',
  investor_bonus_to_sale: 'Theo quy định của CĐT hoặc của MV tự thưởng',
  revenue: '% giá HĐ tính vào doanh thu MV',
}

const ROW_BADGE: Record<string, string> = {
  revenue: '≤ Phí đại lý',
}

const GROUP_HEADER: Record<LadCdtConfigRow['group'], string> = {
  cdt: 'bg-data-blue-disabled text-data-blue-default',
  sale: 'bg-data-purple-disabled text-data-purple-default',
  revenue: 'bg-data-orange-disabled text-data-orange-default',
}

function readNum(rec: PayloadRecord | null | undefined, field?: string): number | null {
  if (!rec || !field) return null
  return toNum(rec[field])
}

interface Pair {
  pct: number | null
  amt: number | null
}

function displayCurrent({ pct, amt }: Pair): string {
  if (pct != null)
    return `${formatNumber(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
  if (amt != null) return `${formatCurrencyVND(amt)} đ`
  return '—'
}

/**
 * Card 1 — CĐT config matrix. Columns: Khoản mục (label + desc) | Giá trị mới (input + %/đ) | VAT |
 * Hiện hành (current TBC value). Each `both`-unit row writes pct_* OR amt_* (mutually exclusive).
 * Sale items render no VAT toggle (always no-VAT per §2.2).
 */
export function LadCdtConfigMatrix({
  value,
  onChange,
  beforeConfig,
  errors,
  disabled,
}: LadCdtConfigMatrixProps) {
  const before = (beforeConfig ?? null) as PayloadRecord | null
  // Per-unit memory (keyed by field name) so toggling %↔đ restores the value last entered for the
  // unit you switch back to (4% → đ → % shows 4 again). Payload stays XOR (one field null).
  const unitMemoryRef = useRef<Record<string, number | null>>({})

  const setField = (field: string, fieldValue: number | boolean | null) => {
    if (typeof fieldValue === 'number' || fieldValue === null)
      unitMemoryRef.current[field] = fieldValue
    onChange({ ...value, [field]: fieldValue } as LadPayloadSnapshot)
  }

  const setUnit = (row: LadCdtConfigRow, nextUnit: LadUnit) => {
    if (!row.pctField || !row.amtField) return
    const rec = value as PayloadRecord
    const target = nextUnit === 'pct' ? row.pctField : row.amtField
    const leaving = nextUnit === 'pct' ? row.amtField : row.pctField
    // Stash the value we're leaving; restore the target's remembered value (0 the first time).
    unitMemoryRef.current[leaving] = readNum(rec, leaving)
    const restored = unitMemoryRef.current[target] ?? 0
    onChange({ ...rec, [target]: restored, [leaving]: null } as LadPayloadSnapshot)
  }

  const rowUnit = (row: LadCdtConfigRow): LadUnit => {
    if (row.unit === 'amt') return 'amt'
    if (row.unit === 'pct') return 'pct'
    return readNum(value as PayloadRecord, row.amtField) != null ? 'amt' : 'pct'
  }

  let lastGroup: LadCdtConfigRow['group'] | null = null
  const COLS = 'grid grid-cols-[1.5fr_1.4fr_1fr_1.3fr] items-center gap-3'

  return (
    <div className="divide-border-1 flex flex-col divide-y overflow-hidden">
      {/* Header */}
      <div
        className={`bg-surface-secondary-2 text-content-dark-3 ${COLS} px-5 py-2 text-xs font-semibold uppercase`}
      >
        <span>Khoản mục</span>
        <span>Giá trị mới</span>
        <span>VAT</span>
        <span className="text-right">Phí base</span>
      </div>

      {LAD_CDT_CONFIG_ROWS.map((row) => {
        const unit = rowUnit(row)
        const showGroup = row.group !== lastGroup
        lastGroup = row.group
        const amtVal = readNum(value as PayloadRecord, row.amtField)
        const pctVal = readNum(value as PayloadRecord, row.pctField)
        const vatVal = row.vatField
          ? ((value as PayloadRecord)[row.vatField] as boolean | null)
          : null
        const err = errors?.[row.amtField ?? ''] || errors?.[row.pctField ?? '']
        const beforePair: Pair = {
          pct: readNum(before, row.pctField),
          amt: readNum(before, row.amtField),
        }

        return (
          <Fragment key={row.key}>
            {showGroup && (
              <div className={`${GROUP_HEADER[row.group]} px-5 py-1.5 text-xs font-semibold`}>
                {LAD_CONFIG_GROUP_LABEL[row.group]}
              </div>
            )}
            <div className={`${COLS} px-5 py-3`}>
              {/* Khoản mục */}
              <div className="flex flex-col gap-0.5">
                <Text className="typo-body-sm-semibold text-content-dark-1 flex items-center gap-2">
                  {row.label}
                  {ROW_BADGE[row.key] && (
                    <span className="bg-data-orange-disabled text-data-orange-default rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      {ROW_BADGE[row.key]}
                    </span>
                  )}
                </Text>
                {ROW_DESC[row.key] && (
                  <Text className="text-content-dark-3 text-xs">{ROW_DESC[row.key]}</Text>
                )}
              </div>

              {/* Giá trị mới */}
              <div className="flex flex-col gap-1">
                <div className="w-[210px]">
                  {row.unit === 'both' ? (
                    <MoneyPercentInput
                      mode={unit === 'amt' ? 'amount' : 'percent'}
                      value={unit === 'amt' ? amtVal : pctVal}
                      isError={!!err}
                      disabled={disabled}
                      onValueChange={(n) => {
                        const field = unit === 'amt' ? row.amtField : row.pctField
                        if (field) setField(field, n)
                      }}
                      onModeChange={(m) => setUnit(row, m === 'amount' ? 'amt' : 'pct')}
                    />
                  ) : (
                    <LadRateInput
                      value={unit === 'amt' ? amtVal : pctVal}
                      suffix={unit === 'amt' ? 'đ' : '%'}
                      // Ba tỷ lệ lõi là numeric(14,10): trần 3 mặc định sẽ CẮT im lặng.
                      maxFractionDigits={10}
                      isError={!!err}
                      disabled={disabled}
                      className="!w-full"
                      onChange={(n) => {
                        const field = unit === 'amt' ? row.amtField : row.pctField
                        if (field) setField(field, n)
                      }}
                    />
                  )}
                </div>
                {err && <span className="text-action-primary-red-default text-xs">{err}</span>}
              </div>

              {/* VAT — tiêu đề cột đã là "VAT" nên ẩn nhãn lặp; switch + "—" canh trái khớp tiêu đề */}
              <div className="flex items-center">
                {row.vatField ? (
                  <LadVatToggle
                    value={vatVal}
                    onChange={(b) => row.vatField && setField(row.vatField, b)}
                    disabled={disabled}
                    showLabel={false}
                  />
                ) : (
                  <span className="text-content-dark-3 text-xs">—</span>
                )}
              </div>

              {/* Hiện hành */}
              <div className="flex items-center justify-end">
                <Text className="typo-body-sm-regular text-content-dark-2">
                  {displayCurrent(beforePair)}
                </Text>
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

export default LadCdtConfigMatrix
