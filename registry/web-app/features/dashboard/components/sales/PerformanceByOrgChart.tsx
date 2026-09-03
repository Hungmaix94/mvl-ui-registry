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
import { useAbility } from '@/lib/ability'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { usePerformanceByOrgFilter } from '@/features/dashboard/hooks/usePerformanceByOrgFilter.tsx'
import {
  getAdminDashboardService,
  useAdminDashboardAllPerformance,
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
import { ChartTooltip, OrgNameLabel, type ChartRow } from './performance-by-org-chart-parts'
import { RankedBarsSkeleton } from './dashboard-skeletons'

function PerformanceByOrgChart() {
  const ability = useAbility()
  const canExport = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.EXPORT_PERFORMANCE,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  const [isExporting, setIsExporting] = useState(false)

  /**
   * Khung cuộn + lớp phủ chứa tooltip. Lớp phủ phải là STATE chứ không phải ref: Recharts
   * chỉ nhận `portal` qua prop, mà ref không kích hoạt render lại nên lượt đầu `portal` sẽ
   * mãi là `null` và tooltip không bao giờ hiện. Xem `TooltipAnchor` để biết vì sao phải
   * portal ra ngoài khung cuộn.
   */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const tooltipHostRef = useRef<HTMLDivElement>(null)

  const { openFilterModal, apiParams, subTitle, filterCount } = usePerformanceByOrgFilter()

  const { data, isLoading } = useAdminDashboardAllPerformance(apiParams)

  /** Phân trang do BE lo (`page_size=0`) — ở đây chỉ đổi hình dạng dòng và xếp hạng. */
  const chartData = useMemo<ChartRow[]>(() => {
    return (data?.results ?? [])
      .map((row, index) => ({
        key: `${row.org_id ?? 'na'}-${row.period_label ?? ''}-${index}`,
        orgName: row.org_name || 'Chưa gắn tổ chức',
        isUnattributed: !row.org_name,
        periodLabel: row.period_label || '',
        branchName: row.branch_name || '',
        blockName: row.block_name || '',
        revenue: Number(row.revenue_amount) || 0,
        dealCount: row.deal_count ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [data?.results])

  /**
   * Cột cấp trên chỉ dựng khi cấp đó THẬT SỰ có ở tập này — xem theo chi nhánh thì không có
   * gì bên trên, dựng hai cột "—" chỉ tổ bắt trình đọc màn hình đọc ra hai ô rỗng mỗi dòng.
   * Cùng luật với cột của file Excel (BE PR #3375), nên bảng và file luôn nói giống nhau.
   */
  const orgLevels = useMemo(
    () => ({
      hasBranch: chartData.some((row) => row.branchName),
      hasBlock: chartData.some((row) => row.blockName),
    }),
    [chartData]
  )

  /** Chỉ khi tập dữ liệu trộn nhiều kỳ thì mỗi hàng mới cần gắn kỳ — phụ đề đã nói khi một kỳ. */
  const hasMultiplePeriods = useMemo(
    () => new Set(chartData.map((row) => row.periodLabel)).size > 1,
    [chartData]
  )

  const scale = useMemo(() => {
    const revenue = chartData.reduce((sum, row) => sum + row.revenue, 0)
    const deals = chartData.reduce((sum, row) => sum + row.dealCount, 0)
    return {
      revenue,
      deals,
      avgPerDeal: deals > 0 ? revenue / deals : 0,
      axis: buildNiceAxis(Math.max(...chartData.map((row) => row.revenue), 0)),
      /**
       * Trục RIÊNG cho số giao dịch. Không dùng chung thang với doanh thu: hai đại lượng
       * lệch nhau cỡ chín bậc (vài chục giao dịch cạnh vài tỷ đồng), ép chung một trục thì
       * đường giao dịch bị dí sát mốc 0 thành một vạch thẳng — nhìn ra "mọi phòng như nhau",
       * đúng cái điều mà đường này sinh ra để bác bỏ.
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
      // trên màn hình.
      await getAdminDashboardService().exportPerformance(apiParams)
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [apiParams])

  return (
    <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <DashboardChartTitle
        title="Hiệu suất theo tổ chức"
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
        loadingSkeleton={<RankedBarsSkeleton rows={6} stats={3} />}
      >
        <div className="flex flex-col gap-5">
          {/* Dải tổng: quy mô nền để đọc các thanh bên dưới. Không còn chữ "trang này" — BE
              trả trọn bộ dòng của bộ lọc (`page_size=0`) nên đây LÀ tổng của bộ lọc. */}
          <div className="bg-background-2 border-border-1 grid grid-cols-2 gap-4 rounded-lg border px-4 py-3 sm:grid-cols-3">
            <SummaryStat
              label="Doanh thu"
              value={formatCompactVnd(scale.revenue)}
              hint={`${formatCurrencyVND(scale.revenue)} VND`}
            />
            <SummaryStat
              label="Giao dịch"
              value={formatNumber(scale.deals)}
              hint={`${chartData.length} dòng`}
            />
            <SummaryStat
              label="Bình quân mỗi giao dịch"
              value={formatCompactVnd(scale.avgPerDeal)}
              hint={`${formatCurrencyVND(scale.avgPerDeal)} VND`}
            />
          </div>

          {/*
            `aria-hidden` cho TRỌN khối hình: Recharts gắn `role="application"` lên wrapper và
            phơi mọi `<text>` bên trong, nên trình đọc màn hình sẽ đọc hết số của biểu đồ RỒI
            đọc lại đúng ngần ấy số trong bảng ẩn bên dưới — nghe thành dữ liệu nhân đôi.
            Nguồn duy nhất cho trợ năng là `<table className="sr-only">`.
          */}
          <figure className="m-0 flex flex-col gap-1" aria-hidden="true">
            {/*
              Thước trục nằm NGOÀI vùng cuộn nên không trôi mất khi đã cuộn xuống. Hai thước
              dùng chung đúng một cặp lề (`AXIS_ZERO_GUTTER` / `VALUE_LABEL_GUTTER`) vì hai
              trục vẽ trên cùng một vùng vẽ — lệch lề là hai thước nói về hai bề rộng khác
              nhau và cả hai đều sai.
            */}
            {/*
              `overflow-y-hidden` KHÔNG phải để giấu gì — nó là điều kiện để
              `scrollbar-gutter` có hiệu lực. Thuộc tính này chỉ áp cho SCROLL CONTAINER;
              một `<div>` không khai `overflow` thì nó bị bỏ qua IM LẶNG, và lúc đó lớp
              thước rộng hơn vùng vẽ đúng bằng bề rộng thanh cuộn ⇒ vạch lệch dần sang phải,
              đo được 0 · 2 · 4 · 6 · 8px trên dữ liệu dev. Không có lỗi nào bật lên, chỉ có
              cái thước nói sai.
            */}
            <div
              data-testid="perf-chart-axis"
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
                testId="perf-chart-deal-ruler"
              />
              <HorizontalAxisRuler
                ticks={scale.axis.ticks}
                max={scale.axis.max}
                leftGutter={RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER}
                rightGutter={RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER}
                testId="perf-chart-revenue-ruler"
              />
            </div>

            {/*
              Khung cuộn chỉ dựng khi THẬT SỰ có dòng tràn ra — cùng lý do ở
              `TransactionsByProjectChart`: `overflow-y-auto` thường trực CẮT CỤT tooltip khi
              ít dòng, và `scrollbar-gutter` giữ chỗ cạnh một khung tí hon đọc thành "ô xem có
              thanh cuộn" dù `scrollHeight === clientHeight`.
            */}
            {/* `relative` = mốc định vị cho LỚP PHỦ tooltip ngay bên dưới. */}
            <div data-testid="perf-chart-plot" className="relative">
              <div
                ref={scrollerRef}
                data-testid="perf-chart-scroller"
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
                      Buộc theo trục doanh thu: có hai trục X thì `xAxisId` mặc định (`0`)
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
                    {/* Trục X thứ hai — thang của ĐƯỜNG số giao dịch. `orientation="top"` cho
                      khớp thứ tự hai thước HTML ở trên (giao dịch trên, doanh thu dưới); vẫn
                      `hide` vì phần chữ do `HorizontalAxisRuler` vẽ ngoài vùng cuộn. */}
                    <XAxis
                      xAxisId={DEAL_X_AXIS}
                      type="number"
                      orientation="top"
                      domain={[0, scale.dealAxis.max]}
                      ticks={scale.dealAxis.ticks}
                      hide
                    />
                    {/* `dataKey="key"` chứ KHÔNG phải `orgName` — cùng một phòng ở hai kỳ là hai
                      dòng khác nhau; trùng tên thì Recharts gộp dải danh mục và mất hàng. */}
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
                      của khung cuộn. Khối này từng "không sao" chỉ vì tooltip của nó thấp hơn
                      khối "Giao dịch theo dự án" 32px — may, không phải dựng đúng. */}
                    <Tooltip
                      content={<ChartTooltip viewportRef={scrollerRef} hostRef={tooltipHostRef} />}
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
                        content={<OrgNameLabel rows={chartData} showPeriod={hasMultiplePeriods} />}
                      />
                      <LabelList dataKey="revenue" content={<RevenueBarLabel rows={chartData} />} />
                    </Bar>

                    {/*
                    Đường nối số giao dịch giữa các phòng ban. Khai SAU `<Bar>` để nó vẽ đè
                    lên thanh — bị thanh che thì đường đứt quãng đúng ở những dòng doanh thu
                    cao, tức là mất tín hiệu ở chỗ đáng đọc nhất.

                    `type="linear"` chứ không `monotone` như biểu đồ xu hướng: trục danh mục
                    ở đây là các phòng ban XẾP HẠNG, không phải mốc thời gian liên tục — bo
                    cong sẽ vẽ ra những giá trị trung gian giữa hai phòng, thứ không tồn tại.
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
                data-testid="perf-chart-tooltip-layer"
                className="pointer-events-none absolute inset-0 z-10"
              />
            </div>

            {isScrolling && (
              <figcaption className="text-content-dark-3 pt-1 text-xs">
                Cuộn trong khung để xem đủ {chartData.length} dòng.
              </figcaption>
            )}
          </figure>
        </div>
      </LoadingWrapper>

      {/* Nguồn DUY NHẤT cho trình đọc màn hình (khối hình bên trên đã `aria-hidden`), và cũng
          là chỗ test bám vào vì jsdom không dựng được `ResponsiveContainer`. Cấp trên đứng
          TRƯỚC cột tổ chức để đọc xuôi theo cây, giống thứ tự cột của file Excel. */}
      <table className="sr-only">
        <caption>Hiệu suất theo tổ chức {subTitle}</caption>
        <thead>
          <tr>
            <th scope="col">Kỳ</th>
            {orgLevels.hasBranch && <th scope="col">Chi nhánh</th>}
            {orgLevels.hasBlock && <th scope="col">Khối</th>}
            <th scope="col">Tổ chức</th>
            <th scope="col">Số giao dịch</th>
            <th scope="col">Doanh thu (VND)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.key}>
              <td>{row.periodLabel || '—'}</td>
              {orgLevels.hasBranch && <td>{row.branchName || '—'}</td>}
              {orgLevels.hasBlock && <td>{row.blockName || '—'}</td>}
              <td>{row.orgName}</td>
              <td>{formatNumber(row.dealCount)}</td>
              <td>{formatCurrencyVND(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PerformanceByOrgChart
