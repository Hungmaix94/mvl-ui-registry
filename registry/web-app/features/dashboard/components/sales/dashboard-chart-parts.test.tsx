import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildNiceAxis, buildNiceCountAxis, HorizontalAxisRuler } from './dashboard-chart-parts'

const lastTick = (ticks: number[]) => ticks[ticks.length - 1]

/**
 * `buildNiceCountAxis` sinh ra vì biểu đồ "Hiệu suất theo tổ chức" có trục X thứ hai đo SỐ
 * GIAO DỊCH. Dùng lại `buildNiceAxis` (trục tiền) ở đó là sai đơn vị chứ không phải xấu:
 * nửa giao dịch không tồn tại, mà thước lại in ra nó.
 */
describe('buildNiceCountAxis — trục của một đại lượng ĐẾM', () => {
  it('KHÔNG bao giờ chia ra vạch lẻ, kể cả ở đúng ca mà trục tiền chia 2,5', () => {
    // Ca đối chứng: 9 rơi vào nhánh 2,5 của `buildNiceAxis`. Giữ khẳng định này ở đây để nếu
    // ai đó nhập hai hàm làm một thì test gãy ngay, chứ không âm thầm in "2,5 giao dịch".
    expect(buildNiceAxis(9).ticks).toContain(2.5)
    expect(buildNiceCountAxis(9).ticks.every(Number.isInteger)).toBe(true)
  })

  it('cả bộ lọc chỉ có 1 giao dịch thì vẫn là 0 và 1, không phải 0 · 0,25 · 0,5 …', () => {
    // Đây là ca `buildNiceAxis` cho bước 0,25: số mũ của `magnitude` xuống ÂM.
    expect(buildNiceAxis(1).ticks).toContain(0.25)
    expect(buildNiceCountAxis(1)).toEqual({ max: 1, ticks: [0, 1] })
  })

  it('tập rỗng vẫn phải có bề rộng — `max = 0` là mọi toạ độ chia cho 0 thành NaN', () => {
    expect(buildNiceCountAxis(0)).toEqual({ max: 1, ticks: [0, 1] })
    expect(buildNiceCountAxis(Number.NaN)).toEqual({ max: 1, ticks: [0, 1] })
    expect(buildNiceCountAxis(-5)).toEqual({ max: 1, ticks: [0, 1] })
  })

  it('đỉnh trục luôn phủ hết giá trị lớn nhất, và vạch cuối đúng bằng đỉnh', () => {
    // Không có vòng phủ này thì điểm lớn nhất của đường dính sát mép phải vùng vẽ và bị
    // `VALUE_LABEL_GUTTER` che mất một nửa cái chấm.
    for (const maxValue of [1, 2, 3, 7, 9, 12, 37, 120, 999]) {
      const axis = buildNiceCountAxis(maxValue)

      expect(axis.max).toBeGreaterThanOrEqual(maxValue)
      expect(lastTick(axis.ticks)).toBe(axis.max)
      expect(axis.ticks[0]).toBe(0)
      expect(axis.ticks.every(Number.isInteger)).toBe(true)
      // Bước < 1 sẽ làm hai vạch cạnh nhau in ra cùng một con số sau khi làm tròn.
      expect(new Set(axis.ticks).size).toBe(axis.ticks.length)
    }
  })
})

describe('HorizontalAxisRuler — hai thước xếp chồng', () => {
  it('mặc định in tiền rút gọn, nhưng nhận được cách định dạng khác cho trục đếm', () => {
    render(
      <>
        <HorizontalAxisRuler
          ticks={[0, 1_000_000_000]}
          max={1_000_000_000}
          leftGutter={12}
          rightGutter={88}
          testId="money"
        />
        <HorizontalAxisRuler
          ticks={[0, 40]}
          max={40}
          leftGutter={12}
          rightGutter={88}
          formatTick={String}
          testId="count"
        />
      </>
    )

    // Trục đếm mà lọt vào nhánh mặc định thì "40" hoá "40" — nhưng 40 triệu giao dịch sẽ ra
    // "40 tr". Khẳng định trên số tiền để bắt đúng cái nhánh đang chạy.
    expect(screen.getByTestId('money').textContent).toContain('1 tỷ')
    expect(screen.getByTestId('count').textContent).toContain('40')
    expect(screen.getByTestId('count').textContent).not.toContain('tr')
  })

  it('có `testId` thì hai thước phân biệt được — không thì test bám nhầm thước', () => {
    render(
      <HorizontalAxisRuler ticks={[0, 10]} max={10} leftGutter={12} rightGutter={88} testId="a" />
    )

    expect(screen.getByTestId('a')).toBeInTheDocument()
  })
})
