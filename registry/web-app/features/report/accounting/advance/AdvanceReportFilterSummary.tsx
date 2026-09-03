import { formatDate } from '@/utils/date-utils'

/** Shown for a filter the user left open. A dash, matching how empty table cells read. */
export const EMPTY_LABEL = '-'

type AdvanceReportFilterSummaryProps = {
  /** `yyyy-MM-dd` as stored in the URL. Empty means the user applied no lower bound. */
  dateFrom?: string
  dateTo?: string
  /** Ids come from the URL; names are resolved asynchronously and may not arrive. */
  branchId?: number
  blockId?: number
  departmentId?: number
  branchName?: string
  blockName?: string
  departmentName?: string
}

type SummaryItem = {
  label: string
  value: string
  /** Dimmed when the user left the filter open — it is a default, not a choice they made. */
  isFallback: boolean
}

/** `formatDate` already returns `-` for anything unusable, so both paths agree. */
function toDateLabel(value?: string): SummaryItem['value'] {
  return value ? formatDate(value) : EMPTY_LABEL
}

/**
 * An org filter that is applied but whose name has not resolved must never read as "no
 * filter" — that would caption a filtered table as covering everything. Falls back to the
 * raw id so the band stays truthful about what the rows below were narrowed by.
 */
function toOrgItem(label: string, id?: number, name?: string): SummaryItem {
  if (name) return { label, value: name, isFallback: false }
  if (id) return { label, value: `#${id}`, isFallback: false }
  return { label, value: EMPTY_LABEL, isFallback: true }
}

export function buildAdvanceReportFilterSummary({
  dateFrom,
  dateTo,
  branchId,
  blockId,
  departmentId,
  branchName,
  blockName,
  departmentName,
}: AdvanceReportFilterSummaryProps): SummaryItem[] {
  const fromLabel = toDateLabel(dateFrom)
  const toLabel = toDateLabel(dateTo)

  return [
    { label: 'Từ ngày', value: fromLabel, isFallback: fromLabel === EMPTY_LABEL },
    { label: 'Đến ngày', value: toLabel, isFallback: toLabel === EMPTY_LABEL },
    toOrgItem('Chi nhánh', branchId, branchName),
    toOrgItem('Khối', blockId, blockName),
    toOrgItem('Phòng ban', departmentId, departmentName),
  ]
}

/**
 * Echoes the filter the report is currently rendered under, so a printed or screenshotted table
 * still says which period and which org unit it covers — the table body alone never carries that
 * (CR 21.3). Filters the user left open read `-`, so an unset criterion is never mistaken for a
 * value that failed to load.
 */
const AdvanceReportFilterSummary = (props: AdvanceReportFilterSummaryProps) => {
  const items = buildAdvanceReportFilterSummary(props)

  return (
    <dl
      aria-label="Bộ lọc đang áp dụng"
      className="border-border-1 bg-background-2 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-solid px-4 py-3"
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <dt className="typo-body-sm-regular text-content-dark-3">{item.label}:</dt>
          <dd
            className={
              item.isFallback
                ? 'typo-body-sm-regular text-content-dark-3'
                : 'typo-body-sm-semibold text-content-dark-1'
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default AdvanceReportFilterSummary
