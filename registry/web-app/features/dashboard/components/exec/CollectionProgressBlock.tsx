import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { useAccountantDashboardPartnerTable } from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import { cn } from '@/utils'
import { formatCurrencyVND, formatPct } from '@/utils/common'

/**
 * "Tiền đang kẹt ở dự án nào" — tiến độ thu theo dự án.
 *
 * Thay cho khối "Đề xuất quá hạn": đề xuất quá hạn là việc vận hành của HCNS, CEO không xử lý nó,
 * còn tiền chưa thu về thì có. Nguồn `accountant-dashboard/partner-table/` đã trả sẵn
 * `receivable_amount` + `collected_amount` mỗi dự án.
 *
 * Sắp theo SỐ TIỀN CÒN LẠI giảm dần, không theo % — dự án còn 20 tỷ chưa thu ở mức 60% đáng lo hơn
 * hẳn dự án còn 50 triệu ở mức 10%.
 */

const TOP_N = 8

type ProjectRow = {
  project?: { name?: string } | null
  receivable_amount?: string | null
  collected_amount?: string | null
}

type ProgressRow = {
  name: string
  receivable: number
  collected: number
  outstanding: number
  collectedPct: number | null
}

export function buildCollectionProgress(
  rows: readonly ProjectRow[],
  topN: number = TOP_N
): { data: ProgressRow[]; totalOutstanding: number; projectCount: number } {
  const mapped = rows
    .map((r) => {
      const receivable = Number(r.receivable_amount) || 0
      const collected = Number(r.collected_amount) || 0
      return {
        name: r.project?.name?.trim() || '(không tên)',
        receivable,
        collected,
        outstanding: receivable - collected,
        collectedPct: receivable > 0 ? (collected / receivable) * 100 : null,
      }
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)

  return {
    data: mapped.slice(0, topN),
    // Tổng trên TOÀN BỘ dự án còn nợ, không phải chỉ topN đang vẽ.
    totalOutstanding: mapped.reduce((sum, r) => sum + r.outstanding, 0),
    projectCount: mapped.length,
  }
}

function CollectionProgressBlock() {
  const { data, isLoading } = useAccountantDashboardPartnerTable()
  const rows = (data?.results ?? []) as ProjectRow[]

  const {
    data: progress,
    totalOutstanding,
    projectCount,
  } = useMemo(() => buildCollectionProgress(rows), [rows])

  return (
    <div className="border-border-1 bg-background-1 flex h-full flex-col gap-3 rounded-lg border p-4">
      <Flex direction="column" align="start" gap="1">
        <h2 className="typo-body-lg-semibold text-content-dark-1">Tiến độ thu theo dự án</h2>
        <p className="typo-body-sm text-content-dark-3">
          Đã thu trên tổng phải thu, xếp theo số tiền còn lại
        </p>
      </Flex>

      <LoadingWrapper isLoading={isLoading}>
        {progress.length === 0 ? (
          <div className="text-content-dark-3 typo-body-sm flex h-[220px] items-center justify-center">
            Không còn dự án nào có công nợ chưa thu
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {progress.map((row) => {
                const pct = row.collectedPct ?? 0
                return (
                  <div key={row.name} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="typo-body-sm-semibold text-content-dark-1 truncate">
                        {row.name}
                      </span>
                      <span className="typo-body-sm text-action-primary-red-default shrink-0">
                        còn {formatCurrencyVND(row.outstanding)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-background-2 h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className={cn('bg-data-green-default h-full rounded-full')}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                      <span className="typo-body-sm text-content-dark-3 w-[52px] shrink-0 text-right">
                        {row.collectedPct === null ? '—' : formatPct(row.collectedPct, 0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="typo-body-sm text-content-dark-3 border-border-1 border-t pt-3">
              Còn {formatCurrencyVND(totalOutstanding)} chưa thu ở {projectCount} dự án
              {projectCount > progress.length &&
                ` (đang hiện ${progress.length} dự án nợ nhiều nhất)`}
              .
            </p>
          </>
        )}
      </LoadingWrapper>
    </div>
  )
}

export default CollectionProgressBlock
