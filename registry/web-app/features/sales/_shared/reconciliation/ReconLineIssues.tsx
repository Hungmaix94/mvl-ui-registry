import { Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'

import { cn } from '@/utils'

import type {
  ReconLineIssue,
  ReconLineIssueSeverity,
} from '@/features/sales/_shared/reconciliation/useReconLineDerived'

const ISSUE_STYLE: Record<ReconLineIssueSeverity, { text: string; Icon: LucideIcon }> = {
  err: { text: 'text-semantic-danger-default', Icon: X },
  warn: { text: 'text-yellow-600', Icon: TriangleAlert },
  info: { text: 'text-data-blue-default', Icon: Info },
}

export interface ReconLineIssuesProps {
  issues: ReconLineIssue[]
  /** Ngăn cách footer với nội dung phía trên bằng đường kẻ (mặc định bật). */
  divided?: boolean
}

/**
 * Footer cảnh báo / lưu ý của line card (mockup `rf5-issues`): mỗi dòng tô màu theo severity —
 * info = xanh dương (ⓘ), warn = amber (⚠), err = đỏ (✕) — bằng icon SVG kế thừa `currentColor`
 * (KHÁC emoji "⚠" vốn tự tô màu riêng nên không ăn màu CSS), và tách biệt với nội dung chính bằng
 * một đường kẻ phía trên.
 */
function ReconLineIssues({ issues, divided = true }: ReconLineIssuesProps) {
  if (issues.length === 0) return null
  return (
    <div className={cn('flex flex-col gap-1', divided && 'border-border-1 border-t pt-2.5')}>
      {issues.map((issue) => {
        const { text, Icon } = ISSUE_STYLE[issue.severity]
        return (
          <div
            key={issue.code}
            className={cn('typo-body-sm-regular flex items-start gap-1.5', text)}
          >
            <Icon size={13} className="mt-[1px] shrink-0" />
            <span>{issue.message}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ReconLineIssues
