import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { Button } from '@/components/ui'
import { IconCheck } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { ReconciliationStatus as ReconStatus } from '@/constants/api-schema-aliases'
import type { InvestorReconciliation } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

import { useReconApprovalFlag } from '@/features/sales/_shared/reconciliation/useReconApprovalFlag'

// CASL subject for the per-reconciliation lifecycle permissions
// (`investor_reconciliation.<action>` → can('<action>', RECON_SUBJECT)).
const RECON_SUBJECT = 'investor_reconciliation'

/**
 * NOTE — UI DEFERRED (backend is now ready):
 * As of the 2026-06-03 schema regen the action serializers are FIXED: `submit`/`approve`/`confirm-deal`
 * take no body, `reject` = `{reject_reason}`, `void` = `{reason}`, `create-correction` = full
 * `InvestorReconciliationRequest`. The matching service hooks now exist
 * (`useSubmit/useApprove/useReject/useVoid/useConfirmInvestorReconciliationDeal/
 * useCreateCorrectionInvestorReconciliation`). This component is currently NOT mounted — the old mount
 * point (InvestorReconciliationItemsTable) was removed when the detail view became a read-only sheet
 * Form. Wiring the buttons to real mutations + a reason dialog (displayCustom) was intentionally
 * DEFERRED pending a decision on where per-reconciliation actions should live. Until then the handlers
 * surface an informational toast. When re-mounting, swap each handler to its hook, and pass the
 * confirm/approve mutation result through `showReconciliationWarnings` (utils/reconciliation-warnings)
 * so BE `warnings` (e.g. `investor_bonus_residual_outstanding`) surface as warning toasts — mirroring
 * the handling in InvestorReconciliationDetailPage/InvestorReconciliationListPage.
 */
const PENDING_BACKEND_MESSAGE = 'Chức năng đang chờ Backend hoàn thiện và sẽ được kết nối sau.'

type ReconAction = {
  key: string
  label: string
  /** CASL action (the `<action>` half of `investor_reconciliation.<action>`). */
  permission: string
  variant: 'primary' | 'secondary'
  danger?: boolean
  withCheckIcon?: boolean
}

type Props = {
  reconciliation: Pick<InvestorReconciliation, 'status'>
  className?: string
}

/**
 * Per-reconciliation lifecycle action bar. The visible action set is driven by:
 * - the approval feature flag ({@link useReconApprovalFlag}),
 * - the reconciliation `status`,
 * - the user's abilities (`investor_reconciliation.<action>`).
 *
 * Mounted per saved reconciliation row in the sheet detail. See the BACKEND-PENDING note above for why
 * the handlers are currently toast stubs.
 */
function InvestorReconciliationActions({ reconciliation, className }: Props) {
  const ability = useAbility()
  const requiresApproval = useReconApprovalFlag()
  const status = reconciliation.status

  const actions = useMemo<ReconAction[]>(() => {
    const list: ReconAction[] = []

    if (status === ReconStatus.draft) {
      if (requiresApproval) {
        list.push({
          key: 'submit',
          label: 'Trình duyệt',
          permission: 'submit',
          variant: 'primary',
          withCheckIcon: true,
        })
      } else {
        list.push({
          key: 'confirm_deal',
          label: 'Xác nhận',
          permission: 'confirm_deal',
          variant: 'primary',
          withCheckIcon: true,
        })
      }
    }

    if (status === ReconStatus.pending && requiresApproval) {
      list.push({
        key: 'approve',
        label: 'Duyệt',
        permission: 'approve',
        variant: 'primary',
        withCheckIcon: true,
      })
      list.push({
        key: 'reject',
        label: 'Từ chối',
        permission: 'reject',
        variant: 'secondary',
        danger: true,
      })
    }

    if (status === ReconStatus.confirmed) {
      list.push({
        key: 'create_correction',
        label: 'Tạo đợt sửa',
        permission: 'create_correction',
        variant: 'secondary',
      })
      list.push({
        key: 'void',
        label: 'Hủy',
        permission: 'void',
        variant: 'secondary',
        danger: true,
      })
    }

    return list.filter((action) => ability.can(action.permission, RECON_SUBJECT))
  }, [ability, requiresApproval, status])

  if (actions.length === 0) return null

  return (
    <Flex gap="2" wrap="wrap" align="center" className={className}>
      {actions.map((action) => (
        <Button
          key={action.key}
          size="small"
          variant={action.variant}
          leftIcon={action.withCheckIcon ? <IconCheck /> : undefined}
          onClick={() => toastService.info(PENDING_BACKEND_MESSAGE)}
          className={
            action.danger
              ? 'text-action-primary-red-default border-action-primary-red-default'
              : undefined
          }
          title={action.label}
        >
          {action.label}
        </Button>
      ))}
    </Flex>
  )
}

export default InvestorReconciliationActions
