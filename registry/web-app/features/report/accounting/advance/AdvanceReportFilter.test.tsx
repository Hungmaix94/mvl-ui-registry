import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@/lib/firebase', () => ({ getFCMToken: vi.fn().mockResolvedValue(''), messaging: null }))
// The cascade fetches org options on mount; this suite is about the form's own seeding rules.
vi.mock('@/components/commons/filters/CascadeSelectGroupOrganization.tsx', () => ({
  CascadeSelectGroupOrganization: () => <div data-testid="cascade" />,
}))

import AdvanceReportFilter, {
  type AdvanceReportFilterFormData,
  type AdvanceReportFilterRef,
} from './AdvanceReportFilter'

function renderFilter(initialValues: AdvanceReportFilterFormData) {
  const ref = createRef<AdvanceReportFilterRef>()
  const view = render(<AdvanceReportFilter ref={ref} initialValues={initialValues} />)
  return { ref, view }
}

describe('AdvanceReportFilter', () => {
  it('seeds itself from initialValues at mount', () => {
    const { ref } = renderFilter({ branch: 5, branchName: 'Hà Nội' })

    expect(ref.current?.getValues()).toMatchObject({ branch: 5, branchName: 'Hà Nội' })
  })

  it('does not re-seed when a late org-name lookup gives initialValues a new identity', () => {
    // The parent rebuilds `initialValues` whenever a branch/block/department name resolves.
    // Re-seeding on that would throw away whatever the user had picked since opening the
    // dialog — the dialog is remounted per open (via `key`), so mount is the only seed point.
    const { ref, view } = renderFilter({ branch: 5 })

    view.rerender(
      <AdvanceReportFilter ref={ref} initialValues={{ branch: 5, branchName: 'Hà Nội' }} />
    )

    expect(ref.current?.getValues().branchName).toBeUndefined()
  })

  it('clears every field through the imperative handle', () => {
    const { ref } = renderFilter({
      branch: 5,
      block: 12,
      department: 3,
      branchName: 'Hà Nội',
      date_range: { from: new Date('2026-07-01'), to: new Date('2026-07-31') },
    })

    ref.current?.clearForm()

    expect(ref.current?.getValues()).toMatchObject({
      branch: undefined,
      block: undefined,
      department: undefined,
      branchName: undefined,
      date_range: null,
    })
  })
})
