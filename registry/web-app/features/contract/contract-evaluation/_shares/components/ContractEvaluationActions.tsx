import { Button } from '@/components/ui'
import type { ContractEvaluation } from '@/features/contract/services/contract-evaluation-hr-service'

type ContractEvaluationActionsProps = {
  /**
   * The evaluation we're acting on. Action visibility is driven entirely by the
   * server-provided `allow_actions` block — the BE computes it from the user's
   * permission + relationship + status, so the buttons and the server-side guard
   * never diverge.
   */
  evaluation: Pick<ContractEvaluation, 'id' | 'status' | 'allow_actions'>
  /** Manager + HR: approve at the current step. */
  onDecide?: () => void
  /** Manager + HR: reject + reason (shares the `decide` affordance). */
  onReject?: () => void
  /** HR-only: reassign the current pending approver. */
  onReassign?: () => void
  /** HR-only: revoke the latest approval. */
  onRevoke?: () => void
  className?: string
}

/**
 * Workflow action buttons for a Contract Evaluation, rendered from the server's
 * `allow_actions` affordances:
 *  - `decide`   → Phê duyệt + Từ chối (same pending-approver gate, `/decision/`)
 *  - `reassign` → Chuyển người duyệt (HR-only by construction)
 *  - `revoke`   → Thu hồi phê duyệt (HR-only)
 *
 * `edit` / `submit` affordances are handled elsewhere (PageTitle's Edit handler /
 * mobile-only submit). Pass via PageTitle's `customActions` slot.
 */
const ContractEvaluationActions = ({
  evaluation,
  onDecide,
  onReject,
  onReassign,
  onRevoke,
  className,
}: ContractEvaluationActionsProps) => {
  const actions = evaluation.allow_actions

  const showDecide = !!actions?.decide && !!onDecide
  const showReject = !!actions?.decide && !!onReject
  const showReassign = !!actions?.reassign && !!onReassign
  const showRevoke = !!actions?.revoke && !!onRevoke

  if (!showDecide && !showReject && !showReassign && !showRevoke) {
    return null
  }

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      {showReassign && (
        <Button variant="secondary" onClick={onReassign}>
          Chuyển người duyệt
        </Button>
      )}
      {showRevoke && (
        <Button variant="secondary" onClick={onRevoke}>
          Thu hồi phê duyệt
        </Button>
      )}
      {showReject && (
        <Button
          variant="secondary"
          onClick={onReject}
          className="border-action-primary-red-default text-action-primary-red-default hover:bg-action-primary-red-disabled"
        >
          Từ chối
        </Button>
      )}
      {showDecide && <Button onClick={onDecide}>Phê duyệt</Button>}
    </div>
  )
}

export default ContractEvaluationActions
