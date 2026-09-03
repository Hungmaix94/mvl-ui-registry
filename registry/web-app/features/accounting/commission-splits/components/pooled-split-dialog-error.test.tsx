// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { PooledSplitDialog, type PooledFeeGroup } from './PooledSplitDialog'

// Mock the async-select hooks (network-bound) — the payee picker is not under test.
vi.mock('@/hooks/useCollaboratorSelect', () => ({
  useCollaboratorSelect: () => ({ loadCollaboratorOptions: vi.fn() }),
}))
vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({ loadExchangeOptions: vi.fn() }),
}))

const GROUPS: PooledFeeGroup[] = [
  {
    code: 'G1',
    name: 'Sale A',
    kind: 'employee',
    participationPct: 50,
    sharePct: 1.0,
    feeExpected: 21_500_000,
    ownerAmount: 21_500_000,
  },
  {
    code: 'G2',
    name: 'CTV B',
    kind: 'collaborator',
    participationPct: 20,
    sharePct: 0.4,
    feeExpected: 8_600_000,
    ownerAmount: 8_600_000,
  },
]

/** Mimics the parent contract exactly: saving toggles around a rejecting submit
 * (base-service throws the DRF error body object, not an Error instance). */
const Harness = ({ groups }: { groups: PooledFeeGroup[] }) => {
  const [open, setOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    try {
      setSaving(true)
      await Promise.reject({ detail: 'The monthly summary is already CONFIRMED.', status: 409 })
    } catch {
      // parent shows a toast; dialog stays open
    } finally {
      setSaving(false)
    }
  }
  if (!open) return null
  return (
    <PooledSplitDialog
      open
      onClose={() => setOpen(false)}
      groups={groups}
      feeBasis={2_150_000_000}
      loadEmployeeOptions={vi.fn()}
      saving={saving}
      onSubmit={submit}
      initial={{ payee: { kind: 'collaborator', id: 136, name: 'CTV Pooled' }, feePct: '0.5000' }}
    />
  )
}

describe('PooledSplitDialog — participants survive a failed submit', () => {
  it('keeps the participant preview rows after the BE rejects', async () => {
    render(<Harness groups={GROUPS} />)

    expect(screen.getByText('Sale A')).toBeTruthy()
    expect(screen.getByText('CTV B')).toBeTruthy()

    fireEvent.click(screen.getByText('Lưu chia gộp'))

    // dialog still open, participants still listed
    await waitFor(() => {
      expect(screen.getByText('Sale A')).toBeTruthy()
    })
    expect(screen.getByText('CTV B')).toBeTruthy()
  })

  it('renders the participant rows even when the parent groups prop momentarily empties', () => {
    const { rerender } = render(<Harness groups={GROUPS} />)
    expect(screen.getByText('Sale A')).toBeTruthy()

    // A parent-side glitch (refetch/reset) emptying groups must not permanently blank
    // the open dialog: the dialog snapshots its working set at open.
    rerender(<Harness groups={[]} />)
    expect(screen.getByText('Sale A')).toBeTruthy()
  })
})

/**
 * sharePct is share_full_amount ÷ basis, so the total carries full float precision while
 * the input is 4dp. Rounding the quick action UP put it above the real total and tripped
 * the dialog's own over-total guard — the button disabled its own Save.
 */
describe('PooledSplitDialog — "Nhận toàn bộ" quick action', () => {
  const BASIS = 2_150_000_000
  // 21,499,995 / 2.15e9 and 8,599,997 / 2.15e9 -> total 1.3999996279069768
  const UNEVEN: PooledFeeGroup[] = [
    {
      code: 'G1',
      name: 'Sale A',
      kind: 'employee',
      participationPct: 50,
      sharePct: (21_499_995 / BASIS) * 100,
      feeExpected: 21_499_995,
      ownerAmount: 21_499_995,
    },
    {
      code: 'G2',
      name: 'CTV B',
      kind: 'collaborator',
      participationPct: 20,
      sharePct: (8_599_997 / BASIS) * 100,
      feeExpected: 8_599_997,
      ownerAmount: 8_599_997,
    },
  ]

  const renderDialog = (groups: PooledFeeGroup[]) =>
    render(
      <PooledSplitDialog
        open
        onClose={vi.fn()}
        groups={groups}
        feeBasis={BASIS}
        loadEmployeeOptions={vi.fn()}
        saving={false}
        onSubmit={vi.fn()}
        initial={{ payee: { kind: 'collaborator', id: 136, name: 'CTV Pooled' }, feePct: '0.5000' }}
      />
    )

  it('fills a value at or below the total, so the over-total error never fires', () => {
    renderDialog(UNEVEN)
    fireEvent.click(screen.getByText('Nhận toàn bộ'))

    // floored to the input's 4dp granularity, never rounded up past 1.3999996...
    expect(screen.getByDisplayValue('1.3999')).toBeTruthy()
    expect(screen.queryByText(/không được vượt quá/)).toBeNull()
    const save = screen.getByRole('button', { name: /Lưu chia gộp/ }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
  })

  it('still fills the exact total when it already lands on 4dp', () => {
    const even = UNEVEN.map((g, i) => ({ ...g, sharePct: i === 0 ? 1 : 0.4 }))
    renderDialog(even)
    fireEvent.click(screen.getByText('Nhận toàn bộ'))

    expect(screen.getByDisplayValue('1.4000')).toBeTruthy()
    expect(screen.queryByText(/không được vượt quá/)).toBeNull()
  })
})
