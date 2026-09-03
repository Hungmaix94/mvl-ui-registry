import { describe, it, expect } from 'vitest'
import { getLadEventTitle, buildLadDetailPath } from './lad-event'

describe('getLadEventTitle', () => {
  it('ưu tiên tên lô LAD hơn mọi nhãn kỹ thuật', () => {
    expect(
      getLadEventTitle({
        source: 'bulk_retro',
        batch_code: 'LAD-2026-0020',
        batch_name: 'Điều chỉnh phí căn ngoại giao SOL1',
        reason: 'Căn SOL1-LK26-16 ngoại giao chỉ dc 50% phí',
      })
    ).toBe('Điều chỉnh phí căn ngoại giao SOL1')
  })

  it('rơi về lý do khi lô chưa được đặt tên', () => {
    expect(
      getLadEventTitle({
        source: 'bulk_retro',
        batch_code: 'LAD-2026-0020',
        batch_name: '   ',
        reason: 'Căn SOL1-LK26-16 ngoại giao chỉ dc 50% phí',
      })
    ).toBe('Căn SOL1-LK26-16 ngoại giao chỉ dc 50% phí')
  })

  it('rơi về mã lô khi không có cả tên lẫn lý do', () => {
    expect(getLadEventTitle({ source: 'bulk_retro', batch_code: 'LAD-2026-0020' })).toBe(
      'Lô áp dụng LAD-2026-0020'
    )
    expect(getLadEventTitle({ source: 'reconciliation', batch_code: 'DC-2026-0007' })).toBe(
      'Phiếu đối chiếu CĐT DC-2026-0007'
    )
  })

  it('bản ghi khởi tạo luôn giữ nhãn cố định, không mượn tên lô', () => {
    expect(getLadEventTitle({ source: 'creation', batch_name: 'Không liên quan' })).toBe(
      'Khởi tạo từ Hợp đồng môi giới gốc'
    )
  })

  it('nguồn manual dùng name rồi tới số phiên bản', () => {
    expect(getLadEventTitle({ source: 'manual', name: 'Sửa tay phí', version_number: 5 })).toBe(
      'Sửa tay phí'
    )
    expect(getLadEventTitle({ source: 'manual', version_number: 5 })).toBe(
      'Cập nhật cấu hình phiên bản #5'
    )
  })

  it('trả về gạch ngang khi không có config', () => {
    expect(getLadEventTitle(null)).toBe('—')
  })
})

describe('buildLadDetailPath', () => {
  it('dựng link tới sub-view chi tiết LAD trong tab của Sale Allocation', () => {
    expect(buildLadDetailPath({ batch_id: 12, batch_sales_allocation_id: 34 })).toBe(
      '/project-admin/project/sale-allocation/34?tab=lad&lad_view=detail&batch_id=12'
    )
  })

  it('không dựng link khi thiếu id lô hoặc id SA', () => {
    expect(buildLadDetailPath({ batch_id: 12 })).toBeNull()
    expect(buildLadDetailPath({ batch_sales_allocation_id: 34 })).toBeNull()
    expect(buildLadDetailPath(null)).toBeNull()
  })
})
