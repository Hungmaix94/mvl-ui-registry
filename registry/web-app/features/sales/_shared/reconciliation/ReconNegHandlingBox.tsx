import { Flex } from '@radix-ui/themes'

import { IconWarning } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'

import type { ReconNegHandling } from '@/features/sales/_shared/reconciliation/recon-fe-only-types'

const OPTIONS: { value: ReconNegHandling; title: string; sub: string }[] = [
  {
    value: 'refund',
    title: 'HOÀN TIỀN ngay',
    sub: 'MVL sinh giao dịch hoàn về CĐT trong kỳ này',
  },
  {
    value: 'offset_next',
    title: 'BÙ TRỪ KỲ SAU',
    sub: 'Số âm trừ vào đợt kế tiếp (không phát sinh dòng tiền kỳ này)',
  },
]

export interface ReconNegHandlingBoxProps {
  /** NET kỳ này (âm). */
  net: number
  value: ReconNegHandling | null
  disabled?: boolean
  onChange: (next: ReconNegHandling) => void
}

/**
 * Net-âm handling chooser (mockup `NegHandling5`): when the period NET is negative the user must pick
 * HOÀN TIỀN ngay (`refund`) or BÙ TRỪ KỲ SAU (`offset_next`). FE-only — `neg_handling` is not in the
 * schema yet (BE pending), so this only sets local state and is flagged as such.
 */
function ReconNegHandlingBox({ net, value, disabled, onChange }: ReconNegHandlingBoxProps) {
  return (
    <div className="border-semantic-danger-default bg-semantic-danger-subtle space-y-2 rounded-md border p-3">
      <Flex align="center" gap="2" className="typo-body-sm-semibold text-semantic-danger-default">
        <IconWarning size={14} color="currentColor" />
        <span>
          Tiền nhận âm {formatCurrencyVND(net, { maximumFractionDigits: 0 })} đ — chọn cách xử lý:
        </span>
      </Flex>

      <Flex gap="2" wrap="wrap">
        {OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                'bg-background-1 min-w-[220px] flex-1 cursor-pointer rounded-md border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                active
                  ? 'border-action-primary-red-default ring-action-primary-red-default ring-1'
                  : 'border-border-1 hover:bg-background-2'
              )}
            >
              <div className="typo-body-sm-semibold text-content-dark-1">{opt.title}</div>
              <div className="typo-body-xs-regular text-content-dark-3">{opt.sub}</div>
            </button>
          )
        })}
      </Flex>

      <span className="typo-body-xs-regular text-content-dark-3 block">
        ⚠ BE chưa lưu — lựa chọn này chỉ hiển thị trên giao diện.
      </span>
    </div>
  )
}

export default ReconNegHandlingBox
