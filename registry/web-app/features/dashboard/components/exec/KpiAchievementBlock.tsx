import { useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { Select } from '@/components/ui/select'
import { useAllDepartmentMonthlyKpis } from './useAllDepartmentMonthlyKpis'
import ProgressRowList, { type ProgressRow } from './ProgressRowList'

/**
 * "Chỉ tiêu vs thực hiện · Khối kinh doanh".
 *
 * Dùng THANH TIẾN ĐỘ NGANG chứ không phải biểu đồ cột — bản dựng đầu là `BarChart` và đã gặp đúng
 * hai vấn đề: (1) 13 khối tên dài kiểu "Khối Kinh doanh_Đà Nẵng" nhồi lên trục X thì nhãn chồng
 * thành vệt đen, (2) kỳ chưa có doanh số thì cả biểu đồ là tường "0%" nhìn như hỏng. Thanh ngang
 * giải quyết cả hai: tên đọc thoải mái, và 0% vẫn hiện rõ chỉ tiêu đang treo bao nhiêu.
 *
 * Bỏ luôn recharts ở khối này còn được thêm một thứ: recharts KHÔNG vẽ gì trong jsdom, nên trước đó
 * không test được phần hiển thị. Giờ test đọc thẳng được số trên DOM.
 */

/**
 * Chỉ vẽ 10 khối đạt cao nhất. 16 khối xếp dọc làm khối này cao gấp đôi khối bên cạnh và đẩy cả
 * hàng ra — mà phần đuôi thì CEO cũng không đọc. Số khối còn lại vẫn được nói ra ở dòng kết luận,
 * KHÔNG cắt lặng lẽ.
 */
const TOP_N = 10

/** Chỉ những field khối này thực sự đọc — không ép cả `DepartmentMonthlyKpi` vào test fixture. */
type DepartmentKpiRow = {
  department_detail?: { block?: { name?: string | null } | null } | null
  business_target_amount?: string | null
  actual_amount?: string | null
}

/**
 * Gộp phòng ban → KHỐI. Chỉ tiêu và thực tế cộng được; % hoàn thành phải tính LẠI trên tổng.
 *
 * Tách hàm thuần để test thẳng phép gộp — đây là chỗ dễ sai nhất và sai thì không nhìn ra được.
 */
export function aggregateByBlock(rows: readonly DepartmentKpiRow[]): ProgressRow[] {
  const byBlock = new Map<string, { target: number; actual: number }>()

  for (const row of rows) {
    const blockName = row.department_detail?.block?.name?.trim() || 'Chưa gán khối'
    const current = byBlock.get(blockName) ?? { target: 0, actual: 0 }
    current.target += Number(row.business_target_amount) || 0
    current.actual += Number(row.actual_amount) || 0
    byBlock.set(blockName, current)
  }

  return Array.from(byBlock.entries())
    .map(([name, { target, actual }]) => ({
      name,
      target,
      actual,
      // Cộng `completion_pct` của từng phòng rồi chia trung bình là SAI — phòng chỉ tiêu 100 triệu
      // đạt 200% không bù được phòng chỉ tiêu 10 tỷ đạt 20%. Luôn tính lại trên tổng.
      completionPct: target > 0 ? (actual / target) * 100 : null,
    }))
    .sort((a, b) => (b.completionPct ?? -1) - (a.completionPct ?? -1))
}

function KpiAchievementBlock() {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)

  const { data, isLoading } = useAllDepartmentMonthlyKpis({ year, month })
  const rows = data?.rows ?? []
  const isTruncated = data?.isPartial ?? false
  const totalCount = data?.count ?? 0

  const allBlocks = useMemo(() => aggregateByBlock(rows), [rows])
  const blocks = allBlocks.slice(0, TOP_N)
  // Cắt bớt thì PHẢI nói ra ở dòng mô tả — không thì người xem tưởng công ty chỉ có 10 khối.
  const hiddenCount = allBlocks.length - blocks.length

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
          <h2 className="typo-body-lg-semibold text-content-dark-1">
            Chỉ tiêu vs thực hiện · Khối kinh doanh
          </h2>
          <p className="typo-body-sm text-content-dark-3">
            Doanh số thực tế so với chỉ tiêu của kỳ, gộp từ KPI từng phòng ban
            {hiddenCount > 0 && ` · hiện ${blocks.length}/${allBlocks.length} khối đạt cao nhất`}
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
          Kỳ này có {totalCount} phòng ban, mới gom được {rows.length} — số chưa đủ, đừng dùng để
          đối chiếu.
        </p>
      )}

      <LoadingWrapper isLoading={isLoading}>
        {blocks.length === 0 ? (
          <div className="text-content-dark-3 typo-body-sm flex h-[220px] items-center justify-center">
            Chưa có dữ liệu KPI cho kỳ này
          </div>
        ) : (
          <>
            <ProgressRowList rows={blocks} />
          </>
        )}
      </LoadingWrapper>
    </div>
  )
}

export default KpiAchievementBlock
