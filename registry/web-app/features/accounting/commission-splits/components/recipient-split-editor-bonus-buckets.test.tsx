import { render, within } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { RecipientSplitEditor } from './RecipientSplitEditor'

/**
 * Modal "Chia thực nhận" phải có MỘT cột tiền cho MỖI loại thưởng.
 *
 * Bản cũ neo đúng một xô thưởng bằng `.find()`, nên một người đứng tên vừa có thưởng chia
 * sẻ CĐT vừa có thưởng chính sách thì chỉ sửa được xô ĐỨNG ĐẦU MẢNG — xô nào sửa được phụ
 * thuộc thứ tự BE trả về — còn xô kia chỉ hiện dải cảnh báo vàng. Bảng đọc thì vẫn cộng cả
 * hai, nên kế toán nhìn thấy tiền mà không chạm tới được.
 */

vi.mock('@/hooks/useCollaboratorSelect', () => ({
  useCollaboratorSelect: () => ({ loadCollaboratorOptions: vi.fn() }),
}))
vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({ loadExchangeOptions: vi.fn() }),
}))

const isCommissionType = (t: string) => t === 'pct_sale_commission' || t === 'pct_f2_commission'

const recipient = (amount: string) => ({
  employee_id: '1',
  collaborator_id: null,
  exchange_id: null,
  recipient_name: 'Sale A',
  amount,
  base_amount: amount,
  bonus_amount: '0',
  pct_of_parent: '100.00',
  hold_amount: '0',
  reason: '',
})

/** Fee + hai xô thưởng khác loại trên cùng một người đứng tên. */
const POSITIONS = [
  {
    posIdx: 0,
    posData: {
      pct_type: 'pct_sale_commission',
      percentage: '2.00',
      participation: '100',
      expected_amount: '88000000',
      recipients: [recipient('88000000')],
    },
  },
  {
    posIdx: 1,
    posData: {
      pct_type: 'pct_investor_bonus_to_sale',
      expected_amount: '12000000',
      recipients: [recipient('12000000')],
    },
  },
  {
    posIdx: 2,
    posData: {
      pct_type: 'staff_incentive',
      expected_amount: '2000000',
      recipients: [recipient('2000000')],
    },
  },
]

function Harness({ positions }: { positions: typeof POSITIONS }) {
  const form = useForm({
    defaultValues: {
      positions: positions.map((p) => ({
        pct_type: p.posData.pct_type,
        recipients: p.posData.recipients,
      })),
    },
  })
  return (
    <RecipientSplitEditor
      positions={positions as never}
      isCommissionType={isCommissionType}
      form={form}
      loadEmployeeOptions={vi.fn()}
      ownerType="employee"
      ownerId={1}
    />
  )
}

const headerTexts = (view: ReturnType<typeof within>) =>
  view.getAllByRole('columnheader').map((th: HTMLElement) => th.textContent?.trim())

describe('RecipientSplitEditor — một cột cho mỗi loại thưởng', () => {
  it('hiện cột riêng cho từng xô thưởng, dùng đúng chữ của bảng đọc', () => {
    const { container } = render(<Harness positions={POSITIONS} />)
    const headers = headerTexts(within(container))

    expect(headers).toContain('Thưởng sale')
    expect(headers).toContain('Thưởng MV')
  })

  it('hai cột thưởng đứng liền nhau, ngay trước "Đã tạm ứng"', () => {
    const { container } = render(<Harness positions={POSITIONS} />)
    const headers = headerTexts(within(container))

    const shared = headers.indexOf('Thưởng sale')
    const policy = headers.indexOf('Thưởng MV')
    expect(policy).toBe(shared + 1)
    expect(headers.indexOf('Đã tạm ứng')).toBe(policy + 1)
  })

  it('mỗi cột thưởng có ô nhập riêng — không còn xô nào ngoài tầm với', () => {
    const view = render(<Harness positions={POSITIONS} />)

    // Kiểm theo GIÁ TRỊ: 12tr của thưởng chia sẻ và 2tr của thưởng chính sách phải cùng
    // xuất hiện ở hai ô NHẬP khác nhau, tức chúng bind vào hai position khác nhau. Nếu
    // vẫn là một xô như bản cũ thì chỉ một trong hai số có mặt.
    const values = view
      .getAllByRole('textbox')
      .map((el) => (el as HTMLInputElement).value.replace(/\D/g, ''))

    expect(values).toContain('12000000')
    expect(values).toContain('2000000')
  })

  it('KHÔNG còn cảnh báo "nhiều hơn 1 khoản" khi chỉ có nhiều loại thưởng', () => {
    const { container } = render(<Harness positions={POSITIONS} />)
    expect(container.textContent).not.toContain('nhiều hơn 1 khoản phí hoặc thưởng')
  })

  it('vẫn cảnh báo khi có nhiều hơn 1 khoản PHÍ (trình sửa chưa gánh được)', () => {
    const twoFees = [
      ...POSITIONS,
      {
        posIdx: 3,
        posData: {
          pct_type: 'pct_f2_commission',
          expected_amount: '5000000',
          recipients: [recipient('5000000')],
        },
      },
    ]
    const { container } = render(<Harness positions={twoFees} />)
    expect(container.textContent).toContain('nhiều hơn 1 khoản phí hoặc thưởng')
  })

  it('nhóm KHÔNG có Thưởng MV vẫn phải hiện cột đó (khớp cột với bảng đọc)', () => {
    // Bảng đọc render <th>Thưởng MV</th> VÔ ĐIỀU KIỆN. Dựng cột thuần theo dữ liệu thì
    // deal không có staff_incentive sẽ mất hẳn cột, mở modal ra thiếu một cột so với bảng
    // ngay trên — đúng lỗi tech lead bắt được 2026-08-06.
    const noIncentive = POSITIONS.slice(0, 2)
    const { container } = render(<Harness positions={noIncentive} />)
    const headers = headerTexts(within(container))

    expect(headers).toContain('Thưởng sale')
    expect(headers).toContain('Thưởng MV')
    expect(headers.indexOf('Thưởng MV')).toBe(headers.indexOf('Thưởng sale') + 1)
  })

  it('nhóm không có xô nào thì cột thưởng vẫn còn, ô hiển thị "—"', () => {
    const feeOnly = POSITIONS.slice(0, 1)
    const view = render(<Harness positions={feeOnly} />)
    const headers = headerTexts(within(view.container))

    expect(headers).toContain('Thưởng sale')
    expect(headers).toContain('Thưởng MV')
    // Không có xô nào để bind ⇒ không sinh thêm ô nhập tiền thưởng nào.
    const money = view.getAllByRole('textbox').map((el) => (el as HTMLInputElement).value)
    expect(money).not.toContain('12000000')
    expect(money).not.toContain('2000000')
  })
})
