import { describe, expect, it } from 'vitest'
import { formatSalesParticipantsSummary } from './sales-participants-summary'

describe('formatSalesParticipantsSummary', () => {
  it('ghép tên + tỷ lệ theo đúng mẫu PO chốt', () => {
    expect(
      formatSalesParticipantsSummary([
        { name: 'Dương Mạnh Linh', participation_percentage: '60.00' },
        { name: 'Phan Đức Long', participation_percentage: '20.00' },
        { name: 'Lương Như Quỳnh', participation_percentage: '20.00' },
      ])
    ).toBe('Dương Mạnh Linh 60% - Phan Đức Long 20% - Lương Như Quỳnh 20%')
  })

  it('deal F2 ra tên sàn kèm tỷ lệ — đúng phần cột "Đại lý" cũ hiển thị', () => {
    expect(
      formatSalesParticipantsSummary([
        { name: 'Sàn Đất Xanh Miền Bắc', participation_percentage: '100.00' },
      ])
    ).toBe('Sàn Đất Xanh Miền Bắc 100%')
  })

  it('giữ số lẻ khi tỷ lệ không tròn, và cắt đuôi 0 khi tròn', () => {
    expect(
      formatSalesParticipantsSummary([
        { name: 'Sale A', participation_percentage: '33.33' },
        { name: 'Sale B', participation_percentage: '66.67' },
      ])
    ).toBe('Sale A 33,33% - Sale B 66,67%')
  })

  it('nhận cả số lẫn chuỗi cho tỷ lệ', () => {
    expect(formatSalesParticipantsSummary([{ name: 'Sale A', participation_percentage: 70 }])).toBe(
      'Sale A 70%'
    )
  })

  it('thiếu tỷ lệ thì chỉ hiện tên — "Sale A 0%" sẽ bị đọc nhầm là không tham gia', () => {
    expect(
      formatSalesParticipantsSummary([{ name: 'Sale A', participation_percentage: null }])
    ).toBe('Sale A')
  })

  it('bỏ qua dòng không có tên thay vì render mảnh " 10%" trơ trọi', () => {
    expect(
      formatSalesParticipantsSummary([
        { name: 'Sale A', participation_percentage: '90.00' },
        { name: '   ', participation_percentage: '10.00' },
        { name: null, participation_percentage: '10.00' },
      ])
    ).toBe('Sale A 90%')
  })

  it('trả chuỗi rỗng khi không có dữ liệu — nơi gọi tự quyết fallback "-"', () => {
    expect(formatSalesParticipantsSummary([])).toBe('')
    expect(formatSalesParticipantsSummary(undefined)).toBe('')
    expect(formatSalesParticipantsSummary(null)).toBe('')
  })
})
