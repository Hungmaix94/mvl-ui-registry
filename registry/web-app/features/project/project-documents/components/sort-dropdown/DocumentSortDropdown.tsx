import { cn } from '@/utils'
import { Separator } from '@radix-ui/themes'
import SortDropdownSection from './SortDropdownSection'
import SortDropdownRadioRow from './SortDropdownRadioRow'
import {
  SORT_BY_LABEL,
  ORDER_LABEL,
  DISPLAY_PRIORITY_LABEL,
  SORT_BY_OPTIONS,
  ORDER_OPTIONS_BY_SORT_BY,
  DISPLAY_PRIORITY_OPTIONS,
  getSortByAndOrder,
  toSortOption,
  SORT_BY_NAME,
  ORDER_ASC,
  ORDER_DESC,
  type SortByValue,
  type OrderValue,
  type ProjectDocumentDisplayPriority,
} from './sortDropdownConfig'
import type { ProjectDocumentSortOption } from '@/constants/project-document'

type ProjectDocumentsSortDropdownProps = {
  sortOption: ProjectDocumentSortOption
  onSortOptionChange: (value: ProjectDocumentSortOption) => void
  displayPriority: ProjectDocumentDisplayPriority
  onDisplayPriorityChange: (value: ProjectDocumentDisplayPriority) => void
  open: boolean
  /** Khi true, không cho đổi option (đang gọi API theo thay đổi trước đó) */
  disabled?: boolean
}

export type { ProjectDocumentDisplayPriority }

export default function DocumentSortDropdown({
  sortOption,
  onSortOptionChange,
  displayPriority,
  onDisplayPriorityChange,
  open,
  disabled = false,
}: ProjectDocumentsSortDropdownProps) {
  const { sortBy, order } = getSortByAndOrder(sortOption)

  const handleSortBy = (value: SortByValue) => {
    if (disabled) return
    const defaultOrder: OrderValue = value === SORT_BY_NAME ? ORDER_ASC : ORDER_DESC
    onSortOptionChange(toSortOption(value, defaultOrder))
  }

  const handleOrder = (value: OrderValue) => {
    if (disabled) return
    onSortOptionChange(toSortOption(sortBy, value))
  }

  const handleDisplayPriority = (value: ProjectDocumentDisplayPriority) => {
    if (disabled) return
    onDisplayPriorityChange(value)
  }

  const orderOptions = ORDER_OPTIONS_BY_SORT_BY[sortBy]

  return (
    <div
      className={cn(
        'absolute top-full right-0 z-30',
        'flex flex-col gap-3',
        'p-4 pb-2',
        'bg-data-light-grey-default',
        'shadow-[0px_4px_20px_0px_#e6e9ef]',
        'w-[240px]',
        'border-border-1 rounded-sm border',
        'origin-top-right transition-opacity transition-transform duration-200 ease-out',
        open
          ? 'pointer-events-auto scale-100 opacity-100'
          : 'pointer-events-none scale-95 opacity-0',
        disabled && 'cursor-not-allowed'
      )}
      role="dialog"
      aria-label="Sắp xếp theo"
      aria-busy={disabled}
    >
      <SortDropdownSection label={SORT_BY_LABEL}>
        {SORT_BY_OPTIONS.map((opt) => (
          <SortDropdownRadioRow
            key={opt.value}
            label={opt.label}
            active={sortBy === opt.value}
            onClick={() => handleSortBy(opt.value)}
          />
        ))}
      </SortDropdownSection>

      <Separator orientation="horizontal" className="!w-full" />

      <SortDropdownSection label={ORDER_LABEL}>
        {orderOptions.map((opt) => (
          <SortDropdownRadioRow
            key={opt.value}
            label={opt.label}
            active={order === opt.value}
            onClick={() => handleOrder(opt.value)}
          />
        ))}
      </SortDropdownSection>

      <Separator orientation="horizontal" className="!w-full" />

      <SortDropdownSection label={DISPLAY_PRIORITY_LABEL}>
        {DISPLAY_PRIORITY_OPTIONS.map((opt) => (
          <SortDropdownRadioRow
            key={opt.value}
            label={opt.label}
            active={displayPriority === opt.value}
            onClick={() => handleDisplayPriority(opt.value)}
          />
        ))}
      </SortDropdownSection>
    </div>
  )
}
