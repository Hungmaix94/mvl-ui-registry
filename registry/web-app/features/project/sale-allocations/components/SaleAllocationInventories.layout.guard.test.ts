/**
 * Guard: tab "DS căn" của Bảng hàng phải chừa đủ chỗ cho khối phân trang cố định.
 *
 * `Table` render `TablePagination` trong một khối **`fixed bottom-0`** với mọi
 * `paginationPosition` khác `"inline"` — kể cả giá trị mặc định `"fixed"`, tức là không cần khai
 * gì cũng dính. Khối này **ĐÈ lên nội dung chứ không đẩy nội dung lên**: đo thật ở 1600×900,
 * zoom 100% là **54px**. Thứ giữ cho dòng cuối không chui xuống dưới nó là `pb-16` (64px) mặc
 * định trên wrapper của `Table` (`cn('flex-1 space-y-4 px-7 pb-16', className)`).
 *
 * Đã hỏng thật: `SaleAllocationInventories` truyền `className="px-0 pb-0"` — `pb-0` thắng
 * `pb-16` qua twMerge ⇒ chừa còn đúng `pb-5` (20px) của wrapper trang, dòng cuối bị che 32px khi
 * cuộn hết cỡ (đo trên SA 2173, 13 bản ghi). Cùng một lớp lỗi với 86eyj31ch ở màn Chi tiết hoa
 * hồng theo doanh thu, chỉ khác call site.
 *
 * Hỏng im lặng: không lỗi, không cảnh báo, vô hình ở đầu trang — chỉ lộ khi đủ bản ghi để phải
 * cuộn. Dev không thấy, QA mới thấy.
 *
 * Guard đọc source thay vì render DOM: đo khoảng chừa phải đi ngược cây cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`) cấm đúng thao tác đó.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))

const inventoriesSource = readFileSync(join(HERE, 'SaleAllocationInventories.tsx'), 'utf8')
const productInventoryTableSource = readFileSync(
  join(
    HERE,
    '../../../../pages/authenticated/project/product-inventories/components/ProductInventoryTable.tsx'
  ),
  'utf8'
)
const detailPageSource = readFileSync(
  join(
    HERE,
    '../../../../pages/authenticated/project/sale-allocations/SaleAllocationDetailPage.tsx'
  ),
  'utf8'
)

/** Chiều cao khối phân trang `fixed bottom-0`, đo thật trên trình duyệt: 54px. Chừa tròn 64px = `pb-16`. */
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

/** Phần tử chứa `anchor`, cắt từ `<` tới `>` — anchor là chuỗi chỉ có ở đúng phần tử đó. */
function elementContaining(source: string, anchor: string): string {
  const anchorAt = source.indexOf(anchor)
  expect(
    anchorAt,
    `không còn tìm thấy "${anchor}" — guard mất hiệu lực, cập nhật lại`
  ).toBeGreaterThan(-1)
  return source.slice(source.lastIndexOf('<', anchorAt), source.indexOf('>', anchorAt))
}

function classNameOfElementContaining(source: string, anchor: string): string {
  const element = elementContaining(source, anchor)
  const match = /\bclassName="([^"]*)"/.exec(element)
  expect(match, `phần tử chứa "${anchor}" không còn className dạng chuỗi`).not.toBeNull()
  return match![1]
}

/** `className` truyền cho bảng ở tab "DS căn". */
const tableClassName = classNameOfElementContaining(inventoriesSource, 'showUnitNumberEyeIcon')
/** Wrapper bọc toàn bộ nội dung tab trên trang chi tiết. */
const pageWrapperClassName = classNameOfElementContaining(detailPageSource, "flexGrow={'1'}")

describe('SaleAllocationInventories — khoảng chừa cho phân trang cố định', () => {
  it('neo đúng chỗ: bảng "DS căn" và wrapper trang là hai phần tử khác nhau', () => {
    expect(elementContaining(inventoriesSource, 'showUnitNumberEyeIcon')).toContain(
      'ProductInventoryTable'
    )
    expect(elementContaining(detailPageSource, "flexGrow={'1'}")).toContain('direction="column"')
    expect(pageWrapperClassName).not.toBe(tableClassName)
  })

  it('bảng vẫn dùng phân trang dạng cố định — nếu không thì guard này hết lý do tồn tại', () => {
    // `inline` là dạng DUY NHẤT không dựng khối `fixed bottom-0`; mặc định `fixed` vẫn dựng.
    expect(productInventoryTableSource).not.toContain('paginationPosition="inline"')
  })

  it('tổng khoảng chừa đáy đủ chỗ cho khối phân trang cố định', () => {
    const onTable = bottomPaddingOf(tableClassName) ?? TABLE_DEFAULT_BOTTOM_PX
    const onPageWrapper = bottomPaddingOf(pageWrapperClassName) ?? 0
    const reserve = onTable + onPageWrapper

    expect(
      reserve,
      `khối phân trang fixed cao 54px sẽ che dòng cuối. Đang chừa: Table ${onTable}px + wrapper trang ${onPageWrapper}px`
    ).toBeGreaterThanOrEqual(BOTTOM_CHROME_PX)
  })
})
