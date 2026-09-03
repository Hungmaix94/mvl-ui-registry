/**
 * Guard: tab "DS căn" phải tự `+ 1` khi đổi trang, vì `ProductInventoryTable` chuyển tiếp
 * `onPaginationChange` NGUYÊN XI.
 *
 * Chuỗi hợp đồng: `useTable` gọi `onPaginationChange(pageIndex, pageSize)` với `pageIndex`
 * **0-based** → `Table` → `ProductInventoryTable` chuyển tiếp thẳng (`onPaginationChange={onPaginationChange}`)
 * → `SaleAllocationInventories`. Nên tab là nơi **cuối cùng** có thể quy về 1-based trước khi ghi
 * lên URL và gọi API.
 *
 * Thiếu `+ 1` thì bấm về trang đầu ghi `page=0`, và
 * `GET /api/realestate/sales-allocations/<id>/product-inventories/?page=0` trả **404
 * `Invalid page.`** (đo thật trên SA 1826 ngày 20/08) ⇒ bảng rỗng "Chưa có dữ liệu có sẵn".
 * Đó chính là bug 86eyp02ev.
 *
 * Vì sao guard này HẸP (chỉ một cặp component) chứ không quét cả repo: cơ sở đếm **không** thống
 * nhất giữa các bảng. Đo trên `origin/dev` ngày 20/08: 101 bảng chuyển tiếp nguyên xi (consumer
 * phải `+ 1`), nhưng 4 bảng tự quy đổi sẵn — `SaleAllocationListTable` và
 * `SaleAllocationTransactionTable` nằm trong nhóm 4 đó, nên consumer của chúng ghi thẳng tham số
 * là ĐÚNG. Một guard quét cả repo theo hình dạng câu lệnh sẽ bắt nhầm đúng hai chỗ đó — bản đầu
 * của guard này đã bắt nhầm thật. Muốn đúng thì phải lần sang file con để biết nó có quy đổi hay
 * không; ở đây chốt thẳng cặp component của tab này cho chắc.
 *
 * Test kiểm cả **tiền đề**: nếu `ProductInventoryTable` sau này tự quy đổi thì guard phải đỏ để
 * người sửa biết mà bỏ `+ 1` ở tab, chứ không im lặng cho qua rồi cộng hai lần.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))

const tabSource = readFileSync(join(HERE, 'SaleAllocationInventories.tsx'), 'utf8')
const tableSource = readFileSync(
  join(
    HERE,
    '../../../../pages/authenticated/project/product-inventories/components/ProductInventoryTable.tsx'
  ),
  'utf8'
)
const useTableSource = readFileSync(join(HERE, '../../../../hooks/useTable.ts'), 'utf8')

describe('SaleAllocationInventories — quy đổi pageIndex 0-based sang page 1-based', () => {
  it('useTable vẫn phát ra pageIndex 0-based', () => {
    expect(
      useTableSource,
      'useTable không còn phát `newPagination.pageIndex` — đọc lại chuỗi hợp đồng rồi cập nhật guard'
    ).toContain('onPaginationChange(newPagination.pageIndex, newPagination.pageSize)')
  })

  it('ProductInventoryTable vẫn chuyển tiếp nguyên xi, không tự quy đổi', () => {
    expect(
      tableSource,
      'ProductInventoryTable đã đổi cách chuyển tiếp onPaginationChange. Nếu nó tự `+ 1` rồi thì ' +
        'phải BỎ `+ 1` ở SaleAllocationInventories, không thì cộng hai lần.'
    ).toContain('onPaginationChange={onPaginationChange}')
  })

  it('tab quy pageIndex về page 1-based trước khi ghi lên URL', () => {
    expect(
      tabSource,
      'thiếu `+ 1` thì trang đầu ghi page=0 và API trả 404 "Invalid page." (bug 86eyp02ev)'
    ).toMatch(/\.set\(\s*'page'\s*,\s*String\(\s*pageIndex\s*\+\s*1\s*\)\s*\)/)
  })

  it('tab không để page=0 trên URL lọt xuống API', () => {
    expect(
      tabSource,
      'URL cũ đã phát tán kèm page=0; phải lọc qua parsePositiveInt để rơi về trang 1'
    ).toMatch(/parsePositiveInt\(searchParams\.get\('page'\)\)\s*\?\?\s*1/)
  })
})
