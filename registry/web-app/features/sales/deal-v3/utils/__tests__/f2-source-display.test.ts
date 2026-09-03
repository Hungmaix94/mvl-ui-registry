import { describe, expect, it } from 'vitest'

import { getF2SourceDisplay } from '../f2-source-display'

describe('getF2SourceDisplay — nguồn F2 của từng dòng (86eya66m0)', () => {
  it('nguồn Giám đốc kinh doanh thì kèm tên Giám đốc', () => {
    const row = {
      f2_source: 'director',
      f2_source_director_detail: { id: 107, code: 'MV000000013', fullname: 'Nguyễn Việt Hùng' },
    }

    expect(getF2SourceDisplay(row, true)).toBe('Nguồn giám đốc kinh doanh — Nguyễn Việt Hùng')
  })

  it('nguồn Công ty và Sàn liên kết không kèm tên ai', () => {
    expect(getF2SourceDisplay({ f2_source: 'company' }, true)).toBe('Nguồn công ty')
    expect(getF2SourceDisplay({ f2_source: 'linked' }, true)).toBe('Nguồn sàn liên kết')
  })

  it('dòng cũ chưa chọn nguồn đọc là Sàn liên kết, không để trống', () => {
    expect(getF2SourceDisplay({ f2_source: null }, true)).toBe('Nguồn sàn liên kết')
    expect(getF2SourceDisplay({}, true)).toBe('Nguồn sàn liên kết')
  })

  it('dòng không phải F2 (sale MV / CTV / F1 ôm giỏ) không có nguồn để hiện', () => {
    expect(getF2SourceDisplay({ f2_source: 'director' }, false)).toBeNull()
    expect(getF2SourceDisplay(null, true)).toBeNull()
  })

  it('ưu tiên nhãn từ app-constant, rơi về nhãn tĩnh khi chưa tải được', () => {
    const labels = { director: 'GĐKD' }

    expect(getF2SourceDisplay({ f2_source: 'director' }, true, labels)).toBe('GĐKD')
    expect(getF2SourceDisplay({ f2_source: 'company' }, true, labels)).toBe('Nguồn công ty')
  })

  it('nguồn Giám đốc nhưng thiếu tên thì vẫn hiện nhãn, không ra "— undefined"', () => {
    expect(getF2SourceDisplay({ f2_source: 'director' }, true)).toBe('Nguồn giám đốc kinh doanh')
    expect(
      getF2SourceDisplay({ f2_source: 'director', f2_source_director_detail: null }, true)
    ).toBe('Nguồn giám đốc kinh doanh')
  })

  it('thiếu tên đầy đủ thì lấy mã nhân viên thay vì bỏ trống', () => {
    const row = {
      f2_source: 'director',
      f2_source_director_detail: { code: 'MV000000013', fullname: null },
    }

    expect(getF2SourceDisplay(row, true)).toBe('Nguồn giám đốc kinh doanh — MV000000013')
  })
})
