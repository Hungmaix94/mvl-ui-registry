import { useLayoutEffect, useRef } from 'react'
import { flexRender, Table } from '@tanstack/react-table'
import { cn } from '@/utils'
import { NON_MERGEABLE_COLUMN_IDS } from '@/types/table'

// Utility columns carry no business value (and are far too narrow for the label), so the label
// must never be ASSIGNED to one. Chúng vẫn có thể bị ô nhãn gộp vào (`colSpan`) khi đứng liền
// kề — lúc đó ô nhãn vẫn mang danh tính của cột nhãn thật, xem `labelColumn` bên dưới.
const UTILITY_COLUMN_IDS = ['select', 'stt', 'actions', 'expander']

/**
 * Keep the summary row pinned above the fixed pagination bar while the page scrolls.
 *
 * `position: sticky` alone is not enough on these list pages: the nearest ancestor with a
 * scrolling box is Radix's `.rt-ScrollAreaViewport` (`overflow: scroll`), which never
 * actually scrolls — the page grows and the WINDOW scrolls instead. Sticky then anchors to
 * that inert box and the row just flows off-screen. The header has the same problem, which
 * is why `list-page-scroll-footer-implementation-guide.md` drives it with a transform too.
 *
 * So: measure where the row would sit untransformed, and lift it with `translateY` until its
 * bottom edge rests just above the fixed chrome. Clamped so it never rides up over the
 * header. When sticky *does* work (a page with a real scroll container), the untransformed
 * position is already pinned and the computed lift is 0 — no double-shift.
 */
function usePinAboveFixedChrome(bottomOffset: number, enabled: boolean) {
  const footerRef = useRef<HTMLTableSectionElement | null>(null)
  const appliedRef = useRef(0)

  useLayoutEffect(() => {
    const footer = footerRef.current
    if (!footer) return

    // Nothing to pin against when the pagination bar scrolls with the page: viewport-pinning
    // would park the row on top of it. Undo any transform left from a previous mode.
    if (!enabled) {
      if (appliedRef.current) {
        appliedRef.current = 0
        footer.style.transform = ''
      }
      return
    }

    let frame = 0

    const update = () => {
      frame = 0
      const el = footerRef.current
      if (!el) return

      const applied = appliedRef.current
      const rect = el.getBoundingClientRect()
      const naturalTop = rect.top - applied
      const naturalBottom = rect.bottom - applied

      const desiredBottom = window.innerHeight - bottomOffset
      let next = Math.min(0, desiredBottom - naturalBottom)

      // Never let the total row climb over the header.
      const head = el.closest('table')?.querySelector('thead')
      const floor = head ? head.getBoundingClientRect().bottom : 0
      next = Math.max(next, -Math.max(0, naturalTop - floor))

      if (Math.abs(next - applied) < 0.5) return
      appliedRef.current = next
      el.style.transform = next ? `translateY(${next}px)` : ''
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    // Capture phase so scrolls inside any nested container reach us too — scroll does not bubble.
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    const table = footer.closest('table')
    if (table && observer) observer.observe(table)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [bottomOffset, enabled])

  return footerRef
}

interface TableFooterProps<TData> {
  table: Table<TData>
  frozenOffsets: Record<string, number>
  frozenRightOffsets: Record<string, number>
  bordered?: boolean
  /** Leading text, e.g. "TỔNG CỘNG". Rendered in the first non-utility column. */
  label: string
  /** Appended to the label as "(N bản ghi)" when provided. */
  rowCount?: number | null
  /**
   * Height in px of the fixed bottom chrome (pagination bar + horizontal scroll bar).
   * The row sticks above it instead of hiding underneath.
   */
  bottomOffset: number
  /**
   * Whether to pin the row to the viewport. False when the pagination bar is in normal flow
   * (`paginationPosition="inline"`) — there is no fixed chrome to sit above, and pinning
   * would drop the row on top of the pagination controls.
   */
  pinToViewport: boolean
  /**
   * Bảng đã có hộp cuộn riêng (`stickyHeader` của `<Table>`).
   *
   * Khi đó **phải tắt** phép nâng bằng `transform` ở trên và chuyển sang `sticky bottom-0` thật.
   * Lý do: `usePinAboveFixedChrome` neo dòng tổng theo `window.innerHeight`, tức giả định thứ
   * cuộn là cả TRANG. Bảng tự cuộn thì giả định đó sai — dòng tổng bị nâng lên quá tay và **đè
   * lên dòng cuối** (đo 20/08: che mất 36px của dòng 9).
   *
   * `sticky bottom-0` trong hộp cuộn thật cho đúng cả hai trạng thái: cuộn giữa chừng thì dòng
   * tổng nổi ở đáy khung, cuộn hết cỡ thì nó về đúng vị trí tự nhiên sau dòng cuối — không che gì.
   */
  hasOwnScrollContainer?: boolean
}

/**
 * Sticky "total" row pinned to the bottom of the table.
 *
 * Lives inside the same `<table>` as the header and body, so column widths, horizontal
 * scrolling and frozen columns all line up for free — mirroring `TableHeader`.
 *
 * Per-column values come from TanStack's native `ColumnDef.footer`.
 */
function TableFooter<TData>({
  table,
  frozenOffsets,
  frozenRightOffsets,
  bordered,
  label,
  rowCount,
  bottomOffset,
  pinToViewport,
  hasOwnScrollContainer = false,
}: TableFooterProps<TData>) {
  const footerRef = usePinAboveFixedChrome(bottomOffset, pinToViewport && !hasOwnScrollContainer)
  const headerGroups = table.getHeaderGroups()
  // The last header group is always the leaf row — the one column widths are based on.
  const leafHeaders = headerGroups[headerGroups.length - 1]?.headers ?? []

  if (leafHeaders.length === 0) return null

  const labelHeader = leafHeaders.find(
    (header) =>
      !UTILITY_COLUMN_IDS.includes(header.column.id) && header.column.columnDef.footer == null
  )
  const labelIndex = labelHeader ? leafHeaders.indexOf(labelHeader) : -1

  /**
   * Gộp nhãn với dải cột trống liền kề, nhưng KHÔNG bao giờ vượt qua một ranh giới ghim.
   *
   * Nhãn "TỔNG CỘNG (N bản ghi)" thường rộng hơn một cột, mà ô bị ghim `maxWidth` theo
   * `column.getSize()` dưới `table-layout: fixed` nên không nở ra được — để nguyên thì hoặc tràn
   * sang cột bên (lỗi cũ), hoặc phải xuống dòng cho xấu. Gộp các cột không có số liệu ở hai bên
   * cho nhãn đủ chỗ nằm một dòng.
   *
   * Ranh giới là "cùng kiểu ghim", không phải "không ghim". Cái hỏng khi gộp CHÉO hai kiểu:
   * - Ô gộp chỉ mang được MỘT offset. `frozenRight` cộng dồn TỪ PHẢI SANG
   *   (`calculateFrozenRightOffsets`) nên ô gộp phải lấy `right` của cột PHẢI NHẤT trong dải;
   *   trộn với cột không ghim thì không có offset nào đúng cho cả hai.
   * - Vùng ghim của `tfoot` sẽ rộng hơn `thead`/`tbody`, cuộn ngang là dòng tổng đè lên nội
   *   dung trôi qua dưới nó.
   *
   * Gộp TRONG một dải cùng kiểu thì cả hai vấn đề biến mất: bề rộng ô gộp đúng bằng tổng các
   * cột nó chiếm, nên vùng ghim của dòng tổng vẫn khớp y hệt thân bảng.
   */
  const pinKindOf = (header: (typeof leafHeaders)[number]) => {
    const meta = header.column.columnDef.meta
    if (meta?.frozen) return 'left'
    if (meta?.frozenRight) return 'right'
    return 'none'
  }
  const labelPinKind = labelHeader ? pinKindOf(labelHeader) : 'none'
  const canMergeInto = (header: (typeof leafHeaders)[number]) =>
    header.column.columnDef.footer == null &&
    !NON_MERGEABLE_COLUMN_IDS.includes(header.column.id) &&
    pinKindOf(header) === labelPinKind

  let spanStart = labelIndex
  let spanEnd = labelIndex
  if (labelIndex >= 0) {
    while (spanStart > 0 && canMergeInto(leafHeaders[spanStart - 1])) spanStart -= 1
    while (spanEnd < leafHeaders.length - 1 && canMergeInto(leafHeaders[spanEnd + 1])) spanEnd += 1
  }

  return (
    // `relative z-30` is load-bearing: the transform above creates a stacking context, which
    // would otherwise sink the whole row beneath the body's frozen cells (`sticky z-20`).
    // Stays under the header (`z-40`) so it can never cover it.
    //
    // Khi bảng có hộp cuộn riêng thì ghim chính `<tfoot>` bằng `sticky bottom-0`, đối xứng với
    // `<thead>` ở `TableHeader`. Đặt `sticky` trên từng `<td>` KHÔNG đủ: ô chỉ trôi được trong
    // phạm vi section của nó (tfoot cao 42px), nên dòng tổng vẫn tụt khỏi tầm nhìn khi cuộn giữa
    // chừng — đã đo đúng triệu chứng đó trước khi chuyển lên đây.
    <tfoot
      ref={footerRef}
      className={cn(
        'js-table-summary-row z-30',
        hasOwnScrollContainer ? 'sticky bottom-0' : 'relative'
      )}
    >
      <tr>
        {leafHeaders.map((header, index) => {
          // Các cột đã bị ô nhãn nuốt vào `colSpan` thì không render riêng nữa.
          if (index > spanStart && index <= spanEnd) return null

          const { column } = header
          const isFrozen = column.columnDef.meta?.frozen
          const isFrozenRight = column.columnDef.meta?.frozenRight
          const isSticky = isFrozen || isFrozenRight
          const hasFooter = column.columnDef.footer != null
          const isLabelCell = index === spanStart && labelIndex >= 0
          const colSpan = isLabelCell ? spanEnd - spanStart + 1 : 1
          // Ô gộp mang được đúng MỘT offset, và hai kiểu ghim cộng dồn ngược chiều nhau:
          // `left` từ trái sang nên lấy của cột trái nhất (chính là ô này), `right` từ phải
          // sang nên phải lấy của cột PHẢI NHẤT trong dải.
          const offset = frozenOffsets[column.id]
          const rightOffset =
            frozenRightOffsets[isLabelCell ? leafHeaders[spanEnd].column.id : column.id]
          // Ô gộp bắt đầu ở cột trái nhất của dải, nhưng danh tính (id để query, `cellClassName`)
          // phải là của CỘT NHÃN — nếu không, gộp sang trái là ô nhãn đội lốt `stt` và thừa hưởng
          // style của cột STT.
          const identity = isLabelCell && labelHeader ? labelHeader.column : column
          // Nhãn là chữ dẫn của cả dải, luôn đọc từ mép trái — không mượn `align` của cột số.
          const align = isLabelCell ? 'left' : column.columnDef.meta?.align || 'left'
          // Ô gộp phải rộng bằng tổng các cột nó chiếm, nếu không sẽ lệch lưới cột.
          const width = isLabelCell
            ? leafHeaders
                .slice(spanStart, spanEnd + 1)
                .reduce((total, h) => total + h.column.getSize(), 0)
            : column.getSize()

          return (
            <td
              key={header.id}
              colSpan={colSpan > 1 ? colSpan : undefined}
              data-column-id={identity.id}
              className={cn(
                'border-border-1 border-t',
                bordered && 'border-r last:border-r-0',
                'bg-clip-padding',
                identity.id === 'actions' ? '' : 'px-3 py-[10px]',
                'typo-body-base-semibold text-content-dark-1',
                'break-words whitespace-normal',
                identity.columnDef.meta?.cellClassName,
                // Above body cells (z-20), below the header (z-50) so they never fight.
                'sticky',
                // Chỉ ghim dọc khi bảng có hộp cuộn thật. Không có nó thì `bottom` phải để `auto`
                // — sticky neo vào một hộp không bao giờ cuộn là dòng tổng dính cứng sai chỗ, và
                // đó chính là lý do `usePinAboveFixedChrome` phải tồn tại.
                hasOwnScrollContainer && 'bottom-0',
                isSticky ? 'z-40' : 'z-30',
                '!bg-neutral-20',
                isFrozen && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
                isFrozenRight && 'shadow-[-2px_0_4px_rgba(0,0,0,0.1)]',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right'
              )}
              style={{
                // No `bottom` here on purpose: the tfoot transform already owns vertical
                // pinning. Setting it again would stack the same offset twice and leave the
                // row floating a chrome's height above the pagination bar. `sticky` stays —
                // the frozen columns need it for `left`/`right`, and z-index needs a
                // positioned element.
                ...(isFrozen
                  ? { ...(column.id === 'actions' ? { right: '0px' } : { left: `${offset}px` }) }
                  : {}),
                ...(isFrozenRight ? { right: `${rightOffset}px` } : {}),
                ...(width > 0
                  ? {
                      width: `${width}px`,
                      minWidth: `${width}px`,
                      maxWidth: `${width}px`,
                    }
                  : {}),
              }}
            >
              {hasFooter ? (
                flexRender(column.columnDef.footer, header.getContext())
              ) : isLabelCell ? (
                // Không `whitespace-nowrap`: ô bị ghim `maxWidth` theo `column.getSize()` dưới
                // `table-layout: fixed` nên không nở ra được — ép một dòng là chữ vẽ đè sang cột
                // bên cạnh. Để nhãn tự xuống dòng trong ô của nó.
                <span>
                  {label}
                  {typeof rowCount === 'number' ? ` (${rowCount} bản ghi)` : ''}
                </span>
              ) : null}
            </td>
          )
        })}
      </tr>
    </tfoot>
  )
}

export { TableFooter }
export default TableFooter
