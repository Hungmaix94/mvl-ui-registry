import { useEffect, useRef } from 'react'
import { useTable } from '@/hooks/useTable'
import { useElementHeight } from '@/hooks/useElementHeight'
import { TableConfig } from '@/types/table'
import { TableHeader } from './TableHeader'
import { TableBody } from './TableBody'
import { TableFooter } from './TableFooter'
import { TablePagination } from '@/components/ui'
import { cn } from '@/utils'
import * as TableComponents from '@radix-ui/themes'
import TableColumnConfig from '@/components/ui/table/column-config/TableColumnConfig.tsx'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { CursorActionMenuOverlay } from './CursorActionMenuOverlay'

export function Table<TData>(config: TableConfig<TData>) {
  const {
    table,
    frozenOffsets,
    frozenRightOffsets,
    triggerActionMenu,
    showActions,
    rowActions,
    activeActionRowId,
    cursorActionMenuPosition,
    closeActionMenu,
    isShowConfigColumn,
    setIsShowConfigColumn,
  } = useTable(config)

  const {
    className,
    density = 'comfortable',
    emptyMessage = 'No data available',
    isLoading = false,
    hasFilter = false,
    enablePagination = true,
    totalRecords,
    onPaginationChange,
    onRowClick,
    onClearFilter,
    columnConfig,
    onColumnConfigApply,
    onColumnConfigReset,
    paginationPosition = 'fixed',
    paginationVariant = 'default',
    onTableInstance,
    disableInnerOverflow = false,
    getRowClassName,
    bordered = false,
    actionMenuPosition = 'cursor',
    actionMenuContentClassName,
    tableContainerClassName,
    pageSizeOptions,
    renderRowSubComponent,
    getCellColSpan,
    showSummaryRow = false,
    summaryLabel = 'TỔNG CỘNG',
    summaryRowCount,
    stickyHeader = false,
  } = config

  const densityClasses = {
    compact: 'text-xs',
    comfortable: 'text-sm',
    spacious: 'text-base',
  }

  const { open: isSidebarOpen } = useSidebar()
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const tableContainerRef = useRef<HTMLElement | null>(null)

  // The pagination bar (and, in 'static' mode, the horizontal scroll bar above it) is
  // position:fixed, so it overlays the bottom of the scroll port. Measure it and lift the
  // sticky summary row by that much, otherwise the row hides behind the bar.
  const [bottomChromeRef, bottomChromeHeight] = useElementHeight<HTMLDivElement>()

  // A total over zero rows is noise, and a stale total during a refetch is misleading.
  const hasSummaryRow = showSummaryRow && !isLoading && table.getRowModel().rows.length > 0

  // Find and set the actual scroll container (rt-ScrollAreaViewport from Radix)
  useEffect(() => {
    if (!tableWrapperRef.current) return

    const findScrollViewport = () => {
      const scrollViewport = tableWrapperRef.current?.querySelector(
        '.rt-ScrollAreaViewport'
      ) as HTMLElement | null
      if (scrollViewport) {
        tableContainerRef.current = scrollViewport
      } else {
        // Fallback to wrapper if viewport not found
        tableContainerRef.current = tableWrapperRef.current
      }
    }

    // Try immediately
    findScrollViewport()

    // Also try after a delay to catch late-rendering viewports
    const timeoutId = setTimeout(findScrollViewport, 200)

    // Use MutationObserver to detect when viewport is added
    const observer = new MutationObserver(() => {
      findScrollViewport()
    })

    if (tableWrapperRef.current) {
      observer.observe(tableWrapperRef.current, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [table]) // Re-run when table instance changes

  /**
   * `stickyHeader` — giữ hàng tiêu đề đứng yên khi cuộn dọc.
   *
   * ## Vì sao phải có JS, `sticky top-0` trên `<thead>` không đủ
   *
   * `TableHeader` đã khai `sticky top-0` từ lâu, nhưng ở phần lớn màn nó **không có tác dụng**:
   * `position: sticky` chỉ ăn theo **scrollport gần nhất**, mà scrollport gần nhất của `<thead>`
   * là `.rt-ScrollAreaViewport` do Radix `Table.Root` dựng (`overflow: scroll`). Viewport đó cao
   * đúng bằng nội dung (đo: 1974px cho cả hai) nên **không bao giờ tự cuộn** — thứ cuộn là cả
   * trang. Sticky vì thế nằm im so với viewport và trôi theo trang cùng bảng.
   *
   * Cách chữa: cho viewport một **chiều cao có giới hạn**. Nó thành scrollport cuộn thật, và
   * `sticky top-0` sẵn có lập tức bám đúng. Đo trên `Chia HH theo tháng` (2026-08-20): trước khi
   * chặn, cuộn 800px thì `<thead>` rơi từ 234 xuống −566; sau khi chặn, `<thead>` đứng nguyên 234
   * trong khi dòng thân đầu tiên chạy xuống −230.
   *
   * ## Vì sao là opt-in chứ không bật cho mọi bảng
   *
   * `<Table>` đang được 240 file dùng. Bật mặc định là đổi cách cuộn của toàn bộ ứng dụng —
   * mỗi màn phải kiểm lại. Màn nào cần thì tự khai.
   *
   * ## Vì sao đo bằng JS chứ không `max-h-[calc(100vh-Npx)]`
   *
   * Khoảng cách từ đỉnh màn tới đầu bảng khác nhau ở từng trang và còn đổi theo runtime (thanh
   * lọc xuống dòng, thẻ tổng hợp, banner chọn nhiều dòng). Hằng số px là sai ngay ở màn thứ hai.
   * Đo `getBoundingClientRect().top` thì luôn đúng, và `ResizeObserver` bắt được cả lúc phần trên
   * đổi chiều cao mà không cần cuộn hay đổi kích thước cửa sổ.
   *
   * Hệ quả phụ có lợi: bảng không còn đội chiều cao trang, nên trang thôi cuộn dọc và chỉ còn
   * MỘT thanh cuộn — thanh của chính vùng bảng. Vừa vào màn là thấy đủ hàng tiêu đề, thân bảng,
   * dòng tổng và thanh phân trang, không phải cuộn gì trước.
   *
   * ## Đánh đổi đã cân, đừng "tối ưu" lại
   *
   * Bảng chỉ cao bằng phần màn hình còn lại DƯỚI khối tiêu đề trang (~170px cho breadcrumb + tên
   * màn + thanh lọc). Muốn cao hơn thì phải cho khối đó cuộn khuất, mà đã cần cuộn thì lúc mới
   * vào màn dòng tổng nằm dưới mép — đã dựng thử và bị bác đúng vì lẽ đó. Xem ghi chú trong
   * `applyMaxHeight`.
   */
  useEffect(() => {
    const viewport = tableContainerRef.current
    if (!stickyHeader || !viewport) return

    // Dưới ngưỡng này thì phần bảng nhìn thấy quá ngắn để đọc; thà để trang cuộn như cũ còn hơn
    // ép người dùng đọc qua một khe hở vài dòng.
    const MIN_VIEWPORT_HEIGHT = 240

    const applyMaxHeight = () => {
      /**
       * Khung bảng chiếm ĐÚNG phần màn hình còn lại dưới nó — không hơn một px.
       *
       * Đã thử phương án tham hơn: ghim khung bảng dưới thanh app (`sticky top: 64px`) để khối
       * breadcrumb + tên màn + thanh lọc cuộn khuất, lấy thêm 170px chiều cao. Chạy đúng — nhưng
       * chỉ SAU KHI người dùng cuộn trang. Lúc vừa vào màn, đáy khung (kể cả DÒNG TỔNG) nằm dưới
       * mép màn hình. User bác 20/08: *"khi vừa vào page, tôi không thấy dòng tổng ở bottom page
       * đâu cả"*.
       *
       * Đó là đánh đổi không gỡ được, không phải thiếu sót: chiều cao cửa sổ cố định, nên bảng
       * chỉ cao thêm được bằng cách cho khối tiêu đề cuộn khuất — mà đã phải cuộn thì lúc chưa
       * cuộn buộc phải có phần nằm dưới mép. Chọn "vừa vào là thấy đủ" vì đây là màn ĐỐI SOÁT:
       * dòng tổng là con số kế toán kiểm đầu tiên, bắt cuộn mới thấy là sai mục đích của màn.
       *
       * (Cũng đừng thử phương án "chiều cao co giãn theo vị trí cuộn": ở đầu trang nó tính ra
       * đúng con số vừa khít màn ⇒ trang không có gì để cuộn ⇒ không bao giờ giãn ra được.)
       */
      const top = viewport.getBoundingClientRect().top
      // `bottomChromeHeight` là thanh phân trang + thanh cuộn ngang. Ở chế độ `fixed` chúng phủ
      // lên đáy khung cuộn; không trừ ra thì dòng cuối nằm dưới thanh đó, không cách nào cuộn tới.
      const available = window.innerHeight - top - bottomChromeHeight

      if (available < MIN_VIEWPORT_HEIGHT) {
        viewport.style.removeProperty('max-height')
        return
      }

      viewport.style.setProperty('max-height', `${Math.floor(available)}px`)
    }

    // Ghi chú cho người đọc sau: sau khi chặn chiều cao, trang VẪN cuộn được ~64px. Đã thử trừ
    // tiếp phần dôi đó — vô ích: bóp bảng từ 604px xuống 540px mà `scrollHeight` không giảm một
    // px nào, tức 64px kia không đến từ bảng. Nó là chiều cao thanh header ứng dụng cộng lên trên
    // một khối `min-h-screen` của app shell, có ở MỌI trang (màn Nhân viên cũng vậy). Đừng "sửa"
    // nó từ đây — chỉ mất chiều cao đọc được mà không giải quyết gì. Cuộn hết 64px đó thì hàng
    // tiêu đề nhích lên nhưng vẫn nằm trong tầm nhìn (đo: top 234 → 167).

    applyMaxHeight()

    // Quan sát cả wrapper (phần trên đổi chiều cao ⇒ đầu bảng tụt xuống) lẫn cửa sổ.
    const observer = new ResizeObserver(applyMaxHeight)
    observer.observe(document.body)
    if (tableWrapperRef.current) observer.observe(tableWrapperRef.current)
    window.addEventListener('resize', applyMaxHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', applyMaxHeight)
      viewport.style.removeProperty('max-height')
    }
  }, [stickyHeader, bottomChromeHeight, table, isLoading])

  // Expose table instance via callback
  useEffect(() => {
    if (onTableInstance) {
      onTableInstance(table)
    }
  }, [table, onTableInstance])

  return (
    <>
      <div
        ref={(el) => {
          tableWrapperRef.current = el
        }}
        className={cn('flex-1 space-y-4 px-7 pb-16', className)}
      >
        {/* Table container */}
        <div
          className={cn(
            'relative',
            'border-border-1 bg-content-light-1 relative border',
            !disableInnerOverflow && 'overflow-x-auto',
            tableContainerClassName
          )}
        >
          <TableComponents.Table.Root
            layout={'fixed'}
            className={cn('w-full border-collapse !overflow-visible', densityClasses[density])}
          >
            <TableHeader
              table={table}
              frozenOffsets={frozenOffsets}
              frozenRightOffsets={frozenRightOffsets}
              bordered={bordered}
            />
            <TableBody
              table={table}
              frozenOffsets={frozenOffsets}
              frozenRightOffsets={frozenRightOffsets}
              isLoading={isLoading}
              hasFilter={hasFilter}
              emptyMessage={emptyMessage}
              onRowClick={onRowClick}
              onClearFilter={onClearFilter}
              triggerActionMenu={triggerActionMenu}
              showActions={showActions}
              rowActions={rowActions}
              getRowClassName={getRowClassName}
              bordered={bordered}
              renderRowSubComponent={renderRowSubComponent}
              getCellColSpan={getCellColSpan}
            />
            {hasSummaryRow && (
              <TableFooter
                table={table}
                frozenOffsets={frozenOffsets}
                frozenRightOffsets={frozenRightOffsets}
                bordered={bordered}
                label={summaryLabel}
                rowCount={summaryRowCount}
                bottomOffset={bottomChromeHeight}
                pinToViewport={paginationPosition !== 'inline'}
                hasOwnScrollContainer={stickyHeader}
              />
            )}
          </TableComponents.Table.Root>
        </div>
      </div>

      {/* Cursor-positioned action menu overlay */}
      {actionMenuPosition === 'cursor' &&
        activeActionRowId &&
        cursorActionMenuPosition &&
        rowActions &&
        rowActions.length > 0 &&
        (() => {
          const activeRow = table.getRowModel().rows.find((r) => r.id === activeActionRowId)
          if (!activeRow) return null

          return (
            <CursorActionMenuOverlay
              position={cursorActionMenuPosition}
              row={activeRow.original}
              actions={rowActions}
              onClose={closeActionMenu}
              className={actionMenuContentClassName}
            />
          )
        })()}

      {/* Pagination - fixed position (default) */}
      {enablePagination && paginationPosition === 'fixed' && (
        <TablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          totalRecords={totalRecords}
          onPageSizeChange={(pageSize) => onPaginationChange?.(0, pageSize)}
          position={paginationPosition}
          variant={paginationVariant}
          rootRef={bottomChromeRef}
        />
      )}

      {/*
        Khối đáy cố định: thanh cuộn ngang + (tuỳ chọn) thanh phân trang — chế độ `static`.

        Điều kiện render CHỈ nhìn `paginationPosition`, KHÔNG nhìn `enablePagination`. Trước đây nó
        đứng sau `enablePagination &&`, nên bảng khai `enablePagination={false}` thì mất luôn thanh
        cuộn ngang — dù `HorizontalScrollBar` chẳng liên quan gì tới phân trang. Hậu quả im lặng:
        bảng rộng hơn khung mà không có thanh kéo nào, các cột cuối biến mất (đo 25/08 trên 6 màn
        báo cáo, trong đó `LadDebtByDealTable` đã khai đủ `paginationPosition="static"` +
        `disableInnerOverflow` mà vẫn không có thanh kéo — chính vì vướng điều kiện này).

        Phạm vi ảnh hưởng đã đo trước khi đổi: trong 63 file khai `static`, chỉ ĐÚNG MỘT file cũng
        khai `enablePagination={false}` (`LadDebtByDealTable`) — tức file duy nhất đổi hành vi là
        file đang hỏng. 60 file `enablePagination={false}` còn lại giữ `paginationPosition` mặc định
        `'fixed'` nên không đi vào nhánh này.
      */}
      {paginationPosition === 'static' && (
        <div
          ref={bottomChromeRef}
          className={cn(
            'fixed bottom-0 z-20 flex flex-col',
            'bg-content-light-1',
            isSidebarOpen
              ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
              : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
          )}
        >
          <div className="pl-10">
            <HorizontalScrollBar
              containerRef={tableContainerRef}
              className="border-border-1 border-x-0 border-b-0"
            />
          </div>
          {/*
            Phân trang vẫn phải theo `enablePagination`. Khối bọc ngoài đã bỏ điều kiện đó (để
            thanh cuộn ngang sống độc lập), nên nếu không chặn lại ở đây thì bảng khai
            `enablePagination={false}` sẽ MỌC LẠI thanh phân trang nó đã tắt — và ở các màn báo cáo
            tự dựng phân trang riêng (`SimplePagination`), thanh phân trang thừa đó đè lên phân
            trang thật. Đo 25/08: thanh đáy phình từ 8px lên 62px, che 4–9 nút của màn 65/69/70.
          */}
          {enablePagination && (
            <TablePagination
              table={table}
              pageSizeOptions={pageSizeOptions}
              totalRecords={totalRecords}
              onPageSizeChange={(pageSize) => onPaginationChange?.(0, pageSize)}
              position="static"
              variant={paginationVariant}
            />
          )}
        </div>
      )}

      {/* Inline pagination - for dialogs/modals where fixed position doesn't work */}
      {enablePagination && paginationPosition === 'inline' && (
        <TablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          totalRecords={totalRecords}
          onPageSizeChange={(pageSize) => onPaginationChange?.(0, pageSize)}
          position="static"
          variant={paginationVariant}
        />
      )}

      <TableColumnConfig
        isShowConfigColumn={isShowConfigColumn}
        setIsShowConfigColumn={setIsShowConfigColumn}
        columns={columnConfig || []}
        onApply={onColumnConfigApply || (() => {})}
        onReset={onColumnConfigReset || (() => {})}
      />
    </>
  )
}

export default Table
