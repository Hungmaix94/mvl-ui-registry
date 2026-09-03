/**
 * Guard: màn Chi tiết hoa hồng theo doanh thu phải chừa đủ chỗ cho khối phân trang cố định.
 *
 * `paginationPosition="static"` khiến `Table` render `HorizontalScrollBar` + `TablePagination`
 * trong một khối **`fixed bottom-0`** (`Table.tsx`). Khối này **ĐÈ lên nội dung chứ không đẩy
 * nội dung lên**, cao ~62px ở zoom 100%. Không chừa đủ padding đáy thì dòng cuối bảng bị nó che
 * một phần khi cuộn hết cỡ.
 *
 * Hỏng im lặng: không lỗi, không cảnh báo, và vô hình ở đầu trang — chỉ lộ ra khi số bản ghi đủ
 * nhiều để phải cuộn. Vì thế dev không thấy, QA mới thấy.
 *
 * Màn này đã hỏng HAI lần nên mới có guard, mỗi lần một kiểu — và mỗi `it` bên dưới canh một kiểu:
 *
 *  1. `!pb-0` trên `className` của `Table` xoá mất `pb-16` mặc định, wrapper trang chỉ có `pb-6`
 *     (24px) ⇒ tổng chừa 24px < 62px. Đo thật: dòng 18/18 bị che 36/69 px (ClickUp 86eyj31ch).
 *  2. Fix đợt đầu trả `pb-16` về cho `Table` ⇒ hết bị che, nhưng ở màn này bảng nằm TRONG thẻ có
 *     viền, nên 64px trắng đó nằm bên trong khung và đọc ra thành một dòng rỗng thừa ngay dưới
 *     dòng cuối. BA báo lại lần hai. Chỗ đúng để chừa là **wrapper trang**, ngoài thẻ.
 *
 * Guard đọc source thay vì render DOM: đo khoảng chừa phải đi ngược lên các phần tử cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`) cấm đúng thao tác đó — và repo này
 * chưa từng tắt luật ấy ở đâu.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const PAGE = join(dirname(fileURLToPath(import.meta.url)), 'CommissionByRevenueDetailPage.tsx')
const source = readFileSync(PAGE, 'utf8')

/**
 * Chiều cao khối phân trang `fixed bottom-0`, đo thật trên trình duyệt ở zoom 100%: 62px
 * (thanh cuộn ngang + footer phân trang). Lấy tròn 64px = `pb-16`, đúng nấc Tailwind mà phần
 * còn lại của hệ thống đang chừa.
 */
const BOTTOM_CHROME_PX = 64

/** Mặc định của `Table`: `cn('flex-1 space-y-4 px-7 pb-16', className)`. */
const TABLE_DEFAULT_BOTTOM_PX = 64

/** `pb-16` → 64px. Trên cùng một phần tử, `!pb-0` thắng `pb-16` vì `!important`. */
function bottomPaddingOf(className: string): number | null {
  const tokens = className.split(/\s+/)
  const important = tokens.filter((t) => /^!pb-\d+$/.test(t)).pop()
  const normal = tokens.filter((t) => /^pb-\d+$/.test(t)).pop()
  const winner = important ?? normal
  return winner === undefined ? null : Number(winner.replace(/^!?pb-/, '')) * 4
}

/** `className="…"` của phần tử chứa `anchor` — anchor là một chuỗi chỉ có ở đúng phần tử đó. */
function classNameOfElementContaining(anchor: string): string {
  const anchorAt = source.indexOf(anchor)
  expect(
    anchorAt,
    `không còn tìm thấy "${anchor}" — guard mất hiệu lực, cập nhật lại`
  ).toBeGreaterThan(-1)

  const openedAt = source.lastIndexOf('<', anchorAt)
  const closedAt = source.indexOf('>', anchorAt)
  const element = source.slice(openedAt, closedAt)
  const match = /\bclassName="([^"]*)"/.exec(element)

  expect(match, `phần tử chứa "${anchor}" không còn className dạng chuỗi`).not.toBeNull()
  return match![1]
}

/** Phần tử chứa `anchor`, cắt từ `<` tới `>` — để soi cả các prop khác của nó. */
function elementContaining(anchor: string): string {
  const anchorAt = source.indexOf(anchor)
  expect(
    anchorAt,
    `không còn tìm thấy "${anchor}" — guard mất hiệu lực, cập nhật lại`
  ).toBeGreaterThan(-1)
  return source.slice(source.lastIndexOf('<', anchorAt), source.indexOf('>', anchorAt))
}

/** Wrapper trang — cũng là vùng được xuất PDF. */
const pageWrapperClassName = classNameOfElementContaining('ref={exportRef}')
/**
 * `className` truyền vào `Table`; không có `pb` nào thì `pb-16` mặc định có hiệu lực.
 *
 * Neo vào `tableContainerClassName=` chứ KHÔNG vào `paginationPosition="static"`: chuỗi thứ hai
 * còn nằm trong comment giải thích ở wrapper trang, neo vào đó là bắt nhầm phần tử — và guard
 * lặng lẽ đo sai chỗ thay vì báo hỏng.
 */
const tableClassName = classNameOfElementContaining('tableContainerClassName=')

describe('CommissionByRevenueDetailPage — khoảng chừa cho phân trang cố định (86eyj31ch)', () => {
  it('vẫn dùng phân trang cố định — nếu không thì guard này không còn lý do tồn tại', () => {
    // Chính phần tử vừa neo phải là cái đang bật phân trang cố định.
    expect(elementContaining('tableContainerClassName=')).toContain('paginationPosition="static"')
    expect(pageWrapperClassName).not.toBe(tableClassName)
  })

  it('tổng khoảng chừa đáy đủ chỗ cho khối phân trang cố định', () => {
    const onTable = bottomPaddingOf(tableClassName) ?? TABLE_DEFAULT_BOTTOM_PX
    const onPageWrapper = bottomPaddingOf(pageWrapperClassName) ?? 0
    const reserve = onTable + onPageWrapper

    expect(
      reserve,
      `khối phân trang fixed cao ~62px sẽ che dòng cuối. Đang chừa: Table ${onTable}px + wrapper trang ${onPageWrapper}px`
    ).toBeGreaterThanOrEqual(BOTTOM_CHROME_PX)
  })

  it('khoảng chừa nằm NGOÀI thẻ có viền, để khung bảng ôm sát dòng cuối', () => {
    // Lấy giá trị CÓ HIỆU LỰC: bỏ trắng `pb` nghĩa là `pb-16` mặc định của Table đang chạy, tức
    // khoảng chừa rơi vào bên trong thẻ — đúng cái phải chặn, chứ không phải "chưa khai gì".
    const effectiveOnTable = bottomPaddingOf(tableClassName) ?? TABLE_DEFAULT_BOTTOM_PX

    expect(
      effectiveOnTable,
      'chừa bên trong wrapper của Table thì khoảng trắng nằm trong khung viền, trông như một dòng rỗng thừa dưới dòng cuối'
    ).toBe(0)
  })
})
