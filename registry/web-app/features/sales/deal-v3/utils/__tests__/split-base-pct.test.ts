import { describe, it, expect } from 'vitest'
import {
  getBaseCommissionKeys,
  getSplitBasePct,
  isF2Share,
  sumSplitBasePct,
} from '../split-base-pct'

/**
 * CR 86eymaa3v — dòng Tổng của section 5 có thêm "Tổng phí hoa hồng trả sale", và con số
 * đó phải bằng tổng cột "Phí HH trả sale" (tên cũ "HH cơ bản") ngay phía trên, đồng thời
 * bằng cột `total_sales_fee_pct` ở màn danh sách giao dịch.
 *
 * Ba nhầm lẫn file này canh, không cái nào tự lộ ra khi bấm tay:
 *  - lấy nhầm kênh (F2 vs F1) ⇒ đọc sang khoá khác và ra 0 một cách im lặng
 *  - cộng nhầm cả thưởng vào tỷ lệ base
 *  - nhân trọng số participation ⇒ tổng không khớp ô nào trên màn hình
 */

const F1_PCT = 'pct_sale_commission'
const F2_PCT = 'pct_f2_commission'
const F1_BONUS = 'pct_investor_bonus_to_sale'
const F2_BONUS = 'pct_f2_bonus'

const share = (details: Record<string, unknown>, recipient_kind?: string) => ({
  details,
  recipient_kind: recipient_kind ?? null,
})

describe('split-base-pct', () => {
  describe('isF2Share', () => {
    it('nhận diện F2 khi details có khoá F2', () => {
      expect(isF2Share(share({ [F2_PCT]: { percentage: '1.2' } }))).toBe(true)
    })

    it('nhận diện F1 khi details có khoá F1', () => {
      expect(isF2Share(share({ [F1_PCT]: { percentage: '1.5' } }))).toBe(false)
    })

    it('khoá trong details thắng recipient_kind', () => {
      // Một sàn liên kết vẫn có thể được trả qua kênh F1 — nếu suy từ recipient_kind
      // trước thì sẽ đi đọc khoá F2 (không tồn tại) và ra 0.
      const s = share({ [F1_PCT]: { percentage: '1.5' } }, 'f2_exchange')
      expect(isF2Share(s)).toBe(false)
      expect(getSplitBasePct(s)).toBe(1.5)
    })

    it('không có khoá nào thì mới suy từ recipient_kind', () => {
      expect(isF2Share(share({}, 'f2_exchange'))).toBe(true)
      expect(isF2Share(share({}, 'exchange'))).toBe(true)
      expect(isF2Share(share({}, 'f2_agency'))).toBe(true)
      expect(isF2Share(share({}, 'employee'))).toBe(false)
    })

    it('share mang tham chiếu exchange được coi là sàn, dù recipient_kind là gì', () => {
      // `getRecipientIdentity` trả kind 'exchange' cho BẤT KỲ share nào có `exchange`,
      // kể cả `f1_exchange`. Ô của từng dòng đi qua hàm đó; dòng Tổng đọc share thô.
      // Nếu chỗ này chỉ so `recipient_kind` thì hai bên chọn hai cặp khoá base khác nhau
      // cho cùng một share — dòng Tổng lệch khỏi chính các ô nó đang cộng.
      expect(
        isF2Share({ details: {}, recipient_kind: 'f1_exchange', exchange: { id: 1896 } })
      ).toBe(true)
      expect(isF2Share({ details: {}, recipient_kind: null, exchange: { id: 7 } })).toBe(true)
      expect(isF2Share({ details: {}, recipient_kind: 'mv_sale', exchange: null })).toBe(false)
    })
  })

  describe('getBaseCommissionKeys', () => {
    it('trả đúng cặp khoá base theo kênh', () => {
      expect(getBaseCommissionKeys(share({ [F2_PCT]: { percentage: '1' } }))).toEqual([
        'pct_f2_commission',
        'amt_f2_commission',
      ])
      expect(getBaseCommissionKeys(share({ [F1_PCT]: { percentage: '1' } }))).toEqual([
        'pct_sale_commission',
        'amt_sale_commission',
      ])
    })
  })

  describe('getSplitBasePct', () => {
    it('đọc percentage của bản ghi base', () => {
      expect(getSplitBasePct(share({ [F1_PCT]: { percentage: '1.5' } }))).toBe(1.5)
    })

    it('giữ đủ 3 chữ số thập phân', () => {
      // BE nâng percentage lên 3dp từ 2026-08-12 cho tỷ lệ F2.
      expect(getSplitBasePct(share({ [F2_PCT]: { percentage: '0.125' } }))).toBe(0.125)
    })

    it('KHÔNG cộng phần thưởng vào tỷ lệ base', () => {
      const s = share({
        [F1_PCT]: { percentage: '1.5' },
        [F1_BONUS]: { percentage: '9' },
      })
      expect(getSplitBasePct(s)).toBe(1.5)
    })

    it('KHÔNG đọc thưởng F2 như base', () => {
      const s = share({ [F2_PCT]: { percentage: '1.2' }, [F2_BONUS]: { percentage: '7' } })
      expect(getSplitBasePct(s)).toBe(1.2)
    })

    it('rơi về rate khi thiếu percentage', () => {
      // EditableCommissionCell hiển thị `percentage ?? rate`, tổng phải theo đúng thứ tự đó.
      expect(getSplitBasePct(share({ [F1_PCT]: { rate: '2.25', calculated_amount: '10' } }))).toBe(
        2.25
      )
    })

    it('share trả theo số tiền cố định đóng góp 0, không phải NaN', () => {
      // Ô đó hiển thị "—" nên phải cộng 0.
      const s = share({ [F1_PCT]: { percentage: null, fixed_amount: '5000000' } })
      expect(getSplitBasePct(s)).toBe(0)
    })

    it('share không có bản ghi base nào đóng góp 0', () => {
      expect(getSplitBasePct(share({ [F1_BONUS]: { percentage: '9' } }))).toBe(0)
      expect(getSplitBasePct(share({}))).toBe(0)
      expect(getSplitBasePct(null)).toBe(0)
    })

    it('bản ghi bị ghi đè tay thắng, kể cả khi giá trị bằng 0', () => {
      const s = share({
        [F1_PCT]: { percentage: '0', is_custom_override: true },
        [F1_BONUS]: { percentage: '9' },
      })
      expect(getSplitBasePct(s)).toBe(0)
    })
  })

  describe('sumSplitBasePct', () => {
    it('cộng thẳng tỷ lệ của mọi bên tham gia', () => {
      const shares = [
        share({ [F1_PCT]: { percentage: '1.5' } }),
        share({ [F1_PCT]: { percentage: '1.2' } }),
        share({ [F2_PCT]: { percentage: '0.8' } }, 'f2_exchange'),
      ]
      expect(sumSplitBasePct(shares)).toBeCloseTo(3.5, 10)
    })

    it('KHÔNG nhân trọng số participation', () => {
      // Cột hiển thị tỷ lệ đã thoả thuận, không phải tỷ lệ đã chiết theo phần tham gia.
      const shares = [share({ [F1_PCT]: { percentage: '2', participation: '50' } })]
      expect(sumSplitBasePct(shares)).toBe(2)
    })

    it('danh sách rỗng ra 0', () => {
      expect(sumSplitBasePct([])).toBe(0)
    })

    it('bỏ qua share không có base mà không làm hỏng tổng', () => {
      const shares = [
        share({ [F1_PCT]: { percentage: '1.5' } }),
        share({ [F1_BONUS]: { percentage: '9' } }),
        share({}),
      ]
      expect(sumSplitBasePct(shares)).toBe(1.5)
    })
  })
})
