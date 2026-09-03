import { useCallback, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { BlockerList } from '@/components/commons'
import { Button, TextArea } from '@/components/ui'
import { DotLoader } from '@/components/ui/dot-loader'
import {
  useVoidInvestorReconciliationSheet,
  useVoidInvestorReconciliationSheetPreview,
  type RevertInvestorSheetAutoAction,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { extractBlockers, extractErrorMessage, type ApiBlocker } from '@/utils/error-utils'

type Props = {
  sheetId: number
  sheetCode: string
  onClose: () => void
  onSuccess?: () => void
}

/**
 * Dialog huỷ bỏ phiếu đối chiếu CĐT đang ở NHÁP.
 *
 * Khác `RevertInvestorReconciliationDialog`: đưa về nháp là để SỬA rồi duyệt lại,
 * còn huỷ bỏ là chết hẳn — phiếu không quay lại được, muốn làm lại thì tạo phiếu mới.
 * Nói rõ điều đó trong phần mô tả, vì hai nút nằm cạnh nhau trên cùng màn hình.
 *
 * Vì sao huỷ bỏ chứ không xoá: phiếu đã từng xác nhận vẫn còn hoá đơn đã huỷ và các
 * phiếu F2/CTV lịch sử trỏ vào nó bằng khoá ngoại PROTECT, nên DELETE không bao giờ
 * qua được. Huỷ bỏ đánh dấu phiếu chết mà không đụng tới các chứng từ đó.
 *
 * Bị chặn thì vẫn mở được dialog để đọc lý do — ẩn nút đi thì người dùng không biết
 * đường xử lý. Nút xác nhận mới là thứ bị khoá.
 */
const VoidInvestorReconciliationDialog = ({ sheetId, sheetCode, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>()
  // Blocker phát sinh lúc submit (state đổi sau khi xem trước) — hiển thị đè lên preview.
  const [submitBlockers, setSubmitBlockers] = useState<ApiBlocker[] | null>(null)

  const { data: preview, isLoading } = useVoidInvestorReconciliationSheetPreview(sheetId)
  const { mutateAsync: voidSheet, isPending } = useVoidInvestorReconciliationSheet()
  const { invalidateByPrefix } = useInvalidateQueries()

  const blockers = useMemo<ApiBlocker[]>(
    () => submitBlockers ?? preview?.blockers ?? [],
    [submitBlockers, preview?.blockers]
  )
  const voidable = blockers.length === 0 && !!preview?.voidable

  const handleConfirm = useCallback(async () => {
    if (!reason.trim()) {
      setReasonError('Vui lòng nhập lý do huỷ bỏ')
      return
    }
    setReasonError(undefined)
    try {
      await voidSheet({ id: sheetId, data: { reason: reason.trim() } })
      await invalidateByPrefix('sales')
      toastService.success(`Đã huỷ bỏ phiếu ${sheetCode}`)
      onSuccess?.()
      onClose()
    } catch (error) {
      const nextBlockers = extractBlockers(error)
      if (nextBlockers.length > 0) {
        setSubmitBlockers(nextBlockers)
        return
      }
      toastService.error(extractErrorMessage(error))
    }
  }, [invalidateByPrefix, onClose, onSuccess, reason, sheetCode, sheetId, voidSheet])

  if (isLoading) {
    return (
      <Flex justify="center" align="center" className="py-10">
        <DotLoader />
      </Flex>
    )
  }

  const autoActions: RevertInvestorSheetAutoAction[] = preview?.auto_actions ?? []

  return (
    <Flex direction="column" gap="4">
      <p className="typo-body-base-regular text-content-dark-2">
        Huỷ bỏ phiếu đối chiếu{' '}
        <b className="typo-body-base-semibold text-content-dark-1">{sheetCode}</b>. Phiếu vẫn được
        lưu để tra cứu nhưng{' '}
        <b className="typo-body-base-semibold text-content-dark-1">không dùng lại được</b> — muốn
        làm lại thì tạo phiếu mới.
      </p>

      {blockers.length > 0 && <BlockerList heading="Chưa huỷ bỏ được vì" items={blockers} />}

      {voidable && autoActions.length > 0 && (
        <Flex
          direction="column"
          gap="1"
          className="border-data-red-default bg-data-red-disabled rounded-md border-l-4 px-4 py-3"
        >
          <span className="typo-body-base-semibold text-content-dark-1">
            Khi huỷ bỏ, hệ thống sẽ
          </span>
          <ul className="typo-body-sm-regular text-content-dark-2 list-disc pl-5">
            {autoActions.map((action, index) => (
              <li key={`${action.code}-${index}`}>
                <span className="typo-body-sm-semibold text-content-dark-1">{action.title}</span>
                {action.detail ? (
                  <span className="typo-body-sm-regular text-content-dark-2">
                    {' '}
                    — {action.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Flex>
      )}

      {voidable && (
        <TextArea
          label="Lý do huỷ bỏ"
          required
          rows={2}
          placeholder="Ví dụ: nhập nhầm kỳ đối chiếu"
          value={reason}
          onChange={setReason}
          error={reasonError}
        />
      )}

      <Flex justify="end" gap="2">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        {voidable && (
          <Button variant="primary" loading={isPending} onClick={handleConfirm}>
            Xác nhận huỷ bỏ
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

export default VoidInvestorReconciliationDialog
