import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'

type DateFilterProps = {
  fromDate?: string
  toDate?: string
}

function LabelDateFilter({ fromDate, toDate }: DateFilterProps) {
  if (!fromDate && !toDate) {
    return null
  }

  const fromText = fromDate ? format(fromDate, DATE_FORMAT) : 'N/A'
  const toText = toDate ? format(toDate, DATE_FORMAT) : null

  return (
    <>
      <div className="pb-4">
        <span className="typo-body-lg-medium text-content-dark-2">Thời gian lọc:&nbsp;</span>
        <span className="typo-body-lg-semibold text-content-dark-1">
          {toText ? `Từ ${fromText} - ${toText}` : `Từ ${fromText}`}
        </span>
      </div>
    </>
  )
}

export default LabelDateFilter
