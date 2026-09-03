import { useCallback, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { BlockerList } from '@/components/commons'
import { Button, TextArea } from '@/components/ui'
import { DotLoader } from '@/components/ui/dot-loader'
import {
  useRevertInvestorReconciliationSheet,
  useRevertInvestorReconciliationSheetPreview,
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
 * Mã các đối tượng bị tác động — gấp lại, mở ra khi cần tra.
 *
 * BE trả mã CĂN (không phải mã dòng đối chiếu): mã căn là thứ kế toán nhận ra,
 * còn `MT-IRS0011-F2-004` không xuất hiện trên màn hình nào họ thao tác được.
 */
const CodeList = ({ codes }: { codes: string[] }) => {
  if (codes.length === 0) return null
  return (
    <details className="mt-1">
      <summary className="typo-body-sm-regular text-content-dark-3 cursor-pointer select-none">
        Xem {codes.length} mã
      </summary>
      <p className="typo-body-sm-regular text-content-dark-3 mt-1 break-words">
        {codes.join(', ')}
      </p>
    </details>
  )
}

const ActionItem = ({ action }: { action: RevertInvestorSheetAutoAction }) => (
  <li>
    <span className="typo-body-sm-semibold text-content-dark-1">{action.title}</span>
    {action.detail ? (
      <span className="typo-body-sm-regular text-content-dark-2"> — {action.detail}</span>
    ) : null}
    <CodeList codes={action.codes ?? []} />
  </li>
)

/**
 * Hai khối tách theo hậu quả, không phải một danh sách phẳng.
 *
 * Bản đầu đổ mọi auto-action vào cùng một danh sách bullet: dòng trấn an ("giữ
 * nguyên 68 dòng căn") nằm ngang hàng với dòng phá huỷ ("huỷ 52 phiếu con"), và
 * mã của từng đối tượng được nhồi thẳng vào câu nên 52 mã phiếu chiếm 8 dòng chữ,
 * đẩy ô Lý do khỏi màn hình. Nhóm theo `kind` do BE trả về — không tự suy từ
 * `code` ở FE, để lần sau BE thêm hành động mới thì nhóm không bị lệch.
 */
const AutoActionList = ({
  items,
  warnings,
}: {
  items: RevertInvestorSheetAutoAction[]
  warnings: string[]
}) => {
  const kept = items.filter((action) => action.kind === 'keep')
  const destroyed = items.filter((action) => action.kind === 'destroy')
  const changed = items.filter((action) => action.kind !== 'keep' && action.kind !== 'destroy')

  return (
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="1">
        <span className="typo-body-base-semibold text-content-dark-1">Được giữ nguyên</span>
        <ul className="typo-body-sm-regular text-content-dark-2 list-disc pl-5">
          <li>Phiếu về trạng thái Nháp, các dòng căn vẫn ở đó để bạn sửa</li>
          {kept.map((action, index) => (
            <ActionItem key={`keep-${action.code}-${index}`} action={action} />
          ))}
        </ul>
      </Flex>

      {destroyed.length > 0 && (
        <Flex
          direction="column"
          gap="1"
          className="border-data-red-default bg-data-red-disabled rounded-md border-l-4 px-4 py-3"
        >
          <span className="typo-body-base-semibold text-content-dark-1">Sẽ bị huỷ</span>
          <ul className="typo-body-sm-regular text-content-dark-2 list-disc pl-5">
            {destroyed.map((action, index) => (
              <ActionItem key={`destroy-${action.code}-${index}`} action={action} />
            ))}
          </ul>
        </Flex>
      )}

      {(changed.length > 0 || warnings.length > 0) && (
        <Flex direction="column" gap="1">
          <span className="typo-body-base-semibold text-content-dark-1">Thay đổi khác</span>
          <ul className="typo-body-sm-regular text-content-dark-2 list-disc pl-5">
            {changed.map((action, index) => (
              <ActionItem key={`change-${action.code}-${index}`} action={action} />
            ))}
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`}>{warning}</li>
            ))}
          </ul>
        </Flex>
      )}
    </Flex>
  )
}

/**
 * Dialog đưa phiếu đối chiếu CĐT đã xác nhận về nháp để sửa. Đây KHÔNG phải huỷ phiếu:
 * các dòng căn giữ nguyên mã và toàn bộ số liệu, chỉ quay về Nháp để sửa rồi duyệt lại.
 *
 * Hai khối cố định: "Chưa đưa về nháp được vì" (blocker kèm việc phải làm trước) và
 * "Khi đưa về nháp, hệ thống sẽ" (việc BE tự làm).
 *
 * Bị chặn thì vẫn mở được dialog để đọc lý do — ẩn nút đi thì người dùng không biết
 * đường xử lý. Nút xác nhận mới là thứ bị khoá.
 */
const RevertInvestorReconciliationDialog = ({ sheetId, sheetCode, onClose, onSuccess }: Props) => {
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>()
  // Blocker phát sinh lúc submit (state đổi sau khi xem trước) — hiển thị đè lên preview.
  const [submitBlockers, setSubmitBlockers] = useState<ApiBlocker[] | null>(null)

  const { data: preview, isLoading } = useRevertInvestorReconciliationSheetPreview(sheetId)
  const { mutateAsync: revertSheet, isPending } = useRevertInvestorReconciliationSheet()
  const { invalidateByPrefix } = useInvalidateQueries()

  const blockers = useMemo<ApiBlocker[]>(
    () => submitBlockers ?? preview?.blockers ?? [],
    [submitBlockers, preview?.blockers]
  )
  const revertable = blockers.length === 0 && !!preview?.revertable

  const handleConfirm = useCallback(async () => {
    if (!reason.trim()) {
      setReasonError('Vui lòng nhập lý do đưa về nháp')
      return
    }
    setReasonError(undefined)
    try {
      await revertSheet({ id: sheetId, data: { reason: reason.trim() } })
      await invalidateByPrefix('sales')
      toastService.success(`Đã đưa phiếu ${sheetCode} về nháp`)
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
  }, [invalidateByPrefix, onClose, onSuccess, reason, revertSheet, sheetCode, sheetId])

  if (isLoading) {
    return (
      <Flex justify="center" align="center" className="py-10">
        <DotLoader />
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <p className="typo-body-base-regular text-content-dark-2">
        Đưa phiếu đối chiếu{' '}
        <b className="typo-body-base-semibold text-content-dark-1">{sheetCode}</b> về nháp sẽ đảo
        lại những gì việc xác nhận đã thay đổi. Các dòng căn{' '}
        <b className="typo-body-base-semibold text-content-dark-1">giữ nguyên mã và số liệu</b> —
        bạn sửa chỗ sai rồi duyệt lại, không phải nhập lại từ đầu.
      </p>

      {blockers.length > 0 && <BlockerList heading="Chưa đưa về nháp được vì" items={blockers} />}

      {revertable && (
        <AutoActionList items={preview?.auto_actions ?? []} warnings={preview?.warnings ?? []} />
      )}

      {revertable && (
        <TextArea
          label="Lý do đưa về nháp"
          required
          rows={2}
          placeholder="Ví dụ: sai tiến độ kỳ 2"
          value={reason}
          onChange={setReason}
          error={reasonError}
        />
      )}

      <Flex justify="end" gap="2">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        {revertable && (
          <Button variant="primary" loading={isPending} onClick={handleConfirm}>
            Xác nhận đưa về nháp
          </Button>
        )}
      </Flex>
    </Flex>
  )
}

export default RevertInvestorReconciliationDialog
