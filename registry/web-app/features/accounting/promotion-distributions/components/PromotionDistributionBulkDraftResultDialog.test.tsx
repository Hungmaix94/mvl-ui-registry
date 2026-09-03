// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

// Skip reason labels come from the server; stub the store-backed hook with the labels the
// `accounting` app_constants endpoint serves for `PromotionBulkSkipReason`.
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map([
      [
        'PromotionBulkSkipReason',
        {
          already_exists: 'Đã có phiếu phân bổ Đầu tư & Xúc tiến trong kỳ này',
          no_config: 'Dự án chưa có cấu hình hoa hồng Đầu tư & Xúc tiến',
          no_revenue: 'Dự án không có doanh thu trong kỳ này',
          error: 'Tính toán thất bại',
        },
      ],
    ]),
    keysMapOptions: new Map(),
  }),
}))

import PromotionDistributionBulkDraftResultDialog from './PromotionDistributionBulkDraftResultDialog'
import type { BulkDraftResult } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'

function makeResult(overrides: Partial<BulkDraftResult> = {}): BulkDraftResult {
  return {
    accounting_period: { id: 11, year: 2026, month: 8 } as unknown as Record<string, never>,
    mkt_cutoff_date: '2026-08-31',
    marketing_cost: '0',
    created: [
      {
        project_id: 68,
        project_code: 'DA068',
        project_name: 'Dự án A',
        distribution_id: 41,
        distribution_code: 'PBXT-2026-08-0001',
        total_deals: 3,
        total_receipt_in_period: '1500000000',
        revenue_base: '27000000',
        payout_ratio: '0.833300',
      },
    ],
    skipped: [
      {
        project_id: 70,
        project_code: 'DA070',
        project_name: 'Dự án B',
        total_deals: 2,
        total_receipt_in_period: '900000000',
        reason: 'already_exists',
        detail: 'Distribution PBXT-2026-08-0002 already exists with status DRAFT.',
      },
      {
        project_id: 73,
        project_code: 'DA073',
        project_name: 'Dự án C',
        total_deals: 1,
        total_receipt_in_period: '400000000',
        reason: 'no_config',
        detail: 'No promotion commission config configured for project 73.',
      },
    ],
    created_count: 1,
    skipped_count: 2,
    ...overrides,
  }
}

function renderDialog(result: BulkDraftResult) {
  return render(
    <PromotionDistributionBulkDraftResultDialog
      result={result}
      periodLabel="08/2026"
      onClose={() => {}}
    />
  )
}

describe('PromotionDistributionBulkDraftResultDialog', () => {
  it('shows both created and skipped projects with their period figures', () => {
    renderDialog(makeResult())

    const createdTable = screen.getAllByRole('table')[0] // first table = "Đã thêm"
    expect(within(createdTable).getByText('DA068 - Dự án A')).toBeTruthy()
    expect(within(createdTable).getByText('PBXT-2026-08-0001')).toBeTruthy()
    // 1,500,000,000 rendered in vi-VN grouping
    expect(within(createdTable).getByText('1.500.000.000')).toBeTruthy()

    // The skipped project keeps its money on screen — that is what tells the accountant
    // how much is at stake for a project that got no draft.
    expect(screen.getByText('DA073 - Dự án C')).toBeTruthy()
    expect(screen.getByText('400.000.000')).toBeTruthy()
  })

  it('renders server labels for skip reasons, not raw codes', () => {
    renderDialog(makeResult())

    expect(screen.getByText('Dự án chưa có cấu hình hoa hồng Đầu tư & Xúc tiến')).toBeTruthy()
    expect(screen.queryByText('no_config')).toBeNull()
  })

  it('puts actionable skips (no_config) above already_exists', () => {
    renderDialog(makeResult())

    const tables = screen.getAllByRole('table')
    const skippedTable = tables[tables.length - 1]
    const rowText = within(skippedTable)
      .getAllByRole('row')
      .slice(1) // drop header
      .map((row) => row.textContent ?? '')

    expect(rowText[0]).toContain('DA073')
    expect(rowText[1]).toContain('DA070')
  })

  it('warns when projects with revenue could not be added', () => {
    renderDialog(makeResult())

    expect(screen.getByText(/1 dự án có doanh thu/)).toBeTruthy()
  })

  it('does not warn when every skip is just "already has a distribution"', () => {
    const result = makeResult({
      skipped: [
        {
          project_id: 70,
          project_code: 'DA070',
          project_name: 'Dự án B',
          total_deals: 2,
          total_receipt_in_period: '900000000',
          reason: 'already_exists',
          detail: 'Distribution PBXT-2026-08-0002 already exists with status DRAFT.',
        },
      ],
      skipped_count: 1,
    })
    renderDialog(result)

    expect(screen.queryByText(/dự án có doanh thu/)).toBeNull()
  })

  it('states plainly when the period had nothing to add', () => {
    renderDialog(makeResult({ created: [], skipped: [], created_count: 0, skipped_count: 0 }))

    expect(screen.getByText(/chưa có dự án nào phát sinh tiền về/)).toBeTruthy()
  })
})
