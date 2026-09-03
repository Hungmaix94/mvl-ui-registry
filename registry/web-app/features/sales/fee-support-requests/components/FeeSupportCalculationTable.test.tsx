import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn — `LadStep1Scope.test.tsx` cũng chết vì nó).
// Chặn tại đây thay vì sửa setup dùng chung.
vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))

import type {
  FeeSupportCalculation,
  FeeSupportCalculationRow,
} from '../services/fee-support-request-service'

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'

import FeeSupportCalculationTable from './FeeSupportCalculationTable'

/**
 * Sao kê là màn read-only nhưng là số tiền TKKD dùng để quyết duyệt, nên test khoá đúng
 * hai thứ FE chịu trách nhiệm: ĐỊNH DẠNG (locale VN, decimal thô của BE) và PHÂN NHÁNH
 * hiển thị (null ≠ 0, warning chặn bảng). Không test lại phép tính — BE là nguồn số.
 *
 * Fixture ép kiểu MỘT lần tại ranh giới test thay vì rải `as` vào component.
 */
const row = (
  amount: string | null,
  pct_effective: string | null = null,
  extra: Partial<FeeSupportCalculationRow> = {}
): FeeSupportCalculationRow => ({
  amount,
  pct_effective,
  pct_config: null,
  includes_vat: null,
  ...extra,
})

function makeCalculation(overrides: Record<string, unknown> = {}): FeeSupportCalculation {
  return {
    source: 'deal_config',
    fee_calculation_price: '2000000000',
    commission_fee_calculation_price: '2000000000',
    vat_rate: '10.00',
    inflow: {
      rows: {
        agency_fee: row('54600000', '2.73', { pct_config: '3.00', includes_vat: true }),
        investor_bonus: row(null),
        shared_bonus: row(null),
      },
      total: '54600000',
      total_pct_effective: '2.73',
    },
    outflow: {
      rows: {
        sale: row('30000000', '1.50'),
        f2: row(null),
        management: row(null),
        promotion: row(null),
        deduction: row(null),
      },
      total: '30000000',
      total_pct_effective: '1.50',
      is_actual: true,
    },
    request: {
      sale_regulated: row('30000000', '1.50'),
      bonus_regulated: row(null),
      support: row('10000000', '0.50'),
      support_total: row('10000000', '0.50'),
      sale_total: row('40000000', '2.00'),
      customer_cut: row(null),
      sale_net: row('40000000', '2.00'),
      bonus_support: row('0'),
      is_applied: false,
    },
    remainder: {
      // BE vẫn trả đủ nhánh `remainder`; từ CR 86eyhjjug FE chỉ render `mv_remaining`
      // trong bảng phẳng, 4 dòng còn lại không có bề mặt nào nữa.
      mv_remaining: row('14600000', '0.73'),
      after_sale_f2_before: row('24600000', '1.23'),
      after_sale_f2_after: row('14600000', '0.73'),
      final_before: row('24600000', '1.23'),
      final_after: row('14600000', '0.73'),
    },
    warnings: [],
    ...overrides,
  } as FeeSupportCalculation
}

/**
 * Đọc phần text ngay SAU nhãn của một dòng sao kê. Cố tình không leo DOM
 * (`parentElement`/`closest`): eslint testing-library cấm node access, và bám cấu
 * trúc DOM khiến test vỡ mỗi lần đổi layout.
 */
const rowTextOf = (label: string): string => {
  const body = screen.getAllByText(label)[0].ownerDocument.body.textContent ?? ''
  const start = body.indexOf(label) + label.length
  return body.slice(start, start + 40)
}

/**
 * Bảng phẳng dùng `<Table>` dùng chung, component này gọi `useSidebar()` nên phải
 * có `SidebarProvider` bọc ngoài — cùng cách `PartnerDebtReportTable.test.tsx` làm.
 */
const renderTable = (calculation: FeeSupportCalculation | null) =>
  render(
    <SidebarProvider>
      <FeeSupportCalculationTable calculation={calculation} />
    </SidebarProvider>
  )

describe('FeeSupportCalculationTable', () => {
  it('không render gì khi chưa có sao kê', () => {
    renderTable(null)
    expect(screen.queryByText('Sao kê hỗ trợ phí')).not.toBeInTheDocument()
  })

  it('render % theo locale VN thay vì decimal thô của BE', () => {
    renderTable(makeCalculation())

    // BE trả "2.73" — render nguyên chuỗi sẽ ra "2.73%" (sai locale, VN dùng dấu phẩy).
    expect(screen.getAllByText('2,73%').length).toBeGreaterThan(0)
    expect(screen.queryByText('2.73%')).not.toBeInTheDocument()

    // "3.00" là rate cấu hình → "3%", không phải "3.00%".
    expect(screen.getByText('Cấu hình 3%')).toBeInTheDocument()
  })

  it('render tiền theo locale VN', () => {
    renderTable(makeCalculation())

    expect(screen.getAllByText('54.600.000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2.000.000.000').length).toBeGreaterThan(0)
  })

  it('phân biệt amount null (— ) với 0 đồng', () => {
    renderTable(
      makeCalculation({
        inflow: {
          rows: {
            agency_fee: row(null),
            investor_bonus: row('0', '0'),
            shared_bonus: row(null),
          },
          total: null,
        },
      })
    )

    // agency_fee null → "—"; thưởng gộp ra 0 đồng → "0" (không được gộp làm một).
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
  })

  it('ẩn các khối số khi BE báo no_fee_price', () => {
    renderTable(
      makeCalculation({
        warnings: [{ code: 'no_fee_price', amount: null }],
      })
    )

    expect(
      screen.getByText('Giao dịch chưa có giá tính phí nên chưa lập được sao kê.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Giá tính phí')).not.toBeInTheDocument()
    expect(screen.queryByText('Phí đại lý còn lại (MV)')).not.toBeInTheDocument()
  })

  it('không kèm số tiền vào cảnh báo khi amount là 0', () => {
    renderTable(
      makeCalculation({
        warnings: [{ code: 'negative_remainder', amount: '0' }],
      })
    )

    // "0" là chuỗi truthy — nếu check bằng truthiness sẽ hiện "(0)" vô nghĩa.
    expect(screen.getByText('Sau khi hỗ trợ, phần còn lại của công ty bị âm.')).toBeInTheDocument()
    expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument()
  })

  it('render nhiều cảnh báo trùng code mà không mất dòng nào', () => {
    renderTable(
      makeCalculation({
        warnings: [
          { code: 'negative_remainder', amount: '-5000000' },
          { code: 'negative_remainder', amount: '-3000000' },
        ],
      })
    )

    expect(screen.getAllByText(/phần còn lại của công ty bị âm/)).toHaveLength(2)
  })

  it('hiện code thô có tiền tố khi BE thêm mã cảnh báo mới', () => {
    renderTable(
      makeCalculation({
        warnings: [{ code: 'brand_new_code', amount: null }],
      })
    )

    expect(screen.getByText('Cảnh báo: brand_new_code')).toBeInTheDocument()
  })

  it('không vỡ khi payload thiếu hẳn warnings', () => {
    const calculation = makeCalculation()
    delete (calculation as Record<string, unknown>).warnings

    expect(() => renderTable(calculation)).not.toThrow()
  })

  it('chỉ chú thích hỗ trợ thưởng khi thực sự có tiền', () => {
    // #2831: bonus_support NẰM TRONG support_total; chú thích chỉ nói nó rút từ
    // pool thưởng CĐT nên không bị trừ ở dòng "Phí đại lý còn lại (MV)".
    const note = /rút từ pool thưởng CĐT/

    // bonus_support.amount = "0" trong fixture mặc định.
    const { unmount } = renderTable(makeCalculation())
    expect(screen.queryByText(note)).not.toBeInTheDocument()
    unmount()

    renderTable(
      makeCalculation({
        request: { ...makeCalculation().request, bonus_support: row('5000000', '0.25') },
      })
    )
    expect(screen.getByText(note)).toBeInTheDocument()
  })

  it('CR STT16 — có đủ dòng "Thưởng sale" và "Tổng phí nhận"', () => {
    renderTable(makeCalculation())

    // bonus_regulated = null trong fixture nhưng là trường CR liệt kê đích danh
    // ⇒ vẫn phải có mặt với "—", không được biến mất.
    expect(rowTextOf('Thưởng sale')).toContain('—')
    expect(rowTextOf('Tổng phí nhận')).toContain('40.000.000')
  })

  it('thiếu rate phí đại lý → dòng còn lại hiện "—" thay vì 0đ', () => {
    renderTable(
      makeCalculation({
        remainder: {
          ...makeCalculation().remainder,
          mv_remaining: row(null),
        },
      })
    )

    const agencyRow = rowTextOf('Phí đại lý còn lại (MV)')
    expect(agencyRow).toContain('—')
    // Thiếu rate thì phải là gạch ngang, tuyệt đối không phải "0" đồng.
    expect(agencyRow).not.toMatch(/[0-9]/)
  })

  it('vẫn gắn chip "số tạm tính" khi chưa có giao dịch thật', () => {
    renderTable(
      makeCalculation({
        source: 'tbc_provisional',
        outflow: { ...makeCalculation().outflow, is_actual: false },
      })
    )

    expect(screen.getByText('Số tạm tính (chưa có giao dịch)')).toBeInTheDocument()
  })

  it('CR 86eyhjjug — KHÔNG còn khối bóc tách hai chiều trên giao diện', () => {
    renderTable(makeCalculation())

    // Bảng phẳng vẫn còn — đây là bề mặt duy nhất của sao kê từ CR này.
    expect(screen.getByText('Giá tính phí')).toBeInTheDocument()

    // Tiêu đề khối + các dòng CHỈ tồn tại trong khối bóc tách phải biến mất sạch.
    for (const gone of [
      'BÓC TÁCH HAI CHIỀU',
      'Tổng nhận',
      'Tổng chi',
      'Chi cho sale',
      'Chi cho sàn F2',
      'Hoa hồng quản lý',
      'Còn lại sau tuyến bán hàng (trước hỗ trợ)',
      'Còn lại sau tuyến bán hàng (sau hỗ trợ)',
      'Công ty thực giữ (trước hỗ trợ)',
      'Công ty thực giữ (sau hỗ trợ)',
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/MV NHẬN TỪ CHỦ ĐẦU TƯ/)).not.toBeInTheDocument()
    expect(screen.queryByText(/MV ĐÃ CHI|MV DỰ CHI/)).not.toBeInTheDocument()
  })

  it('CR 86eyhjjug — caption giữ lại base A′ và VAT sau khi gỡ khối bóc tách', () => {
    renderTable(makeCalculation())

    // Hai số này từng nằm ở tiêu đề thẻ bóc tách. Gỡ thẻ mà không dời sang caption
    // là mất hẳn: không còn gì đối chiếu % của các dòng sale, và chip "gồm VAT"
    // treo lơ lửng không rõ VAT bao nhiêu.
    expect(screen.getByText(/Giá chia hoa hồng 2\.000\.000\.000 · VAT 10%/)).toBeInTheDocument()
    // "10.00" là decimal thô của BE — phải qua formatPercent, không render nguyên chuỗi.
    expect(screen.queryByText(/VAT 10\.00%/)).not.toBeInTheDocument()
  })

  it('CR 86eyhjjug — "Thưởng MV nhận" gộp thưởng CĐT + thưởng chia sẻ', () => {
    renderTable(
      makeCalculation({
        inflow: {
          rows: {
            agency_fee: row('54600000', '2.73'),
            investor_bonus: row('25000000', '0.25'),
            shared_bonus: row('40000000', '0.40'),
          },
          total: '119600000',
          total_pct_effective: '5.98',
        },
      })
    )

    // Bản cũ chỉ lấy investor_bonus ⇒ hiện 25.000.000 và bỏ sót thưởng chia sẻ.
    const bonusRow = rowTextOf('Thưởng MV nhận')
    expect(bonusRow).toContain('65.000.000')
    expect(bonusRow).toContain('0,65%')
    expect(bonusRow).not.toContain('25.000.000')
  })
})
