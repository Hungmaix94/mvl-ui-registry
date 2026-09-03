// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

vi.mock('@/hooks/useAppConstant.ts', () => ({
  default: () => ({ keysMap: new Map() }),
}))

import { PaymentVoucherAllocationTab } from './PaymentVoucherAllocationTab'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'

// Số thật của PV000000737 (bug 86eygdrz8): BE trả net = gross nên VAT sập về 0, còn dòng
// hóa đơn thì tách đúng 12.033.000 + 1.203.300.
const TIER = {
  id: 150,
  input_invoice: 207,
  input_invoice_code: 'HDIN000000207',
  input_invoice_line: 309,
  unit_number: 'VH100008',
  deal_code: 'HD06-2026-001777',
  deal_id: 2894,
  project_name: 'Dự án Làng Vân',
  f2_reconciliation_code: 'DALVT-IRS1528-F2-001',
  allocated_amount: '13236300',
  net_amount: '13236300',
  vat_amount: '0',
  lines: [
    { id: 759, line_kind: 'COMMISSION', description: 'Thưởng F2', amount: '0' },
    { id: 760, line_kind: 'COMMISSION', description: 'Hoa hồng F2', amount: '13236300' },
  ],
}

const INVOICE = {
  id: 207,
  code: 'HDIN000000207',
  lines: [
    {
      id: 309,
      deal: 2894,
      f2_reconciliation: 225,
      line_total: '12033000',
      vat_rate: '10.00',
      vat_amount: '1203300',
      line_total_with_vat: '13236300',
    },
  ],
} as unknown as InputInvoice

function renderTab({
  invoiceLoaded = true,
  tier = TIER,
  invoice = INVOICE,
}: { invoiceLoaded?: boolean; tier?: typeof TIER; invoice?: InputInvoice } = {}) {
  return render(
    <MemoryRouter>
      <PaymentVoucherAllocationTab
        record={
          { lines: [], invoices: [tier], commission_invoices: [] } as unknown as PaymentVoucher
        }
        inputInvoicesMap={invoiceLoaded ? { 207: invoice } : {}}
        lineKindChoices={null}
      />
    </MemoryRouter>
  )
}

/** Ba ô tiền cuối hàng: [Thành tiền, VAT, Thành tiền (gồm VAT)]. */
function moneyCellsOf(row: HTMLElement) {
  return within(row)
    .getAllByRole('cell')
    .slice(-3)
    .map((cell) => cell.textContent?.trim())
}

/** Hàng 0 là header, hàng cuối là "Tổng cộng", ở giữa là các căn. */
function firstUnitRow() {
  return screen.getAllByRole('row')[1]
}

function totalRow() {
  const rows = screen.getAllByRole('row')
  return rows[rows.length - 1]
}

describe('PaymentVoucherAllocationTab — bảng "Chi theo từng căn"', () => {
  it('tách VAT theo dòng hóa đơn đầu vào thay vì tin net_amount của tier', () => {
    renderTab()

    expect(moneyCellsOf(firstUnitRow())).toEqual(['12.033.000', '1.203.300', '13.236.300'])
  })

  it('dòng Tổng cộng cộng theo số đã tách, không theo số BE', () => {
    renderTab()

    expect(within(totalRow()).getByText('Tổng cộng')).toBeTruthy()
    expect(moneyCellsOf(totalRow())).toEqual(['12.033.000', '1.203.300', '13.236.300'])
  })

  it('để TRỐNG Thành tiền/VAT khi hóa đơn chưa fetch xong — không nháy số BE sai', () => {
    // Map là state của trang, reset mỗi lần vào tab, nên đây là lượt render đầu THẬT.
    renderTab({ invoiceLoaded: false })

    // GROSS vẫn tin được nên vẫn hiện; hai ô cơ sở VAT thì để trống.
    expect(moneyCellsOf(firstUnitRow())).toEqual(['—', '—', '13.236.300'])
    expect(moneyCellsOf(totalRow())).toEqual(['—', '—', '13.236.300'])
  })

  it('lùi về số BE khi hóa đơn đã tải nhưng dòng thiếu cơ sở VAT (tier legacy)', () => {
    const invoiceWithoutBasis = {
      id: 207,
      lines: [{ id: 309, line_total: '', line_total_with_vat: '' }],
    } as unknown as InputInvoice

    renderTab({ invoice: invoiceWithoutBasis })

    expect(moneyCellsOf(firstUnitRow())).toEqual(['13.236.300', '0', '13.236.300'])
  })

  it('Giao dịch và Đối chiếu là link mở tab mới, id đối chiếu lấy từ dòng hóa đơn', () => {
    renderTab()

    const dealLink = screen.getByRole('link', { name: 'HD06-2026-001777' })
    expect(dealLink.getAttribute('href')).toBe('/project-admin/contract-transaction/deal/2894')
    expect(dealLink.getAttribute('target')).toBe('_blank')

    // Tier KHÔNG mang id đối chiếu — 225 chỉ có ở invoice.lines[].f2_reconciliation.
    const reconLink = screen.getByRole('link', { name: 'DALVT-IRS1528-F2-001' })
    expect(reconLink.getAttribute('href')).toBe(
      '/project-admin/contract-transaction/f2-reconciliation/225'
    )
    expect(reconLink.getAttribute('target')).toBe('_blank')
    expect(reconLink.getAttribute('rel')).toContain('noopener')
  })

  it('đối chiếu về text thường khi hóa đơn chưa tải (chưa biết id để dựng link)', () => {
    renderTab({ invoiceLoaded: false })

    expect(screen.queryByRole('link', { name: 'DALVT-IRS1528-F2-001' })).toBeNull()
    expect(screen.getByText('DALVT-IRS1528-F2-001')).toBeTruthy()
  })

  it('không còn cột tách theo từng loại khoản chi', () => {
    renderTab()

    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim())
    expect(headers).toEqual([
      'Dự án',
      'Căn',
      'Giao dịch',
      'Hóa đơn',
      'Đối chiếu',
      'Thành tiền',
      'VAT',
      'Thành tiền (gồm VAT)',
    ])
    expect(screen.queryByText('Hoa hồng F2')).toBeNull()
    expect(screen.queryByText('Thưởng F2')).toBeNull()
  })
})
