import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingWrapper } from '@/components'
import { RankedBarsSkeleton } from './dashboard-skeletons'
import { useAbility } from '@/lib/ability'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { useTransactionsByProjectFilter } from '@/features/dashboard/hooks/useTransactionsByProjectFilter.tsx'
import {
  getAdminDashboardService,
  useAdminDashboardAllTransactionsByProject,
} from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import toastService from '@/services/toast-service'
import {
  REVENUE_TREND_COLORS,
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from './sales-admin-dashboard-constants'
import {
  buildNiceAxis,
  buildNiceCountAxis,
  DEAL_X_AXIS,
  formatCompactVnd,
  HorizontalAxisRuler,
  INK,
  RANKED_BAR_LAYOUT,
  REVENUE_X_AXIS,
  RevenueBarLabel,
  RevenueDealSeriesLegend,
  SummaryStat,
} from './dashboard-chart-parts'
import {
  ProjectNameLabel,
  ProjectTooltip,
  type ProjectRow,
} from './transactions-by-project-chart-parts'

function TransactionsByProjectChart() {
  const ability = useAbility()
  const canExport = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.EXPORT_TRANSACTIONS_BY_PROJECT,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  const [isExporting, setIsExporting] = useState(false)

  /**
   * Khung cuộn + lớp phủ chứa tooltip. Lớp phủ phải là STATE chứ không phải ref: Recharts chỉ
   * nhận `portal` qua prop, mà ref không kích hoạt render lại nên lượt đầu `portal` sẽ mãi là
   * `null` và tooltip không bao giờ hiện. Xem `TooltipAnchor` để biết vì sao phải portal ra
   * ngoài khung cuộn.
   */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const tooltipHostRef = useRef<HTMLDivElement>(null)

  const { openFilterModal, apiParams, subTitle, filterCount } = useTransactionsByProjectFilter()

  const { data, isLoading } = useAdminDashboardAllTransactionsByProject(apiParams)

  /** Lọc dự án và phân trang đều do BE lo — ở đây chỉ đổi hình dạng dòng và xếp hạng. */
  const chartData = useMemo<ProjectRow[]>(() => {
    return (data?.results ?? [])
      .map((row, index) => ({
        key: `${row.project?.id ?? 'na'}-${index}`,
        projectName: row.project?.name || 'Chưa gắn dự án',
        investorName: row.project?.investor?.name ?? '',
        revenue: Number(row.revenue_amount) || 0,
        dealCount: row.deal_count ?? 0,
        feePrice: Number(row.fee_calculation_price) || 0,
        goodsAmount: Number(row.goods_amount) || 0,
        reconciliationAmount: Number(row.reconciliation_amount) || 0,
        remainingAmount: Number(row.remaining_amount) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data?.results])

  const scale = useMemo(() => {
    const sum = (pick: (row: ProjectRow) => number) =>
      chartData.reduce((total, row) => total + pick(row), 0)
    return {
      revenue: sum((row) => row.revenue),
      deals: sum((row) => row.dealCount),
      reconciliation: sum((row) => row.reconciliationAmount),
      remaining: sum((row) => row.remainingAmount),
      axis: buildNiceAxis(Math.max(...chartData.map((row) => row.revenue), 0)),
      /**
       * Trục RIÊNG cho số giao dịch — cùng lẽ với `PerformanceByOrgChart`. Ở khối này khoảng
       * cách còn xa hơn: 244 giao dịch cạnh 91 tỷ đồng. Ép chung một trục là đường bị dí sát
       * mốc 0 thành vạch thẳng, nhìn ra "mọi dự án như nhau".
       */
      dealAxis: buildNiceCountAxis(Math.max(...chartData.map((row) => row.dealCount), 0)),
    }
  }, [chartData])

  const chartHeight = chartData.length * RANKED_BAR_LAYOUT.ROW_HEIGHT + RANKED_BAR_LAYOUT.TOP_MARGIN
  const isScrolling = chartData.length > RANKED_BAR_LAYOUT.VISIBLE_ROWS

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      // Cùng `apiParams` với lượt tải dữ liệu ⇒ file Excel luôn khớp đúng những gì đang hiện
      // trên màn hình, kể cả khi đang lọc nhiều dự án.
      await getAdminDashboardService().exportTransactionsByProject(apiParams)
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [apiParams])

  return (
    <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <DashboardChartTitle
        title="Giao dịch theo dự án"
        subTitle={subTitle}
        handleFilter={openFilterModal}
        filterCount={filterCount}
        handleDownloadChart={canExport ? handleExport : undefined}
        isDownloading={isExporting}
      />

      <LoadingWrapper
        isLoading={isLoading}
        containerHeight={280}
        data={chartData}
        hasActiveFilters={filterCount > 0}
        loadingSkeleton={<RankedBarsSkeleton rows={5} stats={4} />}
      >
        <div className="flex flex-col gap-5">
          {/* Dải tổng: quy mô nền để đọc các thanh bên dưới. Không còn chữ "trang này" —
              BE trả trọn bộ dòng của bộ lọc (`page_size=0`) nên đây LÀ tổng của bộ lọc. */}
          <div className="bg-background-2 border-border-1 grid grid-cols-2 gap-4 rounded-lg border px-4 py-3 lg:grid-cols-4">
            <SummaryStat
              label="Doanh thu"
              value={formatCompactVnd(scale.revenue)}
              hint={`${formatCurrencyVND(scale.revenue)} VND`}
            />
            <SummaryStat
              label="Giao dịch"
              value={formatNumber(scale.deals)}
              hint={`${chartData.length} dự án`}
            />
            <SummaryStat
              label="Đối chiếu"
              value={formatCompactVnd(scale.reconciliation)}
              hint={`${formatCurrencyVND(scale.reconciliation)} VND`}
            />
            <SummaryStat
              label="Còn lại"
              value={formatCompactVnd(scale.remaining)}
              hint={`${formatCurrencyVND(scale.remaining)} VND`}
            />
          </div>

          {/*
            `aria-hidden` cho TRỌN khối hình: Recharts gắn `role="application"` lên wrapper và
            phơi mọi `<text>` bên trong, nên trình đọc màn hình sẽ đọc hết số của biểu đồ RỒI
            đọc lại đúng ngần ấy số trong bảng ẩn bên dưới — nghe thành dữ liệu nhân đôi.
            Nguồn duy nhất cho trợ năng là `<table className="sr-only">`.
          */}
          <figure className="m-0 flex flex-col gap-1" aria-hidden="true">
            {/* Thước trục nằm NGOÀI vùng cuộn nên không trôi mất khi xem tới dự án thứ 20.
                `scrollbar-gutter: stable` ở cả hai lớp để thanh cuộn không ăn lệch vài pixel
                chiều rộng của lớp dưới rồi kéo thước lệch dần sang phải.

                `overflow-y-hidden` đi KÈM, không phải thừa: `scrollbar-gutter` chỉ áp cho
                SCROLL CONTAINER, một `<div>` không khai `overflow` thì trình duyệt bỏ qua nó
                im lặng và lớp thước lại rộng hơn vùng vẽ đúng bằng bề rộng thanh cuộn. Đo
                được ở khối "Hiệu suất theo tổ chức": vạch lệch dần 0 · 2 · 4 · 6 · 8px. */}
            <div
              data-testid="txn-chart-axis"
              className={isScrolling ? 'overflow-y-hidden [scrollbar-gutter:stable]' : undefined}
            >
              <RevenueDealSeriesLegend />
              {/* Trục giao dịch ở TRÊN, trục doanh thu sát thanh — thanh là thứ đo bằng trục
                  doanh thu nên hai cái đó phải kề nhau. */}
              <HorizontalAxisRuler
                ticks={scale.dealAxis.ticks}
                max={scale.dealAxis.max}
                leftGutter={RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER}
                rightGutter={RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER}
                formatTick={formatNumber}
                color={REVENUE_TREND_COLORS.dealCount}
                testId="txn-chart-deal-ruler"
              />
              <HorizontalAxisRuler
                ticks={scale.axis.ticks}
                max={scale.axis.max}
                leftGutter={RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER}
                rightGutter={RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER}
                testId="txn-chart-revenue-ruler"
              />
            </div>

            {/*
              Khung cuộn chỉ dựng khi THẬT SỰ có dòng tràn ra. Để `overflow-y-auto` thường trực
              gây hai lỗi, và cả hai chỉ lộ ra khi ít dòng:

              1. Nó CẮT CỤT TOOLTIP. Tooltip cao ~170px (6 chỉ số); lọc còn 1 dự án thì khung
                 chỉ cao 72px nên tooltip bị xén còn hai dòng — người dùng mất hẳn phần số. Đây
                 là mất thông tin, không phải lỗi thẩm mỹ.
              2. `scrollbar-gutter: stable` giữ chỗ 8px cạnh một khung 72px, đọc thành "ô xem
                 tí hon có thanh cuộn" dù `scrollHeight === clientHeight`, tức không cuộn được
                 gì cả.

              Có cuộn thì cả hai lớp cùng bật máng để thước trục không lệch khỏi các thanh.
            */}
            {/* `relative` = mốc định vị cho LỚP PHỦ tooltip ngay bên dưới. */}
            <div data-testid="txn-chart-plot" className="relative">
              <div
                ref={scrollerRef}
                data-testid="txn-chart-scroller"
                className={isScrolling ? 'overflow-y-auto [scrollbar-gutter:stable]' : undefined}
                style={
                  isScrolling
                    ? {
                        maxHeight:
                          RANKED_BAR_LAYOUT.VISIBLE_ROWS * RANKED_BAR_LAYOUT.ROW_HEIGHT +
                          RANKED_BAR_LAYOUT.TOP_MARGIN,
                      }
                    : undefined
                }
              >
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <ComposedChart
                    layout="vertical"
                    data={chartData}
                    margin={{
                      top: RANKED_BAR_LAYOUT.TOP_MARGIN,
                      right: RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER,
                      left: RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER,
                      bottom: 0,
                    }}
                    barCategoryGap="0%"
                  >
                    {/* Chỉ lưới DỌC, rất nhạt: nó là thứ duy nhất nối thanh với thước trục khi
                      danh sách đã cuộn. Lưới ngang thì biểu đồ lại thành cái bảng.
                      Buộc vào trục doanh thu: có hai trục X thì `xAxisId` mặc định (`0`)
                      không còn tồn tại, lưới sẽ bám nhầm trục hoặc biến mất. */}
                    <CartesianGrid horizontal={false} stroke={INK.grid} xAxisId={REVENUE_X_AXIS} />
                    {/* Trục thật bị ẩn: thang đo do `<XAxis hide>` tính, còn phần CHỮ do
                      `HorizontalAxisRuler` vẽ ở trên. Vẫn phải khai đủ `domain` + `ticks` vì
                      lưới dọc và vị trí thanh đọc từ đây. */}
                    <XAxis
                      xAxisId={REVENUE_X_AXIS}
                      type="number"
                      domain={[0, scale.axis.max]}
                      ticks={scale.axis.ticks}
                      hide
                    />
                    {/* Trục X thứ hai — thang của ĐƯỜNG số giao dịch. */}
                    <XAxis
                      xAxisId={DEAL_X_AXIS}
                      type="number"
                      orientation="top"
                      domain={[0, scale.dealAxis.max]}
                      ticks={scale.dealAxis.ticks}
                      hide
                    />
                    {/* `dataKey="key"` chứ không phải `projectName` — hai dự án trùng tên thì
                      Recharts gộp làm một dải và mất hàng. */}
                    <YAxis
                      type="category"
                      dataKey="key"
                      width={0}
                      tick={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ReferenceLine x={0} xAxisId={REVENUE_X_AXIS} stroke={INK.baseline} />
                    {/* `portal` đưa tooltip sang lớp phủ ngoài khung cuộn, còn `TooltipAnchor`
                      lo phần định vị + lật ở mép. KHÔNG dùng `allowEscapeViewBox` nữa: nó chỉ
                      cho thoát viewBox của `<svg>`, mà thứ xén tooltip là `overflow-y-auto`
                      của khung cuộn — đo được cụt 36px ở hai dòng cuối. */}
                    <Tooltip
                      content={
                        <ProjectTooltip viewportRef={scrollerRef} hostRef={tooltipHostRef} />
                      }
                      cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                    />

                    <Bar
                      xAxisId={REVENUE_X_AXIS}
                      dataKey="revenue"
                      barSize={RANKED_BAR_LAYOUT.BAR_SIZE}
                      radius={[0, 4, 4, 0]}
                      fill={REVENUE_TREND_COLORS.revenue}
                      isAnimationActive={false}
                    >
                      {/* Truyền ELEMENT chứ không phải callback: Recharts tự `cloneElement` và
                        bơm `x`/`y`/`index` vào, nên prop dữ liệu ở đây được kiểm kiểu bình
                        thường và không cần ép kiểu nào cả. */}
                      <LabelList
                        dataKey="revenue"
                        content={<ProjectNameLabel rows={chartData} />}
                      />
                      <LabelList dataKey="revenue" content={<RevenueBarLabel rows={chartData} />} />
                    </Bar>

                    {/*
                    Đường nối số giao dịch giữa các dự án. Khai SAU `<Bar>` để vẽ đè lên thanh
                    — bị thanh che thì đường đứt quãng đúng ở những dòng doanh thu cao, tức là
                    mất tín hiệu ở chỗ đáng đọc nhất. `type="linear"` vì trục danh mục là các
                    dự án XẾP HẠNG, không phải mốc thời gian liên tục.
                  */}
                    <Line
                      xAxisId={DEAL_X_AXIS}
                      type="linear"
                      dataKey="dealCount"
                      stroke={REVENUE_TREND_COLORS.dealCount}
                      strokeWidth={2}
                      dot={{ r: 3, fill: REVENUE_TREND_COLORS.dealCount, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {/*
              Lớp phủ chứa tooltip. Nằm NGOÀI khung cuộn nên `overflow-y-auto` không
              xén được nó — đó là toàn bộ lý do nó tồn tại. `pointer-events-none` để
              nó không nuốt chuột của biểu đồ bên dưới, không thì hover chết ngay.
            */}
              <div
                ref={tooltipHostRef}
                data-testid="txn-chart-tooltip-layer"
                className="pointer-events-none absolute inset-0 z-10"
              />
            </div>

            {isScrolling && (
              <figcaption className="text-content-dark-3 pt-1 text-xs">
                Cuộn trong khung để xem đủ {chartData.length} dự án.
              </figcaption>
            )}
          </figure>
        </div>
      </LoadingWrapper>

      {/* Nguồn DUY NHẤT cho trình đọc màn hình (khối hình bên trên đã `aria-hidden`). Giữ đủ
          các cột theo SRS 18.7 US2 — biểu đồ chỉ vẽ được doanh thu, phần tiền còn lại sống ở
          đây, ở tooltip và ở file Excel. Đây cũng là chỗ test bám vào vì jsdom không dựng
          được `ResponsiveContainer`. */}
      <table className="sr-only">
        <caption>Giao dịch theo dự án {subTitle}</caption>
        <thead>
          <tr>
            <th scope="col">Dự án</th>
            <th scope="col">Chủ đầu tư</th>
            <th scope="col">Số giao dịch</th>
            <th scope="col">Doanh thu (VND)</th>
            <th scope="col">Giá tính phí (VND)</th>
            <th scope="col">Tiền hàng (VND)</th>
            <th scope="col">Đối chiếu (VND)</th>
            <th scope="col">Còn lại (VND)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.key}>
              <td>{row.projectName}</td>
              <td>{row.investorName || '—'}</td>
              <td>{formatNumber(row.dealCount)}</td>
              <td>{formatCurrencyVND(row.revenue)}</td>
              <td>{formatCurrencyVND(row.feePrice)}</td>
              <td>{formatCurrencyVND(row.goodsAmount)}</td>
              <td>{formatCurrencyVND(row.reconciliationAmount)}</td>
              <td>{formatCurrencyVND(row.remainingAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionsByProjectChart
