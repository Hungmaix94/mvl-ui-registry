import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderReconCodeLink, renderReconParentSheetLink } from './recon-code-link'

describe('renderReconCodeLink', () => {
  it('renders a link to the given path when path is provided', () => {
    render(<MemoryRouter>{renderReconCodeLink('VTL-IRS1475', '/recon/1475')}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'VTL-IRS1475' })
    expect(link).toHaveAttribute('href', '/recon/1475')
  })

  it('renders plain text (no link) when path is null — e.g. missing permission', () => {
    render(<MemoryRouter>{renderReconCodeLink('VTL-IRS1475', null)}</MemoryRouter>)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('VTL-IRS1475')).toBeInTheDocument()
  })

  it('stops click propagation so the parent row does not also open the actions menu', () => {
    const onRowClick = vi.fn()
    render(
      <MemoryRouter>
        <div onClick={onRowClick}>{renderReconCodeLink('VTL-IRS1475', '/recon/1475')}</div>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('link', { name: 'VTL-IRS1475' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })
})

describe('renderReconParentSheetLink', () => {
  const PARENT = {
    investor_sheet: 42,
    investor_sheet_detail: { code: 'DCDT-T05-2026' },
  }

  it('link mã phiếu CĐT gốc về route chi tiết bằng id BẢNG', () => {
    render(<MemoryRouter>{renderReconParentSheetLink(PARENT, true)}</MemoryRouter>)
    const link = screen.getByRole('link', { name: 'DCDT-T05-2026' })
    expect(link).toHaveAttribute(
      'href',
      '/project-admin/contract-transaction/investor-reconciliation/42'
    )
  })

  it('thiếu quyền xem phiếu CĐT: vẫn hiện mã, bỏ link', () => {
    render(<MemoryRouter>{renderReconParentSheetLink(PARENT, false)}</MemoryRouter>)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('DCDT-T05-2026')).toBeInTheDocument()
  })

  it('phiếu cũ chưa gắn IRS (cả 2 field null): hiện "-", không crash', () => {
    render(
      <MemoryRouter>
        {renderReconParentSheetLink({ investor_sheet: null, investor_sheet_detail: null }, true)}
      </MemoryRouter>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('có mã nhưng thiếu id BẢNG: hiện mã dạng text thay vì link hỏng', () => {
    render(
      <MemoryRouter>
        {renderReconParentSheetLink(
          { investor_sheet: null, investor_sheet_detail: { code: 'DCDT-T05-2026' } },
          true
        )}
      </MemoryRouter>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('DCDT-T05-2026')).toBeInTheDocument()
  })
})
