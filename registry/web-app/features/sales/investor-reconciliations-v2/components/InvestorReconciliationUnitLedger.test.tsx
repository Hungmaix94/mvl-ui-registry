import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import { vnd } from '@/features/sales/investor-reconciliations-v2/utils/recon-v2-format'

import InvestorReconciliationUnitLedger from './InvestorReconciliationUnitLedger'

const NET_AMOUNT = 40_500_000
const RECEIVABLE = 44_550_000

/**
 * `InvestorReconciliation` là schema sinh tự động với hàng chục field readonly bắt buộc; test chỉ
 * quan tâm khối tổng nên fixture khai báo đúng phần dùng tới rồi ép kiểu MỘT lần tại đây (ranh giới
 * test), thay vì rải `as` vào component. Số tiền chọn khác nhau từng dòng để query theo text là duy nhất.
 */
function makeLine(overrides: Record<string, unknown> = {}): InvestorReconciliationLine {
  return {
    recon_check: null,
    fee_calculation_price: '1000000000',
    commission_fee_calculation_price: null,
    pct_agency_fee: '5',
    amt_agency_fee: null,
    is_agency_fee_include_vat: false,
    progress_from_pct: '0',
    progress_to_pct: '30',
    retroactive_adjustment_amount: '0',
    shared_bonus_amount: '40000000',
    shared_bonus_pct: null,
    is_shared_bonus_include_vat: false,
    shared_bonus_period_amount: '20000000',
    shared_bonus_to_sale_pct: '50',
    fee_deduction: '5500000',
    fee_deduction_to_sale_amount: '2200000',
    is_fee_deduction_include_vat: true,
    extra_bonus_amount: '22000000',
    extra_bonus_pct: null,
    is_extra_bonus_include_vat: true,
    extra_bonus_progress_from_pct: '0',
    extra_bonus_progress_to_pct: '50',
    extra_bonus_period_amount: '11000000',
    period_commission: '15000000',
    total_amount: String(NET_AMOUNT),
    vat_amount: '4050000',
    vat_rate: '10',
    shared_bonus_prepaid_amount: null,
    amount_to_collect: String(RECEIVABLE),
    total_amount_with_vat: String(RECEIVABLE),
    note: '',
    ...overrides,
  } as unknown as InvestorReconciliationLine
}

/** Vị trí (theo thứ tự render) của dòng chứa nhãn đã cho. -1 nếu không có dòng nào. */
function rowIndexOf(label: string | RegExp): number {
  return screen.getAllByRole('row').findIndex((row) => within(row).queryByText(label) !== null)
}

describe('InvestorReconciliationUnitLedger — khối "Tổng số tiền đối chiếu kỳ này"', () => {
  it('xếp mọi cấu phần cộng/trừ TRƯỚC dòng kết chuyển NET rồi phải thu; KHÔNG còn dòng "VAT %"', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)

    const order = [
      rowIndexOf(/^Hoa hồng đợt này/),
      rowIndexOf('Phí tăng thêm đợt này'),
      rowIndexOf('Thưởng kì này'),
      rowIndexOf('Khấu trừ kỳ này'),
      rowIndexOf('TIỀN NHẬN KỲ NÀY (NET)'),
      rowIndexOf('TIỀN PHẢI THU CĐT'),
    ]

    expect(order).not.toContain(-1)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    // Dòng "VAT %" đã bỏ — chênh lệch VAT thể hiện qua 2 cột Chưa VAT / Gồm VAT.
    expect(screen.queryByText(/^VAT\s/)).not.toBeInTheDocument()
  })

  it('in đậm CẢ nhãn lẫn số tiền của NET và TIỀN PHẢI THU CĐT', () => {
    // '.typo-body-base' (L130) và '.typo-body-base-medium' (L219) khai báo SAU
    // '.typo-body-base-semibold' (L123) trong tailwind-typography.css ⇒ chồng 2 lớp qua cn() thì
    // lớp sau đè, mất bold. Test chặn tái diễn. NET_AMOUNT xuất hiện ở CẢ dòng NET và cột "Chưa VAT"
    // của dòng phải thu ⇒ query phải scope theo từng dòng.
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)

    const netRow = screen.getByRole('row', { name: /TIỀN NHẬN KỲ NÀY \(NET\)/ })
    const receivableRow = screen.getByRole('row', { name: /TIỀN PHẢI THU CĐT/ })

    const boldTargets = [
      within(netRow).getByText('TIỀN NHẬN KỲ NÀY (NET)'),
      within(netRow).getByText(vnd(NET_AMOUNT)),
      within(receivableRow).getByText('TIỀN PHẢI THU CĐT'),
      within(receivableRow).getByText(vnd(RECEIVABLE)),
    ]

    for (const element of boldTargets) {
      expect(element.classList.contains('typo-body-base-semibold')).toBe(true)
      expect(element.classList.contains('typo-body-base')).toBe(false)
      expect(element.classList.contains('typo-body-base-medium')).toBe(false)
    }
  })

  it('tô màu nhấn cho số tiền TIỀN PHẢI THU CĐT (cột Gồm VAT)', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)

    const receivableRow = screen.getByRole('row', { name: /TIỀN PHẢI THU CĐT/ })
    expect(
      within(receivableRow)
        .getByText(vnd(RECEIVABLE))
        .classList.contains('text-action-primary-red-default')
    ).toBe(true)
  })

  it('hiện "—" thay vì "0 VNĐ" khi BE trả null cho phí tăng thêm kỳ này', () => {
    render(
      <InvestorReconciliationUnitLedger item={makeLine({ extra_bonus_period_amount: null })} />
    )

    const row = screen.getByRole('row', { name: /Phí tăng thêm đợt này/ })
    // null ⇒ cả 2 cột Chưa VAT & Gồm VAT đều "—".
    expect(within(row).getAllByText('—')).toHaveLength(2)
    expect(within(row).queryByText(vnd(0))).not.toBeInTheDocument()
  })

  it('hiện dòng "Điều chỉnh truy hồi đợt này" TRƯỚC NET khi retro ≠ 0 (đã cộng vào total_amount)', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({ retroactive_adjustment_amount: '-4071301' })}
      />
    )

    // Chuỗi có dấu (−) của signedMoney, phân biệt với dòng band "Số tiền điều chỉnh truy hồi".
    const row = screen.getByRole('row', { name: /Điều chỉnh truy hồi đợt này/ })
    expect(within(row).getByText(`−${vnd(4_071_301)}`)).toBeInTheDocument()

    expect(rowIndexOf('Điều chỉnh truy hồi đợt này')).toBeLessThan(
      rowIndexOf('TIỀN NHẬN KỲ NÀY (NET)')
    )
  })

  it('ẩn dòng "Điều chỉnh truy hồi đợt này" khi retro = 0', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    expect(screen.queryByText('Điều chỉnh truy hồi đợt này')).not.toBeInTheDocument()
  })
})

describe('InvestorReconciliationUnitLedger — 2 cột "Chưa VAT | Gồm VAT"', () => {
  it('hiện header 2 cột Chưa VAT / Gồm VAT', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    expect(screen.getByText('Chưa VAT')).toBeInTheDocument()
    expect(screen.getByText('Gồm VAT')).toBeInTheDocument()
  })

  it('mục KHÔNG gồm VAT (Hoa hồng): số BE ở cột Chưa VAT, FE quy LÊN ×1.1 ở cột Gồm VAT', () => {
    // period_commission=15.000.000, is_agency_fee_include_vat=false ⇒ Chưa VAT=15tr, Gồm VAT=16,5tr.
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    const row = screen.getByRole('row', { name: /^Hoa hồng đợt này/ })
    expect(within(row).getByText(vnd(15_000_000))).toBeInTheDocument()
    expect(within(row).getByText(vnd(16_500_000))).toBeInTheDocument()
  })

  it('mục ĐÃ gồm VAT (Phí tăng thêm): số BE ở cột Gồm VAT, FE quy NGƯỢC ÷1.1 ở cột Chưa VAT', () => {
    // extra_bonus_period_amount=11.000.000, is_extra_bonus_include_vat=true ⇒ Chưa VAT=10tr, Gồm VAT=11tr.
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    const row = screen.getByRole('row', { name: /Phí tăng thêm đợt này/ })
    expect(within(row).getByText(`+${vnd(10_000_000)}`)).toBeInTheDocument()
    expect(within(row).getByText(`+${vnd(11_000_000)}`)).toBeInTheDocument()
  })

  it('TIỀN PHẢI THU CĐT chỉ hiện value ở cột Gồm VAT; cột Chưa VAT để trống (—)', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    const row = screen.getByRole('row', { name: /TIỀN PHẢI THU CĐT/ })
    expect(within(row).getByText('—')).toBeInTheDocument() // cột Chưa VAT
    expect(within(row).getByText(vnd(RECEIVABLE))).toBeInTheDocument() // cột Gồm VAT
    expect(within(row).queryByText(vnd(NET_AMOUNT))).not.toBeInTheDocument()
  })

  it('cột "Gồm VAT" của TIỀN NHẬN KỲ NÀY (NET) để trống (—)', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    const row = screen.getByRole('row', { name: /TIỀN NHẬN KỲ NÀY \(NET\)/ })
    expect(within(row).getByText(vnd(NET_AMOUNT))).toBeInTheDocument() // cột Chưa VAT
    expect(within(row).getByText('—')).toBeInTheDocument() // cột Gồm VAT
  })
})

describe('InvestorReconciliationUnitLedger — nhãn VAT cột "MVL ghi nhận"', () => {
  /** Ô cột "MVL ghi nhận" (index 1) và "CĐT đề nghị" (index 2) của dòng % Hoa hồng (theo HĐPP). */
  function agencyFeeCells(): HTMLElement[] {
    return within(screen.getByRole('row', { name: /% Hoa hồng \(theo HĐPP\)/ })).getAllByRole(
      'cell'
    )
  }

  it('đọc cờ VAT từ recon_check.mv_config, KHÔNG mượn cờ của cột "CĐT đề nghị"', () => {
    // Payload thật của sheet AHL-IRS1539 (deal 2889): CĐT đề nghị đã gồm VAT, HĐPP cấu hình chưa VAT.
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({
          is_agency_fee_include_vat: true,
          recon_check: {
            pct_agency_fee: { submitted: '3.00', mv_config: '3.00', delta: '0.00', match: true },
            is_agency_fee_include_vat: {
              submitted: true,
              mv_config: false,
              delta: null,
              match: false,
            },
          },
        })}
      />
    )

    const cells = agencyFeeCells()
    expect(within(cells[1]).getByText('(Chưa gồm VAT)')).toBeInTheDocument()
    expect(within(cells[2]).getByText('(Gồm VAT)')).toBeInTheDocument()
  })

  it('ẩn nhãn VAT ở cột MVL khi recon_check không có gì để đối chiếu', () => {
    render(
      <InvestorReconciliationUnitLedger item={makeLine({ is_agency_fee_include_vat: true })} />
    )

    const cells = agencyFeeCells()
    expect(within(cells[1]).queryByText(/VAT\)$/)).not.toBeInTheDocument()
    expect(within(cells[2]).getByText('(Gồm VAT)')).toBeInTheDocument()
  })
})

describe('InvestorReconciliationUnitLedger — dòng "Trong đó Sale / F2 phải chịu"', () => {
  it('hiện khi có khấu trừ trong kỳ (khớp dialog thêm/sửa)', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine()} />)
    expect(screen.getByText('· Trong đó Sale / F2 phải chịu')).toBeInTheDocument()
  })

  it('ẩn khi không có khấu trừ', () => {
    render(<InvestorReconciliationUnitLedger item={makeLine({ fee_deduction: '0' })} />)
    expect(screen.queryByText('· Trong đó Sale / F2 phải chịu')).not.toBeInTheDocument()
  })
})

describe('InvestorReconciliationUnitLedger — dòng "Tiến độ thanh toán thưởng sale/F2 kỳ này"', () => {
  it('hiện % kèm số tiền BE tính (shared_bonus_to_sale_amount) cạnh nhau', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({ shared_bonus_to_sale_pct: '50', shared_bonus_to_sale_amount: 10_000_000 })}
      />
    )

    const row = screen.getByRole('row', { name: /Tiến độ thanh toán thưởng sale\/F2 kỳ này/ })
    expect(within(row).getByText('50%')).toBeInTheDocument()
    expect(within(row).getByText(`= ${vnd(10_000_000)} chia về Sale/F2 kỳ này`)).toBeInTheDocument()
  })

  it('chỉ hiện %, KHÔNG hiện dòng số tiền khi shared_bonus_to_sale_amount = 0/thiếu', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({ shared_bonus_to_sale_pct: '50', shared_bonus_to_sale_amount: 0 })}
      />
    )

    const row = screen.getByRole('row', { name: /Tiến độ thanh toán thưởng sale\/F2 kỳ này/ })
    expect(within(row).getByText('50%')).toBeInTheDocument()
    expect(within(row).queryByText(/chia về Sale\/F2 kỳ này/)).not.toBeInTheDocument()
  })
})

/**
 * ClickUp 86eyee86j — căn nhập phí tăng thêm dạng TỶ LỆ. Cột "MVL ghi nhận" của các dòng map cặp
 * %/₫ LOẠI TRỪ NHAU phải format theo ĐÚNG field cấp giá trị: HĐPP cấu hình "phí tăng thêm 2%" mà in
 * ra "2 VNĐ" là số vô nghĩa đặt cạnh "1%" của CĐT, khiến người đối chiếu không đọc được gì.
 */
describe('InvestorReconciliationUnitLedger — đơn vị cột "MVL ghi nhận" theo đúng field', () => {
  /** Ô "MVL ghi nhận" (index 1) của dòng có nhãn cho trước. */
  function mvCell(rowName: RegExp): HTMLElement {
    return within(screen.getByRole('row', { name: rowName })).getAllByRole('cell')[1]
  }

  it('phí tăng thêm: mv_config nằm ở extra_bonus_pct ⇒ hiện "%", KHÔNG phải "VNĐ"', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({
          extra_bonus_amount: null,
          extra_bonus_pct: '1',
          recon_check: {
            extra_bonus_amount: { submitted: null, mv_config: null, delta: null, match: null },
            extra_bonus_pct: { submitted: '1', mv_config: '2', delta: '-1', match: false },
          },
        })}
      />
    )

    const cell = mvCell(/Tổng phí tăng thêm \(thỏa thuận\)/)
    expect(within(cell).getByText('2%')).toBeInTheDocument()
    expect(within(cell).queryByText(vnd(2))).not.toBeInTheDocument()
  })

  it('phí đại lý: mv_config nằm ở amt_agency_fee ⇒ hiện "VNĐ", KHÔNG phải "%"', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({
          recon_check: {
            pct_agency_fee: { submitted: '5', mv_config: null, delta: null, match: null },
            amt_agency_fee: {
              submitted: null,
              mv_config: '55000000',
              delta: null,
              match: false,
            },
          },
        })}
      />
    )

    const cell = mvCell(/% Hoa hồng \(theo HĐPP\)/)
    expect(within(cell).getByText(vnd(55_000_000))).toBeInTheDocument()
    expect(within(cell).queryByText('55.000.000%')).not.toBeInTheDocument()
  })

  it('thưởng đại lý: mv_config nằm ở shared_bonus_pct ⇒ hiện "%", KHÔNG phải "VNĐ"', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={makeLine({
          recon_check: {
            shared_bonus_amount: { submitted: null, mv_config: null, delta: null, match: null },
            shared_bonus_pct: { submitted: '2', mv_config: '3', delta: '-1', match: false },
          },
        })}
      />
    )

    const cell = mvCell(/Tổng thưởng đại lý/)
    expect(within(cell).getByText('3%')).toBeInTheDocument()
    expect(within(cell).queryByText(vnd(3))).not.toBeInTheDocument()
  })
})

/**
 * ClickUp 86eyee86j — nhóm "Phí tăng thêm" phải chốt bằng SỐ TIỀN ghi nhận đợt này, đối xứng với
 * "Thưởng ghi nhận kỳ này" của nhóm thưởng. Thiếu dòng này thì căn nhập TỶ LỆ chỉ đọc được "1%" và
 * "40%" — không có đồng nào trong cả nhóm để đối chiếu (căn nhập trọn gói ₫ thì vẫn thấy tổng).
 */
describe('InvestorReconciliationUnitLedger — dòng "Phí tăng thêm ghi nhận đợt này"', () => {
  const EXTRA_PERIOD = 4_800_000

  function pctLine(overrides: Record<string, unknown> = {}) {
    return makeLine({
      extra_bonus_amount: null,
      extra_bonus_pct: '1',
      is_extra_bonus_include_vat: false,
      extra_bonus_progress_from_pct: '0',
      extra_bonus_progress_to_pct: '40',
      extra_bonus_period_amount: String(EXTRA_PERIOD),
      ...overrides,
    })
  }

  it('hiện số tiền BE tính (extra_bonus_period_amount) ngay trong nhóm "Phí tăng thêm"', () => {
    render(<InvestorReconciliationUnitLedger item={pctLine()} />)

    const row = screen.getByRole('row', { name: /Phí tăng thêm ghi nhận đợt này/ })
    expect(within(row).getByText(vnd(EXTRA_PERIOD))).toBeInTheDocument()
  })

  it('đứng NGAY SAU dòng tiến độ và TRƯỚC khối "Tổng số tiền đối chiếu kỳ này"', () => {
    render(<InvestorReconciliationUnitLedger item={pctLine()} />)

    const progressIdx = rowIndexOf('Tiến độ ĐC phí tăng thêm đợt này')
    const recognisedIdx = rowIndexOf('Phí tăng thêm ghi nhận đợt này')

    expect(progressIdx).toBeGreaterThan(-1)
    expect(recognisedIdx).toBe(progressIdx + 1)
    expect(recognisedIdx).toBeLessThan(rowIndexOf('Tổng số tiền đối chiếu kỳ này'))
  })

  it('gắn nhãn VAT theo cờ của chính mục phí tăng thêm', () => {
    render(
      <InvestorReconciliationUnitLedger item={pctLine({ is_extra_bonus_include_vat: true })} />
    )

    const row = screen.getByRole('row', { name: /Phí tăng thêm ghi nhận đợt này/ })
    expect(within(row).getByText('(Gồm VAT)')).toBeInTheDocument()
  })

  it('hiện số MVL dự đoán từ HĐPP cạnh số CĐT để chip "Đối chiếu" có mốc so', () => {
    render(
      <InvestorReconciliationUnitLedger
        item={pctLine({
          recon_check: {
            extra_bonus_period_amount: {
              submitted: String(EXTRA_PERIOD),
              mv_config: '9600000',
              delta: '-4800000',
              match: false,
            },
          },
        })}
      />
    )

    const cells = within(
      screen.getByRole('row', { name: /Phí tăng thêm ghi nhận đợt này/ })
    ).getAllByRole('cell')
    expect(within(cells[1]).getByText(vnd(9_600_000))).toBeInTheDocument()
    expect(within(cells[2]).getByText(vnd(EXTRA_PERIOD))).toBeInTheDocument()
    expect(within(cells[3]).getByText('Cảnh báo')).toBeInTheDocument()
  })

  it('hiện "—" (KHÔNG bịa "0 VNĐ") khi BE chưa tính extra_bonus_period_amount', () => {
    render(<InvestorReconciliationUnitLedger item={pctLine({ extra_bonus_period_amount: null })} />)

    const row = screen.getByRole('row', { name: /Phí tăng thêm ghi nhận đợt này/ })
    expect(within(row).queryByText(vnd(0))).not.toBeInTheDocument()
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0)
  })
})

/**
 * Lệch CƠ SỞ VAT giữa hai vế là lệch TIỀN, không phải khác nhãn cho vui: cùng "5,1%" trên giá tính phí
 * 11 tỷ, đọc chưa-VAT ra phải thu 617.100.000 đ còn đọc gồm-VAT ra 561.000.000 đ — chênh 56.100.000 đ
 * MỘT căn. Số hoa hồng đại lý thì y hệt nhau ở cả hai cơ sở, nên KHÔNG dòng cấu phần nào tự lộ được
 * chênh lệch này; chỉ cờ VAT nói được.
 *
 * Bất biến (phát biểu theo HIỂN THỊ, không theo tên field — thêm dòng mới có nhãn VAT mà quên nạp cờ
 * vào `checkFor` là đỏ ngay): dòng nào in đồng thời nhãn VAT ở cột "MVL ghi nhận" và cột "CĐT đề nghị",
 * mà hai nhãn KHÁC nhau, thì cột "Đối chiếu" của dòng đó KHÔNG được là "Khớp".
 *
 * Xem `backend/docs/issues/ir_v2_vat_basis_mismatch_shows_match.md`.
 */
describe('InvestorReconciliationUnitLedger — lệch cơ sở VAT thì không được báo "Khớp"', () => {
  /** Dòng chứa đúng nhãn `label` (khớp text của ô nhãn, không phải accessible name cả dòng). */
  function rowByLabel(label: string): HTMLElement {
    const row = screen
      .getAllByRole('row')
      .find((candidate) => within(candidate).queryByText(label) !== null)
    if (!row) throw new Error(`Không tìm thấy dòng ledger có nhãn "${label}"`)
    return row
  }

  /** Cờ VAT lệch: CĐT đề nghị gồm VAT (`submitted: true`) — HĐPP cấu hình chưa gồm VAT. */
  const vatFlagMismatch = { submitted: true, mv_config: false, delta: null, match: false }

  it.each([
    [
      '% Hoa hồng (theo HĐPP)',
      'is_agency_fee_include_vat',
      { pct_agency_fee: { submitted: '5.10', mv_config: '5.10', delta: '0.00', match: true } },
    ],
    [
      'Tổng thưởng đại lý',
      'is_shared_bonus_include_vat',
      {
        shared_bonus_amount: {
          submitted: '40000000',
          mv_config: '40000000',
          delta: '0',
          match: true,
        },
      },
    ],
    [
      'Tổng phí tăng thêm (thỏa thuận)',
      'is_extra_bonus_include_vat',
      {
        extra_bonus_amount: {
          submitted: '22000000',
          mv_config: '22000000',
          delta: '0',
          match: true,
        },
      },
    ],
    [
      'Phí tăng thêm ghi nhận đợt này',
      'is_extra_bonus_include_vat',
      {
        extra_bonus_period_amount: {
          submitted: '11000000',
          mv_config: '11000000',
          delta: '0',
          match: true,
        },
      },
    ],
  ])(
    'dòng "%s" — số bằng nhau nhưng cờ VAT lệch ⇒ "Cảnh báo"',
    (label, flagField, numericCheck) => {
      render(
        <InvestorReconciliationUnitLedger
          item={makeLine({
            [flagField]: true,
            recon_check: { ...numericCheck, [flagField]: vatFlagMismatch },
          })}
        />
      )

      const row = rowByLabel(label)
      // Tiền đề: dòng đang thực sự in hai cơ sở VAT khác nhau.
      expect(within(row).getByText('(Chưa gồm VAT)')).toBeInTheDocument()
      expect(within(row).getByText('(Gồm VAT)')).toBeInTheDocument()
      // Kết luận: cột "Đối chiếu" phải cảnh báo, tuyệt đối không "Khớp".
      expect(within(row).queryByText('Khớp')).not.toBeInTheDocument()
      expect(within(row).getByText('Cảnh báo')).toBeInTheDocument()
    }
  )
})
