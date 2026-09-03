import { useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { Select } from '@/components/ui/select'
import { useAllDepartmentMonthlyKpis } from './useAllDepartmentMonthlyKpis'
import ProgressRowList, { type ProgressRow } from './ProgressRowList'

/**
 * "KPI theo phòng ban" — khối riêng của GIÁM ĐỐC kinh doanh.
 *
 * Vì sao GĐKD không dùng chung khối với trưởng phòng: trưởng phòng quản đúng một phòng nên câu hỏi
 * của họ là "ai trong phòng đang đuối"; giám đốc quản nhiều phòng nên câu hỏi là "phòng nào đang
 * đuối". Cùng một nguồn dữ liệu, khác đơn vị dòng — gộp làm một khối là sai tầm cho một trong hai.
 *
 * Khác `KpiAchievementBlock` (gộp phòng → KHỐI, dành cho CEO nhìn toàn công ty): ở đây giữ nguyên
 * cấp PHÒNG BAN, không gộp.
 */

/** Nhiều khối có trên 15 phòng; vẽ hết thì khối cao vống. Số còn lại nói ở dòng mô tả. */
const TOP_N = 12

type RawKpi = {
  department_detail?: { name?: string | null } | null
  business_target_amount?: string | null
  actual_amount?: string | null
}

export function buildDepartmentRows(rows: readonly RawKpi[]): ProgressRow[] {
  return rows
    .map((r) => {
      const target = Number(r.business_target_amount) || 0
      const actual = Number(r.actual_amount) || 0
      return {
        name: r.department_detail?.name?.trim() || '(không tên)',
        target,
        actual,
        completionPct: target > 0 ? (actual / target) * 100 : null,
      }
    })
    .sort((a, b) => (b.completionPct ?? -1) - (a.completionPct ?? -1))
}

function DepartmentKpiBlock() {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useAllDepartmentMonthlyKpis({ year, month })
  const allRows = useMemo(() => buildDepartmentRows((data?.rows ?? []) as RawKpi[]), [data])
  const rows = allRows.slice(0, TOP_N)
  const hiddenCount = allRows.length - rows.length
  const isTruncated = data?.isPartial ?? false

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear()
    return Array.from({ length: Math.max(1, currentYear - 2025 + 1) }, (_, i) => ({
      value: String(currentYear - i),
      label: `Năm ${currentYear - i}`,
    }))
  }, [now])

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` })),
    []
  )

  return (
    <div className="border-border-1 bg-background-1 flex h-full flex-col gap-3 rounded-lg border p-4">
      <Flex align="start" justify="between" gap="2">
        <Flex direction="column" align="start" gap="1">
          <h2 className="typo-body-lg-semibold text-content-dark-1">KPI theo phòng ban</h2>
          <p className="typo-body-sm text-content-dark-3">
            Doanh số thực tế so với chỉ tiêu của từng phòng trong kỳ
            {hiddenCount > 0 && ` · hiện ${rows.length}/${allRows.length} phòng đạt cao nhất`}
          </p>
        </Flex>
        <Flex gap="2">
          <Select
            options={monthOptions}
            value={String(month)}
            onChange={(value) => setMonth(Number(value))}
            className="w-[124px]"
          />
          <Select
            options={yearOptions}
            value={String(year)}
            onChange={(value) => setYear(Number(value))}
            className="w-[124px]"
          />
        </Flex>
      </Flex>

      {isTruncated && (
        <p className="typo-body-sm text-action-primary-red-default">
          Chưa gom đủ phòng ban — số chưa đủ, đừng dùng để đối chiếu.
        </p>
      )}

      <LoadingWrapper isLoading={isLoading}>
        {rows.length === 0 ? (
          <div className="text-content-dark-3 typo-body-sm flex h-[220px] items-center justify-center">
            Chưa có dữ liệu KPI cho kỳ này
          </div>
        ) : (
          <ProgressRowList rows={rows} />
        )}
      </LoadingWrapper>
    </div>
  )
}

export default DepartmentKpiBlock
