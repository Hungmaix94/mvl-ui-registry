import type { ReactNode } from 'react'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMongoAbility } from '@casl/ability'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AbilityContext, type AppAbility } from '@/lib/ability.ts'
import { useDialogStore } from '@/store/dialog-store'
import { ProposalType } from '@/constants/api-schema-aliases'
import useProposalDetailMisc from './useProposalDetailMisc'

const { approveMutateAsync, rejectMutateAsync, showBulkJobTransferApprovedInfoMock } = vi.hoisted(
  () => ({
    approveMutateAsync: vi.fn().mockResolvedValue(undefined),
    rejectMutateAsync: vi.fn().mockResolvedValue(undefined),
    showBulkJobTransferApprovedInfoMock: vi.fn(),
  })
)

vi.mock('@/services', () => ({
  useProposalVerifiers: () => ({
    data: { results: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
  useRejectProposalVerifier: () => ({ mutateAsync: vi.fn() }),
  useVerifyProposalVerifier: () => ({ mutateAsync: vi.fn() }),
  useApproveProposal: () => ({ mutateAsync: approveMutateAsync }),
  useRejectProposal: () => ({ mutateAsync: rejectMutateAsync }),
}))

vi.mock('@/features/decision-and-proposal/services/proposal-misc-service', () => ({
  useApproveProposalOvertimeWork: () => ({ mutateAsync: vi.fn() }),
  useApproveProposalAssetAllocation: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/features/decision-and-proposal/proposal/_shares/hooks/useProposalDetail', () => ({
  useProposalDetail: () => ({
    data: {
      id: 4975,
      job_transfer_lines: [],
      job_transfer_effective_date: '2026-07-15',
      colored_proposal_status: { value: 'pending' },
    },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/features/decision-and-proposal/proposal/_shares/hooks/useProposalTypeLabel.ts', () => ({
  useProposalTypeLabel: () => 'Điều chuyển hàng loạt',
}))

vi.mock('@/store/auth-store.ts', () => ({
  useAuth: () => ({ user: { employee: { code: 'EMP1' } } }),
}))

vi.mock(
  '@/features/decision-and-proposal/proposal/bulk-job-transfer/utils/showBulkJobTransferApprovedInfo.tsx',
  () => ({
    showBulkJobTransferApprovedInfo: showBulkJobTransferApprovedInfoMock,
  })
)

function renderMisc() {
  const queryClient = new QueryClient()
  const fullAbility = createMongoAbility<AppAbility>([{ action: 'manage', subject: 'all' }])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AbilityContext.Provider value={fullAbility}>{children}</AbilityContext.Provider>
    </QueryClientProvider>
  )
  return renderHook(
    () => useProposalDetailMisc({ proposalType: ProposalType.bulk_job_transfer, proposalId: 4975 }),
    { wrapper }
  )
}

// Regression (ClickUp 86ex81mk9 comment 90180243277844): rejecting a bulk job-transfer proposal
// incorrectly showed the "Đã duyệt đề xuất điều chuyển hàng loạt" (approved) info dialog. Root
// cause: the follow-up dialog was wired through a single onSuccess callback shared by both
// approve and reject. Assert it now fires only on approve, never on reject.
describe('useProposalDetailMisc — bulk job transfer approve/reject (86ex81mk9)', () => {
  beforeEach(() => {
    approveMutateAsync.mockClear()
    rejectMutateAsync.mockClear()
    showBulkJobTransferApprovedInfoMock.mockClear()
    act(() => useDialogStore.getState().closeDialog())
    act(() => useDialogStore.setState({ isOpen: false, config: null, closeTimeoutId: null }))
  })

  it('does NOT show the approved info dialog after rejecting', async () => {
    const user = userEvent.setup()
    const { result } = renderMisc()

    render(<>{result.current.customActions}</>)
    await user.click(screen.getByTitle('Từ chối đề xuất'))

    const config = useDialogStore.getState().config
    expect(config).toBeTruthy()

    const view = render(config!.content as React.ReactElement)
    await user.type(view.getByPlaceholderText('Nhập ghi chú'), 'Không đủ điều kiện')

    await act(async () => {
      await config!.onConfirm?.()
    })

    expect(rejectMutateAsync).toHaveBeenCalledTimes(1)
    expect(approveMutateAsync).not.toHaveBeenCalled()
    expect(showBulkJobTransferApprovedInfoMock).not.toHaveBeenCalled()
  })

  it('DOES show the approved info dialog after approving', async () => {
    const user = userEvent.setup()
    const { result } = renderMisc()

    render(<>{result.current.customActions}</>)
    await user.click(screen.getByTitle('Duyệt đề xuất'))

    const config = useDialogStore.getState().config
    expect(config).toBeTruthy()

    render(config!.content as React.ReactElement)

    await act(async () => {
      await config!.onConfirm?.()
    })

    expect(approveMutateAsync).toHaveBeenCalledTimes(1)
    expect(rejectMutateAsync).not.toHaveBeenCalled()
    expect(showBulkJobTransferApprovedInfoMock).toHaveBeenCalledTimes(1)
  })
})
