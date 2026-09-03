import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'

import { EMPTY_MV_REFERENCE } from '@/features/sales/_shared/reconciliation/recon-empty-reference'
import type { ReconMvReference } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { createEmptyInvestorReconciliationSheetItem } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { InvestorReconciliationSheetCreateValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

import AddInvestorReconciliationUnitConfigTable from './AddInvestorReconciliationUnitConfigTable'

function TestWrapper({
  sharedBonusToSaleAmount,
  mv = EMPTY_MV_REFERENCE,
  itemOverrides,
}: {
  sharedBonusToSaleAmount?: number | string | null
  mv?: ReconMvReference
  itemOverrides?: Partial<ReturnType<typeof createEmptyInvestorReconciliationSheetItem>>
}) {
  const item = {
    ...createEmptyInvestorReconciliationSheetItem(),
    shared_bonus_to_sale_pct: 50,
    ...itemOverrides,
  }
  const methods = useForm<InvestorReconciliationSheetCreateValues>({
    defaultValues: { items: [item] } as never,
  })
  return (
    <FormProvider {...methods}>
      <AddInvestorReconciliationUnitConfigTable
        item={item}
        mv={mv}
        sharedBonusToSaleAmount={sharedBonusToSaleAmount}
      />
    </FormProvider>
  )
}

/** Ô "MVL ghi nhận" (cột 2) của dòng có nhãn cho trước. */
function mvCellOf(label: string): HTMLElement {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(label) !== null)
  if (!row) throw new Error(`Không tìm thấy dòng "${label}"`)
  return within(row).getAllByRole('cell')[1]
}

describe('AddInvestorReconciliationUnitConfigTable — dòng "Tiến độ thanh toán thưởng sale/F2 kỳ này"', () => {
  it('hiện số tiền BE tính (shared_bonus_to_sale_amount) dưới ô nhập % khi đang sửa căn đã lưu', () => {
    render(<TestWrapper sharedBonusToSaleAmount={10_000_000} />)
    expect(screen.getByText('= 10.000.000 đ chia về Sale/F2 kỳ này')).toBeInTheDocument()
  })

  it('KHÔNG hiện dòng số tiền khi tạo căn mới (chưa có số BE)', () => {
    render(<TestWrapper sharedBonusToSaleAmount={undefined} />)
    expect(screen.queryByText(/chia về Sale\/F2 kỳ này/)).not.toBeInTheDocument()
  })

  it('KHÔNG hiện dòng số tiền khi shared_bonus_to_sale_amount = 0', () => {
    render(<TestWrapper sharedBonusToSaleAmount={0} />)
    expect(screen.queryByText(/chia về Sale\/F2 kỳ này/)).not.toBeInTheDocument()
  })

  it('KHÔNG hiện dòng số tiền khi BE trả decimal "0" dạng CHUỖI (regression: !!"0" là truthy trong JS)', () => {
    render(<TestWrapper sharedBonusToSaleAmount="0" />)
    expect(screen.queryByText(/chia về Sale\/F2 kỳ này/)).not.toBeInTheDocument()
  })

  it('hiện đúng số tiền khi BE trả decimal dạng CHUỖI khác 0 (khớp response thật của API)', () => {
    render(<TestWrapper sharedBonusToSaleAmount="4000000" />)
    expect(screen.getByText('= 4.000.000 đ chia về Sale/F2 kỳ này')).toBeInTheDocument()
  })
})

/**
 * ClickUp 86eyee86j — HĐPP có thể quy định phí tăng thêm / phí đại lý theo TỶ LỆ thay vì số tiền
 * trọn gói. Cột "MVL ghi nhận" chỉ đọc nhánh ₫ thì cấu hình dạng % biến mất khỏi màn thêm/sửa căn,
 * người nhập không còn mốc nào để đối chiếu. `sharedBonusMv` vốn đã xử lý cả 2 nhánh — 2 dòng còn lại
 * phải theo.
 */
describe('AddInvestorReconciliationUnitConfigTable — cột "MVL ghi nhận" khi HĐPP cấu hình TỶ LỆ', () => {
  it('phí tăng thêm cấu hình % ⇒ hiện "%", không phải "-"', () => {
    render(
      <TestWrapper
        mv={{ ...EMPTY_MV_REFERENCE, pctInvestorBonus: 2, isInvestorBonusIncludeVat: false }}
      />
    )
    expect(mvCellOf('Tổng phí tăng thêm (thỏa thuận)').textContent).toContain('2%')
  })

  it('phí tăng thêm cấu hình ₫ trọn gói ⇒ vẫn hiện số tiền (không hồi quy)', () => {
    render(
      <TestWrapper
        mv={{
          ...EMPTY_MV_REFERENCE,
          amtInvestorBonus: 30_000_000,
          isInvestorBonusIncludeVat: false,
        }}
      />
    )
    expect(mvCellOf('Tổng phí tăng thêm (thỏa thuận)').textContent).toContain('30.000.000')
  })

  it('phí đại lý cấu hình ₫ cố định ⇒ hiện số tiền, không phải "-"', () => {
    render(
      <TestWrapper
        mv={{ ...EMPTY_MV_REFERENCE, amtAgencyFee: 55_000_000, isAgencyFeeIncludeVat: false }}
      />
    )
    expect(mvCellOf('% Hoa hồng (theo HĐPP)').textContent).toContain('55.000.000')
  })
})

/** GAP 4b — ô kiểm tra "Tổng tiền có VAT của dòng (theo bảng kê CĐT)" (cột V của bảng kê). */
describe('AddInvestorReconciliationUnitConfigTable — tổng có VAT của dòng theo bảng kê CĐT', () => {
  const LABEL = 'Tổng tiền có VAT của dòng (theo bảng kê CĐT)'

  it('có ô nhập, và nói rõ bỏ trống là hợp lệ', () => {
    render(<TestWrapper />)

    expect(screen.getByText(LABEL)).toBeInTheDocument()
    expect(
      screen.getByText('Bỏ trống ⇒ không đối chiếu. Có số ⇒ lệch 1 đồng là bị từ chối lưu.')
    ).toBeInTheDocument()
  })

  it('hiện lại con số đang khai trên form', () => {
    render(<TestWrapper itemOverrides={{ total_amount_with_vat: 104_325_237 }} />)

    const row = screen.getAllByRole('row').find((r) => within(r).queryByText(LABEL) !== null)
    expect(within(row as HTMLElement).getByDisplayValue('104.325.237')).toBeInTheDocument()
  })
})

/**
 * GAP 4c — ô TỶ LỆ là giấy nháp. Bảng kê CĐT nêu SỐ TIỀN; nhiều CĐT làm tròn giữa chừng nên tỷ lệ
 * không tái tạo được con số của họ. Hiện số quy đổi cạnh ô để người nhập tự so rồi chép số của CĐT.
 */
describe('AddInvestorReconciliationUnitConfigTable — giấy nháp %→₫ của "Tiến độ đối chiếu đợt này"', () => {
  it('chưa nhập tỷ lệ ⇒ KHÔNG hiện dòng quy đổi (không bịa "0 đ")', () => {
    render(<TestWrapper itemOverrides={{ pct_agency_fee: null, amt_agency_fee: 104_325_237 }} />)

    expect(screen.queryByText(/theo tỷ lệ đang nhập/)).not.toBeInTheDocument()
  })

  it('nhập 50% trên phí trọn căn 104.325.237 ⇒ hiện 52.162.619 (Chamora HĐ 830)', () => {
    render(
      <TestWrapper
        itemOverrides={{
          pct_agency_fee: null,
          amt_agency_fee: 104_325_237,
          pct_period_commission: 50,
        }}
      />
    )

    // `roundReconVnd` là Math.round (nửa LÊN) ⇒ 52.162.618,5 → 52.162.619, trùng số CĐT ghi ở ca
    // này. Dòng gợi ý vẫn cần thiết: lệch xuất hiện khi CĐT làm tròn ở bước trước (xem
    // recon-rate-scratchpad.test.ts).
    expect(screen.getByText(/52\.162\.619 đ theo tỷ lệ đang nhập/)).toBeInTheDocument()
  })

  it('nhãn nói rõ đây chỉ là công cụ đối chiếu, không phải nguồn số', () => {
    render(
      <TestWrapper
        itemOverrides={{
          pct_agency_fee: null,
          amt_agency_fee: 104_325_237,
          pct_period_commission: 50,
        }}
      />
    )

    const hint = screen.getByText(/theo tỷ lệ đang nhập/)
    expect(hint.getAttribute('title')).toContain('hệ thống không lấy số này làm nguồn')
    // Và KHÔNG doạ người dùng mất phần trăm tròn khi nhập bằng số tiền — BE suy ngược và
    // lượng tử hoá về 2 chữ số thập phân.
    expect(hint.getAttribute('title')).toContain('hệ thống vẫn suy ra đúng tỷ lệ')
  })
})
