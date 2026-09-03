import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import RealtimeButton from './RealtimeButton'

/**
 * `RealtimeButton` được DÙNG CHUNG bởi ba lưới: HRM và đối tác (cắt "99+") và Sales (không cắt).
 *
 * Nửa quan trọng của bộ test này là nhánh MẶC ĐỊNH: prop `maxCount` thêm vào cho lưới Sales không
 * được phép làm xê dịch hành vi của hai lưới còn lại — chúng không truyền prop đó, nên chúng phải
 * hiện đúng những gì chúng hiện trước đây.
 */
const renderButton = (props: Partial<React.ComponentProps<typeof RealtimeButton>> = {}) =>
  render(<RealtimeButton icon={<span />} label="Ô đếm" count={5} {...props} />)

const badge = () => screen.getByTestId('realtime-button-badge')

describe('RealtimeButton — nhánh mặc định (lưới HRM + đối tác), không đổi so với trước', () => {
  it('cắt ở "99+" khi vượt ngưỡng', () => {
    renderButton({ count: 214 })
    expect(badge()).toHaveTextContent('99+')
  })

  it('hiện đúng số khi chưa vượt ngưỡng', () => {
    renderButton({ count: 99 })
    expect(badge()).toHaveTextContent('99')
  })

  it('giữ hộp badge rộng cố định 25px', () => {
    renderButton({ count: 42 })
    expect(badge()).toHaveClass('w-[25px]')
  })

  it('không vẽ badge khi số bằng 0', () => {
    renderButton({ count: 0 })
    expect(screen.queryByTestId('realtime-button-badge')).not.toBeInTheDocument()
  })
})

describe('RealtimeButton — nhánh không cắt số (lưới Sales, maxCount={null})', () => {
  it('hiện đủ số hàng trăm thay vì "99+"', () => {
    renderButton({ count: 214, maxCount: null })

    expect(badge()).toHaveTextContent('214')
    expect(screen.queryByText('99+')).not.toBeInTheDocument()
  })

  /**
   * Bề rộng cố định 25px vừa đúng hai chữ số. Không đổi sang bề rộng co giãn thì "214" tràn ra
   * ngoài viên pill — số vẫn đọc được nên test theo text vẫn xanh, còn mắt người thì thấy lỗi.
   */
  it('đổi badge sang bề rộng co giãn để số dài không tràn khỏi viên pill', () => {
    renderButton({ count: 214, maxCount: null })

    expect(badge()).not.toHaveClass('w-[25px]')
    expect(badge()).toHaveClass('min-w-[25px]')
  })

  it('vẫn không vẽ badge khi số bằng 0', () => {
    renderButton({ count: 0, maxCount: null })
    expect(screen.queryByTestId('realtime-button-badge')).not.toBeInTheDocument()
  })
})

describe('RealtimeButton — tương tác', () => {
  it('gọi onClick khi bấm vào ô', () => {
    const onClick = vi.fn()
    renderButton({ onClick })

    fireEvent.click(screen.getByText('Ô đếm'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
