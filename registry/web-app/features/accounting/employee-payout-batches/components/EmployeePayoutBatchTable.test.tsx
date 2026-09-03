import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

const mockCan = vi.fn().mockReturnValue(true)
vi.mock('@/lib/ability', () => ({
  useAbility: () => ({
    can: mockCan,
  }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import EmployeePayoutBatchTable from './EmployeePayoutBatchTable'
import type { EmployeeCommissionPayoutBatch } from '../services/employee-payout-batch-service'

function makeRow(
  overrides: Partial<EmployeeCommissionPayoutBatch> = {}
): EmployeeCommissionPayoutBatch {
  return {
    id: 10,
    code: 'EPB-2026-0001',
    year: 2026,
    month: 5,
    wave: 'SALE',
    batch_date: '2026-05-01',
    total_amount: '15000000',
    status: 'DRAFT',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    lines: [],
    ...overrides,
  } as unknown as EmployeeCommissionPayoutBatch
}

describe('EmployeePayoutBatchTable', () => {
  it('renders table with data successfully', () => {
    const row = makeRow()
    const { getByText } = render(
      <MemoryRouter>
        <SidebarProvider>
          <EmployeePayoutBatchTable
            data={[row]}
            isLoading={false}
            totalRecords={1}
            pageSize={25}
            currentPageIndex={0}
          />
        </SidebarProvider>
      </MemoryRouter>
    )

    expect(getByText('EPB-2026-0001')).toBeInTheDocument()
    expect(getByText('05/2026')).toBeInTheDocument()
  })
})
