import { Button } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import { LAD_SUBJECT } from '../constants/lad-constants'
import { useLadActions } from '../hooks/useLadActions'
import { Flex, Grid } from '@radix-ui/themes'

interface LadApprovalActionsProps {
  batchId: number
  onDone?: () => void
  /** Sau khi đưa lô về nháp — mở màn chỉnh sửa để "tiếp tục chỉnh sửa" (fallback: onDone). */
  onReverted?: () => void
}

/**
 * Actions khi lô `pending`: người duyệt bấm Áp dụng lô / Hủy áp dụng lô; người tạo có thể
 * "Quay lại trạng thái Nháp để tiếp tục chỉnh sửa". Gated by `approve` / `reject` / `submit`
 * (revert là hành động nghịch của submit nên gate cùng quyền `submit`).
 */
export function LadApprovalActions({ batchId, onDone, onReverted }: LadApprovalActionsProps) {
  const ability = useAbility()
  const { confirmApprove, promptReject, confirmRevertToDraft, isBusy } = useLadActions()

  const canApprove = ability.can('approve', LAD_SUBJECT)
  const canReject = ability.can('reject', LAD_SUBJECT)
  const canRevert = ability.can('submit', LAD_SUBJECT)

  if (!canApprove && !canReject && !canRevert) return null

  return (
    <>
      <Grid columns={canRevert && (canReject || canApprove) ? '2' : '1'} gap={'4'}>
        {canRevert && (
          <Flex>
            <Button
              variant="secondary-border"
              onClick={() => confirmRevertToDraft(batchId, onReverted ?? onDone)}
              disabled={isBusy}
            >
              Quay lại trạng thái Nháp để tiếp tục chỉnh sửa
            </Button>
          </Flex>
        )}
        {(canReject || canApprove) && (
          <>
            <Flex direction={'column'} gap={'2'}>
              {canApprove && (
                <Button
                  variant="primary"
                  onClick={() => confirmApprove(batchId, onDone)}
                  disabled={isBusy}
                >
                  Áp dụng lô
                </Button>
              )}
              {canReject && (
                <Button
                  variant="secondary-border"
                  onClick={() => promptReject(batchId, onDone)}
                  disabled={isBusy}
                >
                  Hủy áp dụng lô
                </Button>
              )}
            </Flex>
          </>
        )}
      </Grid>
    </>
  )
}

export default LadApprovalActions
