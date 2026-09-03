import { Table, Flex } from '@radix-ui/themes'
import { Chip } from '@/components/ui'
import { ColoredValueVariant, components } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils'

type TimeBoundCommission = components['schemas']['TimeBoundCommission']

export type TbcCategoryKey =
  // "Chủ đầu tư trả MV" group
  | 'agency_fee'
  | 'investor_bonus'
  | 'shared_bonus'
  // "Chia cho Sale" group — "HH" = sale_commission, "Thưởng" = investor_bonus_to_sale.
  // mv_bonus_to_sale ("Thưởng nóng") đã bị BE bỏ khỏi TimeBoundCommission (regen
  // 2026-07-27) — kênh MV tắt hẳn, không còn cột nào để render.
  | 'sale_commission'
  | 'investor_bonus_to_sale'
  // "Thưởng MV" — mức nền MVL tự bỏ tiền cho mỗi giao dịch. Schema chỉ có
  // `amt_staff_incentive`: KHÔNG có `pct_` và KHÔNG có `is_..._include_vat`,
  // nên ô này luôn render dạng tiền thuần, không chip VAT.
  | 'staff_incentive'
  // Standalone
  | 'revenue'
  | 'kpi_revenue_slk'

// All categories except `revenue` have an `is_X_include_vat` flag in the schema.
// Only agency fee and bonus categories are VAT-aware on the UI.
const VAT_AWARE: ReadonlySet<TbcCategoryKey> = new Set<TbcCategoryKey>([
  'agency_fee',
  'investor_bonus',
  'shared_bonus',
])

type TbcRecord = Pick<
  TimeBoundCommission,
  | 'pct_agency_fee'
  | 'amt_agency_fee'
  | 'is_agency_fee_include_vat'
  | 'pct_investor_bonus'
  | 'amt_investor_bonus'
  | 'is_investor_bonus_include_vat'
  | 'pct_shared_bonus'
  | 'amt_shared_bonus'
  | 'is_shared_bonus_include_vat'
  | 'pct_sale_commission'
  | 'amt_sale_commission'
  | 'is_sale_commission_include_vat'
  | 'pct_investor_bonus_to_sale'
  | 'amt_investor_bonus_to_sale'
  | 'is_investor_bonus_to_sale_include_vat'
  | 'amt_staff_incentive'
  | 'pct_revenue'
  | 'amt_revenue'
  | 'pct_kpi_revenue_slk'
  | 'amt_kpi_revenue_slk'
>

function readField<K extends keyof TimeBoundCommission>(
  record: TbcRecord,
  key: K
): TimeBoundCommission[K] | undefined {
  return (record as unknown as TimeBoundCommission)[key]
}

export function renderTbcValueCell(record: TbcRecord, key: TbcCategoryKey) {
  const pct = readField(record, `pct_${key}` as keyof TimeBoundCommission) as
    | string
    | null
    | undefined
  const amt = readField(record, `amt_${key}` as keyof TimeBoundCommission) as
    | string
    | null
    | undefined

  const includeVat = VAT_AWARE.has(key)
    ? (readField(record, `is_${key}_include_vat` as keyof TimeBoundCommission) as
        | boolean
        | null
        | undefined)
    : undefined

  const hasPct = pct != null && pct !== ''
  const hasAmt = amt != null && amt !== ''
  // Defensive parse: BE Decimals deserialize as numeric strings, but guard against
  // unexpected non-numeric payloads so the cell never renders `NaN VNĐ`.
  const amtNum = hasAmt ? Number(amt) : NaN
  const amtIsValid = Number.isFinite(amtNum)

  if (!hasPct && !amtIsValid) {
    return (
      <Table.Cell className="border-border-1 text-content-dark-3 border-r px-4 py-4 text-center align-middle">
        —
      </Table.Cell>
    )
  }

  return (
    <Table.Cell className="border-border-1 border-r px-4 py-4 text-right align-middle whitespace-nowrap">
      <Flex direction="row" align="center" justify="end" gap="2">
        <span className="typo-body-base-medium text-content-dark-1">
          {amtIsValid ? `${formatCurrencyVND(amtNum)} VNĐ` : ''}
          {hasPct && amtIsValid ? ' / ' : ''}
          {/* Tỷ lệ cấu hình TBC (pct_agency_fee / pct_sale_commission / pct_revenue…) là
              numeric(14,10) — cắt còn 3 chữ số thập phân sẽ làm mất phần thập phân thật. */}
          {hasPct ? formatPercent(pct, false, 10) : ''}
        </span>
        {VAT_AWARE.has(key) && includeVat != null && (
          <Chip
            variant={includeVat ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
            size="small"
            label={includeVat ? 'VAT' : 'Không VAT'}
          />
        )}
      </Flex>
    </Table.Cell>
  )
}
