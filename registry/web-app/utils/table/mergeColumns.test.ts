/**
 * `mergeColumns` — gộp cấu hình cột đã lưu của người dùng với defaults hiện tại.
 *
 * Test sinh ra từ lỗi thật của CR STT17 (`86eydbph4`): thêm 7 cột vào GIỮA bảng "Giao dịch tiền
 * về đợt này" thì người dùng đã lưu config thấy cột mới đan xen vào đuôi bảng, và 4 cột đổi tên
 * vẫn hiện nhãn cũ trong dialog cấu hình.
 */
import { describe, expect, it } from 'vitest'

import { mergeColumns } from './mergeColumns'
import type { ColumnConfig } from '@/types/table'

const cols = (ids: string[], labelSuffix = ''): ColumnConfig[] =>
  ids.map((id, order) => ({ id, label: `${id}${labelSuffix}`, visible: true, order }))

describe('mergeColumns', () => {
  it('giữ nguyên thứ tự và visible người dùng đã sắp khi không có cột mới', () => {
    const defaults = cols(['a', 'b', 'c'])
    const stored: ColumnConfig[] = [
      { id: 'c', label: 'c', visible: false, order: 0 },
      { id: 'a', label: 'a', visible: true, order: 1 },
      { id: 'b', label: 'b', visible: true, order: 2 },
    ]

    const merged = mergeColumns(defaults, stored)

    expect(merged.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(merged.map((c) => c.order)).toEqual([0, 1, 2])
    expect(merged.find((c) => c.id === 'c')?.visible).toBe(false)
  })

  it('chèn cột mới ngay sau hàng xóm phía trước của nó, KHÔNG đan xen vào đuôi bảng', () => {
    // Bảng cũ 4 cột, bản mới chèn 2 cột vào giữa `total` và `invoice`.
    const defaults = cols(['code', 'total', 'new1', 'new2', 'invoice', 'status'])
    const stored = cols(['code', 'total', 'invoice', 'status'])

    const merged = mergeColumns(defaults, stored)

    expect(merged.map((c) => c.id)).toEqual(['code', 'total', 'new1', 'new2', 'invoice', 'status'])
    expect(merged.map((c) => c.order)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('chèn cột mới ở đầu bảng khi nó không có hàng xóm phía trước', () => {
    const defaults = cols(['brandNew', 'a', 'b'])
    const stored = cols(['a', 'b'])

    expect(mergeColumns(defaults, stored).map((c) => c.id)).toEqual(['brandNew', 'a', 'b'])
  })

  it('lấy nhãn từ defaults để cột đổi tên không kẹt nhãn cũ trong bản đã lưu', () => {
    const defaults: ColumnConfig[] = [
      { id: 'fee_pct', label: 'Phí DT (%)', visible: true, order: 0 },
    ]
    const stored: ColumnConfig[] = [{ id: 'fee_pct', label: 'Phí đại lý', visible: true, order: 0 }]

    expect(mergeColumns(defaults, stored)[0].label).toBe('Phí DT (%)')
  })

  it('bỏ cột đã lưu nhưng không còn trong defaults', () => {
    const defaults = cols(['a', 'b'])
    const stored = cols(['a', 'removed', 'b'])

    expect(mergeColumns(defaults, stored).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('người dùng đã sắp lại + có cột mới: giữ thứ tự người dùng, cột mới bám hàng xóm defaults', () => {
    const defaults = cols(['a', 'b', 'newAfterB', 'c'])
    const stored: ColumnConfig[] = [
      { id: 'c', label: 'c', visible: true, order: 0 },
      { id: 'b', label: 'b', visible: true, order: 1 },
      { id: 'a', label: 'a', visible: true, order: 2 },
    ]

    expect(mergeColumns(defaults, stored).map((c) => c.id)).toEqual(['c', 'b', 'newAfterB', 'a'])
  })
})
