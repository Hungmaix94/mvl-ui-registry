import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import DashboardPresetTabs from './DashboardPresetTabs'
import { DASHBOARD_PRESET, SWITCHABLE_PRESETS } from '../../constants/dashboard-blocks'

/**
 * Test này canh đúng một thứ: thanh tab CHỈ có bốn mảng đã chốt với người dùng — Tổng giám đốc,
 * Kế toán, Thư ký, Nhân sự.
 *
 * Vì sao chốt cứng cả nhãn lẫn thứ tự chứ không chỉ đếm số tab: `SWITCHABLE_PRESETS` nằm ngay cạnh
 * `PRESET_BY_ROLE_CODE` trong cùng một file, nên lần thêm vai trò mới rất dễ tiện tay thêm luôn
 * preset vào đây. Chỉ đếm số lượng thì đổi "Kế toán" thành "TPKD" vẫn xanh — mà đó đúng là kiểu
 * hỏng cần chặn.
 */
describe('DashboardPresetTabs — thanh đổi bảng của CEO', () => {
  /**
   * Radix Themes render MỖI nhãn hai lần trong `Tabs.Trigger`: một bản hiện, một bản ẩn để giữ bề
   * ngang khi chữ đậm lên lúc được chọn. Nên `textContent` ra "Kế toánKế toán", và tên trợ năng
   * cũng bị nhân đôi y hệt.
   *
   * Đây là cái bẫy khiến `queryByRole('tab', { name: 'GĐKD' })` LUÔN trả null — assertion phủ định
   * viết kiểu đó là xanh giả, xanh cả khi tab vẫn còn nguyên. Cắt về một nửa rồi mới so.
   */
  const visibleLabel = (el: HTMLElement) => {
    const text = el.textContent ?? ''
    const half = text.slice(0, text.length / 2)
    return half + half === text ? half : text
  }

  const tabLabels = () => screen.getAllByRole('tab').map(visibleLabel)

  it('hiện ĐÚNG bốn tab, đúng thứ tự', () => {
    render(<DashboardPresetTabs value={DASHBOARD_PRESET.EXEC} onChange={vi.fn()} />)

    expect(tabLabels()).toEqual(['Tổng giám đốc', 'Kế toán', 'Thư ký', 'Nhân sự'])
  })

  // Ba preset này vẫn tồn tại và vẫn mở được bằng `?preset=`, chỉ là không còn cửa vào bằng tab.
  it.each(['GĐKD', 'TPKD', 'Tổng hợp'])('KHÔNG còn tab "%s"', (label) => {
    render(<DashboardPresetTabs value={DASHBOARD_PRESET.EXEC} onChange={vi.fn()} />)

    expect(tabLabels()).not.toContain(label)
  })

  it('bấm tab thì báo lên đúng mã preset, không phải nhãn hiển thị', async () => {
    const onChange = vi.fn()
    render(<DashboardPresetTabs value={DASHBOARD_PRESET.EXEC} onChange={onChange} />)

    const secretaryTab = screen.getAllByRole('tab').find((t) => visibleLabel(t) === 'Thư ký')
    await userEvent.click(secretaryTab as HTMLElement)

    expect(onChange).toHaveBeenCalledWith(DASHBOARD_PRESET.PROJECT_SECRETARY)
  })

  it('SWITCHABLE_PRESETS đúng bốn preset đã chốt', () => {
    expect(SWITCHABLE_PRESETS).toEqual([
      DASHBOARD_PRESET.EXEC,
      DASHBOARD_PRESET.ACCOUNTING,
      DASHBOARD_PRESET.PROJECT_SECRETARY,
      DASHBOARD_PRESET.HR,
    ])
  })
})
