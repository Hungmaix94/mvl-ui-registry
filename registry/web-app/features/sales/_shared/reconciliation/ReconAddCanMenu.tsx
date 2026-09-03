import { useState } from 'react'

import { Button } from '@/components/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconPlus } from '@/assets/icons/math-finance/IconPlus'
import { IconCaretdown } from '@/assets/icons/arrows'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import { cn } from '@/utils'

import {
  RECON_PERIOD_TYPE_LABELS,
  RECON_PERIOD_TYPE_OPTIONS,
  type ReconPeriodTypeColor,
} from '@/features/sales/_shared/reconciliation/recon-period-type'

/**
 * Dot color per period-type, mirroring the line-card left-border + ReconSummaryBar segment colors.
 * Extends {@link ReconPeriodTypeColor} with `red` for the cancellation row (which is excluded from
 * RECON_PERIOD_TYPE_OPTIONS but rendered red in the mockup, same as ReconSummaryBar).
 */
type AddCanMenuColor = ReconPeriodTypeColor | 'red'

const DOT_COLOR: Record<AddCanMenuColor, string> = {
  blue: 'bg-data-blue-default',
  purple: 'bg-data-purple-default',
  orange: 'bg-data-orange-default',
  green: 'bg-data-green-default',
  grey: 'bg-content-dark-3',
  red: 'bg-data-red-default',
}

type AddCanMenuRow = {
  value: CTVReconciliationPeriod_type
  label: string
  description: string
  color: AddCanMenuColor
}

// 4 editable period types from RECON_PERIOD_TYPE_OPTIONS + the 5th "Kỳ hủy cọc" row. Kỳ hủy cọc is
// live: it is an ordinary deduction period wearing its own label, so the money rides on "Giảm trừ
// khác" (fee_deduction) and the reason on "Ghi chú căn". The Zod refine only enforces those two —
// a note is required and no agency-fee recognition is allowed on this period type.
const ADD_CAN_MENU_ROWS: AddCanMenuRow[] = [
  ...RECON_PERIOD_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
    color: option.color,
  })),
  {
    value: CTVReconciliationPeriod_type.cancellation,
    label: RECON_PERIOD_TYPE_LABELS[CTVReconciliationPeriod_type.cancellation],
    description: 'Đóng case không thành công — vẫn dùng form đầy đủ để khấu trừ + chia sale',
    color: 'red',
  },
]

export interface ReconAddCanMenuProps {
  disabled?: boolean
  onAddRow: (periodType: CTVReconciliationPeriod_type) => void
}

/**
 * RED/primary "+ Thêm căn ▾" dropdown for the section header (Đợt 1). Relocated from the
 * FormTable footer; it only chooses the loại kỳ and delegates the actual append to `onAddRow`.
 */
function ReconAddCanMenu({ disabled, onAddRow }: ReconAddCanMenuProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (periodType: CTVReconciliationPeriod_type) => {
    onAddRow(periodType)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="primary"
          size="small"
          disabled={disabled}
          leftIcon={<IconPlus size={18} />}
          rightIcon={<IconCaretdown size={16} />}
          title="Thêm căn đối chiếu"
        >
          Thêm căn
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="bg-content-light-1 border-border-1 w-80 p-1"
      >
        <div className="typo-body-xs-semibold text-content-dark-3 px-3 pt-2 pb-1 uppercase">
          Chọn loại kỳ
        </div>
        <div className="flex flex-col gap-0.5">
          {ADD_CAN_MENU_ROWS.map((row) => (
            <button
              key={row.value}
              type="button"
              onClick={() => handleSelect(row.value)}
              className="hover:bg-background-2 flex items-start gap-2 rounded-sm px-3 py-2 text-left transition-colors"
            >
              <span
                className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT_COLOR[row.color])}
                aria-hidden
              />
              <span className="flex min-w-0 flex-col">
                <span className="typo-body-sm-semibold text-content-dark-1">{row.label}</span>
                <span className="typo-body-xs-regular text-content-dark-3">{row.description}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ReconAddCanMenu
