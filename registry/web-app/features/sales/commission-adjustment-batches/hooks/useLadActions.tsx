import { useState } from 'react'
import { Button, TextArea, Text } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

import { LAD_SUBMIT_ERROR } from '../constants/lad-constants'
import {
  useApproveLad,
  useCloneLad,
  useDeleteLadBatch,
  useRejectLad,
  useRevertLadToDraft,
  useSubmitLad,
} from '../services/commission-adjustment-batch-service'

interface SubmitCallbacks {
  onApplied?: (batchId: number) => void
  onPending?: (batchId: number) => void
  /** GD still `expected` — caller should highlight + send user back to scope. */
  onUnconfirmed?: (dealIds: number[]) => void
  /** payload violated revenue ≤ agency fee — caller should send user back to config. */
  onRevenueError?: () => void
}

/** Parse the submit 400 body (API-Usage §4.3) defensively (error may be nested under `.error`). */
function parseSubmitError(err: unknown): { code?: string; unconfirmedDealIds?: number[] } {
  const root = (err ?? {}) as Record<string, unknown>
  const body = (typeof root.error === 'object' && root.error ? root.error : root) as Record<
    string,
    unknown
  >
  const code = typeof body.code === 'string' ? body.code : undefined
  const ids = Array.isArray(body.unconfirmed_deal_ids)
    ? (body.unconfirmed_deal_ids.filter((x) => typeof x === 'number') as number[])
    : undefined
  return { code, unconfirmedDealIds: ids }
}

/**
 * Workflow actions for a LAD batch: submit → pending (§4.3 error routing), approve/reject,
 * revert-to-draft, clone, delete. Confirm/reject prompts go through the global dialog system.
 */
export function useLadActions() {
  const { displayConfirm, displayCustom, displayClose } = useDialog()
  const submit = useSubmitLad()
  const approve = useApproveLad()
  const reject = useRejectLad()
  const clone = useCloneLad()
  const destroy = useDeleteLadBatch()
  const revert = useRevertLadToDraft()

  const isBusy =
    submit.isPending ||
    approve.isPending ||
    reject.isPending ||
    clone.isPending ||
    destroy.isPending ||
    revert.isPending

  const submitBatch = async (batchId: number, cb: SubmitCallbacks) => {
    try {
      const res = await submit.mutateAsync(batchId)
      if (res?.status === 'pending') cb.onPending?.(batchId)
      else cb.onApplied?.(batchId)
    } catch (err) {
      const { code, unconfirmedDealIds } = parseSubmitError(err)
      if (code === LAD_SUBMIT_ERROR.UNCONFIRMED_LINES) {
        cb.onUnconfirmed?.(unconfirmedDealIds ?? [])
        toastService.error('Còn giao dịch chưa xác nhận — vui lòng xác nhận hoặc loại khỏi lô.')
      } else if (code === LAD_SUBMIT_ERROR.REVENUE_EXCEEDS_AGENCY_FEE) {
        cb.onRevenueError?.()
        toastService.error('Tỉ lệ doanh thu vượt quá phí đại lý — vui lòng sửa cấu hình.')
      } else {
        toastService.error(extractErrorMessage(err))
      }
    }
  }

  const confirmDelete = (batchId: number, onDone?: () => void) => {
    displayConfirm({
      title: 'Xóa lô nháp',
      content:
        'Toàn bộ phạm vi, cấu hình và chứng từ đã đính kèm sẽ bị xoá. Không thể khôi phục. Bạn có chắc?',
      confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          await destroy.mutateAsync(batchId)
          toastService.success('Đã xóa lô nháp.')
          onDone?.()
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }

  const confirmClone = async (batchId: number, onCloned?: (newId: number) => void) => {
    displayConfirm({
      title: 'Nhân bản lô',
      content:
        'Tạo một lô nháp mới từ lô này (copy phạm vi + cấu hình; các GD đã xác nhận chuyển về dự kiến để xác nhận lại). Tiếp tục?',
      confirmText: 'Nhân bản',
      onConfirm: async () => {
        try {
          const res = await clone.mutateAsync(batchId)
          if (res?.id) {
            toastService.success('Đã tạo lô nháp mới.')
            onCloned?.(res.id)
          }
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }

  // Đưa lô pending về draft để tiếp tục chỉnh sửa (nghịch của "Chuyển sang dự kiến"). Body rỗng.
  const confirmRevertToDraft = (batchId: number, onDone?: () => void) => {
    displayConfirm({
      title: 'Quay lại trạng thái nháp',
      content:
        'Đưa lô về trạng thái nháp để tiếp tục chỉnh sửa? Các giao dịch chưa loại trừ trong lô cũng sẽ trở về nháp.',
      confirmText: 'Quay lại nháp',
      onConfirm: async () => {
        try {
          await revert.mutateAsync(batchId)
          toastService.success('Đã đưa lô về trạng thái nháp.')
          onDone?.()
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }

  const confirmApprove = (batchId: number, onDone?: () => void) => {
    displayConfirm({
      title: 'Áp dụng lô',
      content:
        'Sau khi áp dụng lô sẽ không đảo ngược được mà phải tạo lô mới để chỉnh sửa lại các giao dịch này',
      confirmText: 'Áp dụng',
      onConfirm: async () => {
        try {
          await approve.mutateAsync({ id: batchId })
          toastService.success('Đã áp dụng lô.')
          onDone?.()
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }

  const promptReject = (batchId: number, onDone?: () => void) => {
    displayCustom({
      title: 'Hủy áp dụng lô',
      size: 'md',
      hideFooter: true,
      content: (
        <LadRejectDialogContent
          onCancel={() => displayClose()}
          onSubmit={async (rejectReason) => {
            try {
              await reject.mutateAsync({ id: batchId, data: { reject_reason: rejectReason } })
              toastService.success('Đã hủy áp dụng lô. Người tạo sẽ nhận thông báo kèm lý do.')
              displayClose()
              onDone?.()
            } catch (err) {
              toastService.error(extractErrorMessage(err))
            }
          }}
        />
      ),
    })
  }

  return {
    submitBatch,
    confirmDelete,
    confirmClone,
    confirmApprove,
    promptReject,
    confirmRevertToDraft,
    isBusy,
  }
}

interface LadRejectDialogContentProps {
  onSubmit: (rejectReason: string) => void | Promise<void>
  onCancel: () => void
}

function LadRejectDialogContent({ onSubmit, onCancel }: LadRejectDialogContentProps) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-4">
      <Text className="typo-body-sm-regular text-content-dark-2">
        Lô sẽ về trạng thái nháp. Người tạo nhận thông báo kèm lý do.
      </Text>
      <TextArea
        label="Lý do hủy áp dụng"
        placeholder="Nhập lý do hủy áp dụng..."
        value={reason}
        onChange={(v) => setReason(v)}
        rows={3}
      />
      <div className="flex justify-end gap-3">
        <Button variant="secondary-border" onClick={onCancel}>
          Huỷ
        </Button>
        <Button variant="primary" onClick={() => onSubmit(reason)} disabled={!reason.trim()}>
          Xác nhận hủy áp dụng
        </Button>
      </div>
    </div>
  )
}

export default useLadActions
