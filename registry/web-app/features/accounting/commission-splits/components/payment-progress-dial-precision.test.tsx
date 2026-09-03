// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'

// Chỉ test DialRow + 2 helper thuần. Module cha kéo theo service/store (BaseApiService
// vòng import) nên stub cho gọn — mạng không nằm trong phạm vi test này.
vi.mock('../services/commission-splits-service', () => ({
  useSetPeriodProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { DialRow, formatCapPct, precisionEq } from './PaymentProgressTimeline'

/** BE lưu % tới numeric(14,10) — con số này là cap thật của một căn có thật. */
const CAP_10DP = 21.8181818182

/** Wrapper giữ state y như CommissionSplitDetailInfo giữ localFeePct. */
const Harness = ({ max = 100, initial = CAP_10DP }: { max?: number; initial?: number }) => {
  const [value, setValue] = useState(initial)
  return (
    <>
      <DialRow label="% TT phí" color="#000" value={value} max={max} onChange={setValue} />
      {/* Đây là con số sẽ đi vào payload set-period-progress. */}
      <span data-testid="payload">{String(value)}</span>
    </>
  )
}

const dial = () => screen.getByRole('spinbutton') as HTMLInputElement
const payload = () => screen.getByTestId('payload').textContent

describe('DialRow — CẮT xuống 2dp nhưng state/payload giữ 10dp', () => {
  it('lúc nghỉ: hiện bản cắt 2dp, state vẫn là 10dp', () => {
    render(<Harness />)
    // CẮT chứ không làm tròn, và đây chính là con số `formatCapPct` in ra ngay bên cạnh
    // ("Tối đa 21,81%"). Bản half-up cũ hiện 21.82 — cao hơn trần thật, nên kế toán gõ
    // đúng số ô đang quảng cáo lại bị clamp ngầm. Cùng lỗi với cột "% TT phí kỳ này" hiện
    // 35% trong khi Mục 2 hiện 34,99% cho cùng một giá trị.
    expect(dial().value).toBe('21.81')
    expect(payload()).toBe('21.8181818182')
  })

  it('đang gõ: KHÔNG ghi đè chữ số thập phân thứ 3 của user', () => {
    render(<Harness />)
    fireEvent.change(dial(), { target: { value: '21.826' } })
    // Regression: bind thẳng value={Math.round(v*100)/100} thì ô này bị React ghi đè
    // về "21.83" trong khi payload vẫn là 21.826 — nhìn một đằng lưu một nẻo.
    expect(dial().value).toBe('21.826')
    expect(payload()).toBe('21.826')
  })

  it('gõ xong blur: quay lại bản cắt 2dp, giá trị vừa gõ không bị mất', () => {
    render(<Harness />)
    fireEvent.change(dial(), { target: { value: '21.826' } })
    fireEvent.blur(dial())
    expect(dial().value).toBe('21.82')
    expect(payload()).toBe('21.826')
  })

  it('gõ dở "21." không bị nhảy về 0', () => {
    render(<Harness />)
    fireEvent.change(dial(), { target: { value: '21.' } })
    // input[type=number] chuẩn hoá số dở dang thành '' ở IDL `.value` (browser vẫn hiện
    // "21." trong ô). Điểm cần khoá: React KHÔNG được ghi đè gì vào ô lúc này.
    // Regression: binding cũ value={Math.round(v*100)/100} ra 0, trúng nhánh
    // `value === 0 && node.value === ''` của React ⇒ ô bị đè thành "0" giữa lúc đang gõ.
    expect(dial().value).toBe('')
    expect(dial().value).not.toBe('0')
  })

  it('clamp về max khi gõ quá trần', () => {
    render(<Harness max={CAP_10DP} />)
    fireEvent.change(dial(), { target: { value: '99' } })
    expect(payload()).toBe(String(CAP_10DP))
  })

  it('blur gọi onBlur (auto-save) đúng một lần', () => {
    const onBlur = vi.fn()
    render(
      <DialRow
        label="% TT phí"
        color="#000"
        value={CAP_10DP}
        max={100}
        onChange={vi.fn()}
        onBlur={onBlur}
      />
    )
    fireEvent.blur(dial())
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('readOnly: khoá input cho role chỉ xem', () => {
    render(
      <DialRow
        label="% TT phí"
        color="#000"
        value={CAP_10DP}
        max={100}
        onChange={vi.fn()}
        readOnly
      />
    )
    expect(dial()).toHaveProperty('readOnly', true)
  })
})

describe('precisionEq — gõ lại đúng con số 2dp đang hiển thị không tính là đổi', () => {
  it('bản CẮT 2dp của cap 10dp được coi là không đổi', () => {
    // Phải bám theo đúng phép mà ô input dùng để hiển thị. Từ khi ô cắt thay vì làm tròn,
    // con số user nhìn thấy là 21,81 — nếu precisionEq vẫn neo vào 21,82 thì cú gõ lại
    // 21,81 bị tính là chỉnh sửa và 10dp của BE bị ghi đè bằng bản đã cắt.
    expect(precisionEq(21.81, CAP_10DP)).toBe(true)
  })

  it('số cũ half-up (21,82) KHÔNG còn là "không đổi" — ô có bao giờ hiện nó đâu', () => {
    expect(precisionEq(21.82, CAP_10DP)).toBe(false)
  })

  it('chỉnh thật thì tính là đổi', () => {
    expect(precisionEq(21.5, CAP_10DP)).toBe(false)
  })

  it('null vs số = đổi (chưa chốt → chốt)', () => {
    expect(precisionEq(null, CAP_10DP)).toBe(false)
    expect(precisionEq(null, null)).toBe(true)
  })
})

describe('formatCapPct — trần phải floor, không half-up', () => {
  it('không quảng cáo trần cao hơn trần thật', () => {
    // half-up sẽ ra "21,82%" > cap thật ⇒ user gõ đúng số đó lại bị clamp im lặng.
    expect(formatCapPct(CAP_10DP)).toBe('21,81%')
  })

  it('null → em dash', () => {
    expect(formatCapPct(null)).toBe('—')
  })
})
