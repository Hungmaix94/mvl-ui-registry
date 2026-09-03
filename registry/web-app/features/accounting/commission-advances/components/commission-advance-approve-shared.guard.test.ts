import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Canh cho luật: **hộp thoại duyệt phải là MỘT component dùng chung**, không phải hai bản chép
 * tay ở hai màn.
 *
 * Vì sao cần test này chứ không chỉ một dòng trong `docs/ai`: đúng lỗi đó đã xảy ra và phải chờ
 * BA phát hiện (ClickUp 86eympqft, 19/08). Dialog nằm inline trong màn Chi tiết, nên duyệt nhanh
 * ngoài màn Danh sách chỉ có hộp xác nhận trơn và gửi `data: {}` — mất cả số tiền duyệt từng
 * người lẫn nguồn tiền, im lặng, trong khi hai màn nhìn qua đều "có nút Duyệt". Không ai đọc lại
 * conventions giữa lúc thêm một `AppDialog`; thứ chặn được là một test đỏ.
 */

const SRC = resolve(__dirname, '../../../..')

const PAGES = {
  'màn Chi tiết':
    'pages/authenticated/accounting/commission-advances/CommissionAdvanceDetailPage.tsx',
  'màn Danh sách':
    'pages/authenticated/accounting/commission-advances/CommissionAdvanceListPage.tsx',
} as const

function readPage(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf8')
}

describe('duyệt tạm ứng — một dialog dùng chung cho cả hai màn', () => {
  for (const [screenName, path] of Object.entries(PAGES)) {
    it(`${screenName} render CommissionAdvanceApproveDialog cho cả 2 bậc duyệt có sửa số tiền`, () => {
      const source = readPage(path)

      expect(source).toContain('<CommissionAdvanceApproveDialog')
      // Cả hai bậc phải đi qua dialog chung, không chỉ bậc kế toán.
      expect(source).toMatch(
        /open=\{actionType === 'ADMIN_LEAD_APPROVE' \|\| actionType === 'APPROVE'\}/
      )
    })

    it(`${screenName} KHÔNG tự dựng lại phần thân của dialog duyệt`, () => {
      const source = readPage(path)

      // Ba mốc chỉ tồn tại trong thân dialog duyệt. Xuất hiện lại ở page nghĩa là ai đó vừa
      // chép ngược vào, và hai màn sẽ trôi khỏi nhau lần nữa.
      expect(source).not.toContain('Thuế suất tạm tính')
      expect(source).not.toContain('Tối đa có thể ứng sau thuế')
      expect(source).not.toContain('advance-funding-source')
    })

    it(`${screenName} KHÔNG tự gọi thẳng approve/admin-lead-approve nữa`, () => {
      const source = readPage(path)

      // Gọi thẳng mutation ở page là đường cũ dẫn tới `data: {}` — payload rỗng, mất số tiền
      // duyệt và nguồn tiền. Chỉ dialog chung được phép gọi hai mutation này.
      expect(source).not.toContain('useApproveCommissionAdvance')
      expect(source).not.toContain('useAdminLeadApproveCommissionAdvance')
    })
  }

  it('tên người thụ hưởng lấy từ một util dùng chung, không chép tay ở page', () => {
    for (const path of Object.values(PAGES)) {
      const source = readPage(path)
      // `Dòng #` là nhánh cuối của `getRecipientName`; còn sót ở page nghĩa là còn một bản chép.
      expect(source).not.toContain('`Dòng #')
    }
  })
})
