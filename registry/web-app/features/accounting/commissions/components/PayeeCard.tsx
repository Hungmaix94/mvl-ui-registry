import { type ReactNode } from 'react'
import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import ResignedChip from '@/components/commons/ResignedChip'

export type PayeeCardRow = {
  label: string
  value: ReactNode
  /** Optional second line under the value (e.g. bank account holder name). */
  subValue?: ReactNode
}

type PayeeCardProps = {
  /** Section title. Defaults to "Người nhận". */
  title?: string
  name: string
  /**
   * Rendered inside `EmployeeProfileLink`. When `employeeId` is set the wrapper
   * becomes an `<a>`, so pass plain/non-anchor content in that case to avoid
   * invalid nested `<a>` elements. When `employeeId` is null/undefined the
   * wrapper is a `<span>`, and you may pass any `ReactNode` (e.g. a `<Link>`).
   */
  code: ReactNode
  /** Employee id for the profile link (permission-gated). Missing → plain text. */
  employeeId?: number | null
  /** Server `is_working` flag; false → resigned chip + optional banner. */
  isWorking?: boolean | null
  /** Server-translated status label for the resigned chip. */
  statusDisplay?: string | null
  /** Explanatory banner shown under the header when the payee has resigned. */
  resignedBanner?: ReactNode
  /** Label/value rows, rendered with alternating (white / neutral-20) striping. */
  rows: PayeeCardRow[]
}

/**
 * The "Người nhận" payee card shared by the sales and management monthly-summary
 * detail screens: a highlighted header (bold name + resigned chip + linked employee
 * code) over a striped label/value list. Screen-specific rows (e.g. "Cấp", "Loại
 * nhân viên") are passed via `rows`; the resigned banner via `resignedBanner`.
 */
const PayeeCard = ({
  title = 'Người nhận',
  name,
  code,
  employeeId,
  isWorking,
  statusDisplay,
  resignedBanner,
  rows,
}: PayeeCardProps) => {
  const isResigned = isWorking === false
  return (
    <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="border-border-1 border-b px-6 py-4">
        <div className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
          {title}
        </div>
      </div>
      <div className="border-border-1 flex flex-col gap-1 border-b bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-neutral-900">{name}</span>
          <ResignedChip isWorking={isWorking} statusDisplay={statusDisplay} />
        </div>
        <EmployeeProfileLink employeeId={employeeId} className="w-fit font-mono text-[13px] font-medium">
          {code}
        </EmployeeProfileLink>
        {isResigned && resignedBanner ? (
          <span className="text-data-red-default mt-1 text-xs">{resignedBanner}</span>
        ) : null}
      </div>
      <div className="divide-border-1 flex flex-col divide-y text-[13px]">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex flex-col gap-0.5 px-6 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-20'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">{row.label}</span>
              <span className="font-medium text-neutral-800">{row.value}</span>
            </div>
            {row.subValue ? (
              <div className="text-right text-[11px] text-neutral-500">{row.subValue}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PayeeCard
