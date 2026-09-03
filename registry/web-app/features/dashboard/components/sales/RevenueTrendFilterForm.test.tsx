import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RevenueTrendFilterForm, {
  DEFAULT_REVENUE_TREND_FILTER_VALUES,
  type RevenueTrendFilterFormRef,
} from './RevenueTrendFilterForm'
import { DashboardPerformanceGroup as TimeGroup } from '@/constants/api-schema-aliases'

/** Dựng form và trả về ref — KHÔNG phải render result, nên không đặt tên `render*`. */
const mountForm = () => {
  const ref = createRef<RevenueTrendFilterFormRef>()
  render(<RevenueTrendFilterForm ref={ref} />)
  return ref
}

describe('RevenueTrendFilterForm — nhãn ô ngày nói ra căn cứ tính', () => {
  // Phản hồi người dùng 2026-08-26: dialog có HAI ô khoảng ngày, ô TTGD thì rõ, ô còn lại
  // tên chung chung thì đọc xong vẫn không biết nó lọc theo ngày nào. Cùng chữ với ba màn
  // kia để bốn màn đọc như một.
  it('ô ngày cọc nêu rõ căn cứ, không còn tên chung chung "Khoảng thời gian"', () => {
    mountForm()

    expect(screen.getByText('Thời gian (tính theo ngày cọc)')).toBeTruthy()
    expect(screen.queryByText('Khoảng thời gian')).toBeNull()
  })

  it('có ô ngày làm phiếu TTGD bên cạnh', () => {
    mountForm()

    expect(screen.getByText('Ngày làm phiếu TTGD')).toBeTruthy()
  })

  it('ô cách nhóm có nhãn hẳn hoi — trước đây nó là một `Select` trần trên thanh tiêu đề', () => {
    mountForm()

    expect(screen.getByText('Nhóm theo thời gian')).toBeTruthy()
  })
})

describe('RevenueTrendFilterForm — giá trị mặc định', () => {
  it('mặc định nhóm theo THÁNG, hai ô ngày để trống', () => {
    expect(DEFAULT_REVENUE_TREND_FILTER_VALUES).toEqual({
      dateRange: null,
      transactionSheetDateRange: null,
      timeGroup: TimeGroup.month,
    })
  })

  it('`clearForm` đưa cách nhóm về THÁNG chứ không bỏ trống — endpoint bắt buộc có `group`', () => {
    const ref = mountForm()

    ref.current?.clearForm()

    expect(ref.current?.getValues().timeGroup).toBe(TimeGroup.month)
  })
})
