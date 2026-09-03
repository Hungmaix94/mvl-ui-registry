import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import BlockerList from './BlockerList'
import type { ApiBlocker } from '@/utils/error-utils'

function blocker(overrides: Partial<ApiBlocker> = {}): ApiBlocker {
  return {
    code: 'sales_invoice_paid',
    severity: 'blocker',
    title: 'Hóa đơn đã thu tiền',
    detail: 'Hóa đơn HDOUT000001448 đã thu 120.000.000.',
    remediation: 'Hủy phiếu thu của hóa đơn HDOUT000001448 trước.',
    entity: { type: 'sales_invoice', id: 1448, label: 'HDOUT000001448', status: 'PAID' },
    auto_fixable: false,
    ...overrides,
  } as ApiBlocker
}

describe('BlockerList', () => {
  it('hiện heading, lý do và việc cần làm của từng blocker', () => {
    render(
      <BlockerList
        heading="Chưa hoàn / huỷ được hợp đồng cọc vì"
        items={[
          blocker(),
          blocker({
            code: 'sales_invoice_issued',
            title: 'Hóa đơn đã xuất',
            detail: 'Hóa đơn HDOUT000001451 đang ở trạng thái Đã xuất.',
            remediation: 'Nhờ Kế toán hủy hóa đơn HDOUT000001451.',
          }),
        ]}
      />
    )

    expect(screen.getByText('Chưa hoàn / huỷ được hợp đồng cọc vì')).toBeInTheDocument()
    // Mã hóa đơn phải hiện ra — đây là lý do phải render danh sách thay vì toast một dòng.
    expect(screen.getByText(/HDOUT000001448 đã thu 120\.000\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Hủy phiếu thu của hóa đơn HDOUT000001448/)).toBeInTheDocument()
    expect(screen.getByText('Hóa đơn đã xuất')).toBeInTheDocument()
    expect(screen.getByText(/Nhờ Kế toán hủy hóa đơn HDOUT000001451/)).toBeInTheDocument()
  })

  it('bỏ dòng "Cần làm" khi blocker không có remediation', () => {
    render(<BlockerList heading="Chưa làm được vì" items={[blocker({ remediation: '' })]} />)

    expect(screen.getByText('Hóa đơn đã thu tiền')).toBeInTheDocument()
    expect(screen.queryByText(/Cần làm/)).not.toBeInTheDocument()
  })

  it('chỉ hiện heading khi không có blocker nào', () => {
    render(<BlockerList heading="Chưa làm được vì" items={[]} />)

    expect(screen.getByText('Chưa làm được vì')).toBeInTheDocument()
    expect(screen.queryByText(/Cần làm/)).not.toBeInTheDocument()
  })
})
