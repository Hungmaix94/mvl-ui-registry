import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AdvanceReportFilterSummary, {
  buildAdvanceReportFilterSummary,
  EMPTY_LABEL,
} from './AdvanceReportFilterSummary'

describe('buildAdvanceReportFilterSummary', () => {
  it('falls back to a dash for every criterion the user left open', () => {
    const items = buildAdvanceReportFilterSummary({})

    expect(items.map((item) => item.label)).toEqual([
      'Từ ngày',
      'Đến ngày',
      'Chi nhánh',
      'Khối',
      'Phòng ban',
    ])
    expect(items.every((item) => item.value === EMPTY_LABEL)).toBe(true)
    expect(items.every((item) => item.isFallback)).toBe(true)
  })

  it('formats the applied dates for display', () => {
    const items = buildAdvanceReportFilterSummary({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    })

    expect(items[0]).toMatchObject({ value: '01/07/2026', isFallback: false })
    expect(items[1]).toMatchObject({ value: '31/07/2026', isFallback: false })
  })

  it('marks only the org levels that were actually chosen', () => {
    const items = buildAdvanceReportFilterSummary({ branchId: 5, branchName: 'Hà Nội' })

    expect(items[2]).toMatchObject({ value: 'Hà Nội', isFallback: false })
    expect(items[3]).toMatchObject({ value: EMPTY_LABEL, isFallback: true })
    expect(items[4]).toMatchObject({ value: EMPTY_LABEL, isFallback: true })
  })

  it('never captions a filtered table as unfiltered when a name fails to resolve', () => {
    // The id is in the URL, so the rows below ARE narrowed — saying "-" would be a lie.
    const items = buildAdvanceReportFilterSummary({ departmentId: 42 })

    expect(items[4]).toMatchObject({ value: '#42', isFallback: false })
  })
})

describe('AdvanceReportFilterSummary', () => {
  it('renders the applied filter next to its label', () => {
    render(<AdvanceReportFilterSummary dateFrom="2026-07-01" branchName="Hà Nội" />)

    const band = screen.getByLabelText('Bộ lọc đang áp dụng')
    expect(within(band).getByText('01/07/2026')).toBeInTheDocument()
    expect(within(band).getByText('Hà Nội')).toBeInTheDocument()
    // Đến ngày, Khối and Phòng ban are all still open.
    expect(within(band).getAllByText(EMPTY_LABEL)).toHaveLength(3)
  })
})
