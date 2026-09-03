import type { ProposalApproveRequest } from '@/services'
import type { ApproveContentConfig } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalApproveReject'
import OvertimeWorkApproveDialogContent from '@/features/decision-and-proposal/proposal/overtime-work/view/OvertimeWorkApproveDialogContent.tsx'
import AssetAllocationApproveDialogContent from '@/features/decision-and-proposal/proposal/asset-allocation/view/AssetAllocationApproveDialogContent.tsx'
import type {
  ProposalOvertimeWork,
  ProposalOvertimeWorkApproveRequest,
  ProposalAssetAllocation,
  ProposalAssetAllocationApproveRequest,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ProposalType } from '@/constants/api-schema-aliases'

/**
 * Approve payload across misc proposal types. All members carry only optional fields, so a value
 * of this union is assignable to each type-specific approve endpoint (extra fields are ignored
 * server-side by types that don't expect them).
 */
export type MiscApprovePayload =
  | ProposalApproveRequest
  | ProposalOvertimeWorkApproveRequest
  | ProposalAssetAllocationApproveRequest

/** Collections the type-specific approve dialogs read from a proposal (all optional). */
type ApproveEditableProposal = {
  overtime_entries?: ProposalOvertimeWork['overtime_entries']
  assets?: ProposalAssetAllocation['assets']
}

/**
 * Build the dedicated approve-dialog config for a proposal type, or `undefined` for types that
 * use the default note-only dialog. Shared by the detail page and the list row actions so both
 * surfaces open the exact same dialog (overtime per-day hours / asset-allocation asset editing).
 */
export function buildProposalApproveContent(
  proposalType: ProposalType | null,
  proposal: unknown
): ApproveContentConfig<MiscApprovePayload> | undefined {
  const editable = proposal as ApproveEditableProposal | null | undefined

  if (proposalType === ProposalType.overtime_work) {
    const entries = editable?.overtime_entries ?? []
    return {
      render: (setRef) => <OvertimeWorkApproveDialogContent ref={setRef} entries={entries} />,
      dialogSize: '2xl',
      scrollable: true,
    }
  }

  if (proposalType === ProposalType.asset_allocation) {
    const assets = editable?.assets ?? []
    return {
      render: (setRef) => <AssetAllocationApproveDialogContent ref={setRef} assets={assets} />,
      dialogSize: '2xl',
      scrollable: true,
    }
  }

  return undefined
}
