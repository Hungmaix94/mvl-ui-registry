import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { ONE_BILLION, PARETO_COLORS } from '../../constants/exec-dashboard-constants'
import { useAllTransactionsByProject } from './useAllTransactionsByProject'

/**
 * "Top dự án · Pareto" — cột doanh thu từng dự án + đường % lũy kế.
 *
 * Câu hỏi khối này trả lời: doanh thu đang dựa vào bao nhiêu dự án? Vài dự án gánh phần lớn doanh
 * thu là rủi ro tập trung nguồn hàng — thứ bảng xếp hạng thường không nói ra.
 */

/** Số dự án vẽ cột. Phần đuôi vẫn nằm trong MẪU SỐ của % lũy kế, chỉ không vẽ cột riêng. */
// 6 cột là vừa nửa hàng ở 1440px; 8 cột thì nhãn chồng nhau (đã thấy tận mắt).
const TOP_N = 6

type ParetoRow = {
  name: string
  /** Nhãn rút gọn cho trục X — tên đầy đủ vẫn ở `name` và hiện trong tooltip. */
  shortName: string
  revenue: number
  cumulativePct: number
}

/** Tên dự án tiếng Việt dài ("Central Square Thái Nguyên") xoay chéo vẫn chồng nhau — phải cắt. */
const LABEL_MAX_CHARS = 10

function shorten(name: string) {
  return name.length <= LABEL_MAX_CHARS ? name : `${name.slice(0, LABEL_MAX_CHARS - 1)}…`
}

export function buildPareto(
  rows: readonly { project?: { name?: string } | null; revenue_amount?: string | null }[],
  topN: number = TOP_N
): ParetoRow[] {
  const sorted = rows
    .map((r) => ({
      name: r.project?.name?.trim() || '(không tên)',
      revenue: Number(r.revenue_amount) || 0,
    }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)

  // Mẫu số là TỔNG TOÀN KỲ, không phải tổng của topN — nếu chia cho tổng topN thì cột cuối luôn
  // ra 100% và biểu đồ nói dối là doanh thu chỉ đến từ mấy dự án đó.
  const total = sorted.reduce((sum, r) => sum + r.revenue, 0)
  if (total === 0) return []

  let running = 0
  return sorted.slice(0, topN).map((r) => {
    running += r.revenue
    return {
      name: r.name,
      shortName: shorten(r.name),
      revenue: r.revenue,
      cumulativePct: (running / total) * 100,
    }
  })
}

function formatBillionTick(value: number) {
  if (value === 0) return '0'
  return `${(value / ONE_BILLION).toFixed(1)}T`
}

function TopProjectsParetoBlock() {
  const { data, isLoading } = useAllTransactionsByProject()
  const rows = data?.rows ?? []
  const isTruncated = data?.isPartial ?? false

  const chartData = useMemo(() => buildPareto(rows), [rows])

  return (
    <div className="border-border-1 bg-background-1 flex h-full flex-col gap-3 rounded-lg border p-4">
      <Flex direction="column" align="start" gap="1">
        <h2 className="typo-body-lg-semibold text-content-dark-1">Top dự án theo doanh thu</h2>
        {/* Không dùng chữ "Pareto": người dùng thật đã hỏi lại nó nghĩa là gì. Giải thích thẳng
            đường lũy kế làm gì, vì đó mới là thứ khối này nói mà bảng xếp hạng không nói được. */}
        <p className="typo-body-sm text-content-dark-3">
          Cột là doanh thu từng dự án · đường đỏ là phần trăm doanh thu cộng dồn, trên tổng{' '}
          {rows.length} dự án của kỳ
        </p>
      </Flex>

      {isTruncated && (
        <p className="typo-body-sm text-action-primary-red-default">
          Chưa gom đủ dự án — tỷ lệ lũy kế bên dưới đang tính thiếu, đừng dùng để kết luận.
        </p>
      )}

      <LoadingWrapper isLoading={isLoading}>
        {chartData.length === 0 ? (
          <div className="text-content-dark-3 typo-body-sm flex h-[240px] items-center justify-center">
            Kỳ này chưa có dự án nào phát sinh doanh thu
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11 }} interval={0} height={36} />
                <YAxis yAxisId="left" tickFormatter={formatBillionTick} tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  // Nhãn trục bị cắt nên tooltip phải trả lại TÊN ĐẦY ĐỦ, không thì cột bị cắt tên
                  // trở thành không tra được là dự án nào.
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ''}
                  // KHÔNG khai `value: number`: recharts dùng `Formatter<ValueType, NameType>` với
                  // ValueType rộng hơn number, thu hẹp tham số là lỗi kiểu (đã dính đúng bẫy này
                  // một lần ở `LabelList`). Nhận kiểu rộng rồi tự thu hẹp bên trong.
                  formatter={(value, name) => {
                    const amount = typeof value === 'number' ? value : Number(value) || 0
                    return name === 'revenue'
                      ? [formatCurrencyVND(amount), 'Doanh thu']
                      : [formatPct(amount, 1), '% lũy kế']
                  }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill={PARETO_COLORS.revenue} name="revenue" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePct"
                  stroke={PARETO_COLORS.cumulative}
                  strokeWidth={2}
                  name="cumulativePct"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </LoadingWrapper>
    </div>
  )
}

export default TopProjectsParetoBlock
