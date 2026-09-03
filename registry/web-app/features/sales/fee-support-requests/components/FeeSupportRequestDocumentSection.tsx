import { useCallback, useMemo, useState } from 'react'

import AppDialog from '@/components/dialog/AppDialog'
import { DisplayField } from '@/components/commons/DisplayField'
import { Button, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { formatDate } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'

import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_ATTACHMENT_PURPOSE,
  FEE_SUPPORT_PERMISSION_SUBJECT,
  FeeSupportRequestDocument_status,
} from '../constants/fee-support-request-constants'
import {
  useApproveFeeSupportDocuments,
  useRejectFeeSupportDocuments,
  useReleaseFeeSupportHoldFull,
  useSupplementFeeSupportDocuments,
  type FeeSupportRequest,
} from '../services/fee-support-request-service'
import { bonusCutOf } from '../types/fee-support-request-types'
import FeeSupportDocumentStatusHero from './FeeSupportDocumentStatusHero'

type Props = {
  record: FeeSupportRequest
  /** Gọi sau mọi action thành công để trang cha invalidate query. */
  onChanged: () => void
}

type DialogKind = 'SUPPLEMENT' | 'APPROVE_DOCS' | 'REJECT_DOCS' | 'RELEASE_HOLD' | null

/**
 * Cắt khách ở BẤT KỲ pot nào đều mở tuyến hồ sơ kế toán (BE `_has_customer_cut`).
 * Bỏ sót cặp `_bonus_` ở đây sẽ ẩn mất cả khối nộp hồ sơ đúng với loại phiếu phổ
 * biến nhất — phiếu chỉ cắt khách phần thưởng — dù BE đã mở tuyến và đang chặn chi.
 */
function hasCustomerCut(record: FeeSupportRequest): boolean {
  const bonusCut = bonusCutOf(record)
  return Boolean(
    record.customer_discount_pct ||
      record.customer_discount_amount ||
      bonusCut.pct ||
      bonusCut.amount
  )
}

/**
 * Khối "Hồ sơ cắt khách" trên detail — action theo document_status (BE chốt 15/7):
 * - awaiting_docs: Nộp hồ sơ (sale) / Cần bổ sung hồ sơ (kế toán trả về) / Duyệt hồ sơ (kế toán).
 * - needs_supplement: chỉ Nộp hồ sơ (sale nộp lại).
 * - not_required & docs_approved: không có action.
 * Mở cờ giữ-đủ-tiền là action độc lập theo hold_full_until_paid.
 */
export default function FeeSupportRequestDocumentSection({ record, onChanged }: Props) {
  const ability = useAbility()

  const supplementMutation = useSupplementFeeSupportDocuments()
  const approveDocsMutation = useApproveFeeSupportDocuments()
  const rejectDocsMutation = useRejectFeeSupportDocuments()
  const releaseHoldMutation = useReleaseFeeSupportHoldFull()

  const [dialog, setDialog] = useState<DialogKind>(null)
  const [attachmentTokens, setAttachmentTokens] = useState<string[]>([])
  const [proxyName, setProxyName] = useState('')
  const [proxyIdNumber, setProxyIdNumber] = useState('')
  const [proxyPhone, setProxyPhone] = useState('')
  const [reviewReason, setReviewReason] = useState('')
  const [releaseNote, setReleaseNote] = useState('')

  const showSection = hasCustomerCut(record) || record.document_status !== 'not_required'

  const docsApproved = record.document_status === FeeSupportRequestDocument_status.docs_approved
  const hasAttachments = (record.attachments?.length ?? 0) > 0

  // Action theo document_status (BE chốt 15/7). BE quản trạng thái nên chỉ cần
  // gate theo document_status + quyền, không tự suy tiền đề từ ladder.
  const isAwaitingDocs = record.document_status === FeeSupportRequestDocument_status.awaiting_docs
  const isNeedsSupplement =
    record.document_status === FeeSupportRequestDocument_status.needs_supplement

  // Nộp hồ sơ (sale/admin): khi đang chờ hồ sơ hoặc bị kế toán trả về bổ sung.
  const canSubmitDocs =
    (isAwaitingDocs || isNeedsSupplement) &&
    ability.can(FEE_SUPPORT_ACTION.SUPPLEMENT_DOCUMENTS, FEE_SUPPORT_PERMISSION_SUBJECT)
  // Cần bổ sung hồ sơ (kế toán trả về) — chỉ khi đang chờ kế toán review.
  const canRequestSupplement =
    isAwaitingDocs &&
    ability.can(FEE_SUPPORT_ACTION.REJECT_DOCUMENTS, FEE_SUPPORT_PERMISSION_SUBJECT)
  // Duyệt hồ sơ (kế toán) — chỉ khi đang chờ kế toán review.
  const canApproveDocs =
    isAwaitingDocs &&
    ability.can(FEE_SUPPORT_ACTION.APPROVE_DOCUMENTS, FEE_SUPPORT_PERMISSION_SUBJECT)
  const canReleaseHold =
    record.hold_full_until_paid &&
    ability.can(FEE_SUPPORT_ACTION.RELEASE_HOLD_FULL, FEE_SUPPORT_PERMISSION_SUBJECT)

  const isDueOverdue = useMemo(() => {
    if (!record.documents_due_date || docsApproved) return false
    return new Date(record.documents_due_date) < new Date(new Date().toDateString())
  }, [record.documents_due_date, docsApproved])

  const closeDialog = useCallback(() => {
    setDialog(null)
    setAttachmentTokens([])
    setProxyName('')
    setProxyIdNumber('')
    setProxyPhone('')
    setReviewReason('')
    setReleaseNote('')
  }, [])

  const handleSupplement = useCallback(async () => {
    const hasFiles = attachmentTokens.length > 0
    const hasProxy = Boolean(proxyName.trim() || proxyIdNumber.trim() || proxyPhone.trim())
    // Mirror rule BE: mỗi lần gửi cần ít nhất 1 trong 2 khối.
    if (!hasFiles && !hasProxy) {
      toastService.error('Vui lòng đính kèm tài liệu hoặc nhập người-nhận-hộ')
      return
    }
    if (hasProxy && !proxyName.trim()) {
      toastService.error('Vui lòng nhập họ tên người-nhận-hộ')
      return
    }
    try {
      await supplementMutation.mutateAsync({
        id: record.id,
        data: {
          ...(hasFiles && { attachments: attachmentTokens }),
          ...(hasProxy && {
            proxy_recipient: {
              name: proxyName.trim(),
              id_number: proxyIdNumber.trim(),
              phone: proxyPhone.trim(),
            },
          }),
        },
      })
      toastService.success('Đã ghi nhận bổ sung hồ sơ')
      closeDialog()
      onChanged()
    } catch (err) {
      handleApiError(err)
    }
  }, [
    attachmentTokens,
    proxyName,
    proxyIdNumber,
    proxyPhone,
    record.id,
    supplementMutation,
    closeDialog,
    onChanged,
  ])

  const handleApproveDocs = useCallback(async () => {
    try {
      await approveDocsMutation.mutateAsync(record.id)
      toastService.success('Đã duyệt hồ sơ — khoản cắt khách chuyển sang người-nhận-hộ')
      closeDialog()
      onChanged()
    } catch (err) {
      // 400: thiếu proxy / hồ sơ rỗng / tiền đề chưa đủ / tiền đã chi (điều chỉnh)
      handleApiError(err)
    }
  }, [approveDocsMutation, record.id, closeDialog, onChanged])

  const handleRejectDocs = useCallback(async () => {
    if (!reviewReason.trim()) {
      toastService.error('Vui lòng nhập lý do yêu cầu bổ sung')
      return
    }
    try {
      await rejectDocsMutation.mutateAsync({ id: record.id, data: { reason: reviewReason.trim() } })
      toastService.success('Đã chuyển phiếu sang trạng thái cần bổ sung hồ sơ')
      closeDialog()
      onChanged()
    } catch (err) {
      handleApiError(err)
    }
  }, [rejectDocsMutation, record.id, reviewReason, closeDialog, onChanged])

  const handleReleaseHold = useCallback(async () => {
    try {
      await releaseHoldMutation.mutateAsync({
        id: record.id,
        data: releaseNote.trim() ? { note: releaseNote.trim() } : undefined,
      })
      toastService.success('Đã mở cờ giữ-đủ-tiền')
      closeDialog()
      onChanged()
    } catch (err) {
      handleApiError(err)
    }
  }, [releaseHoldMutation, record.id, releaseNote, closeDialog, onChanged])

  if (!showSection) return null

  const hasProxyBound = Boolean(record.proxy_recipient_collaborator)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="typo-body-xl-semibold text-content-dark-1">
          Hồ sơ cắt khách (kế toán duyệt)
        </span>
        <div className="flex items-center gap-3">
          {canSubmitDocs && (
            <Button variant="secondary-border" size="small" onClick={() => setDialog('SUPPLEMENT')}>
              Nộp hồ sơ
            </Button>
          )}
          {canRequestSupplement && (
            <Button
              variant="secondary-border"
              size="small"
              onClick={() => setDialog('REJECT_DOCS')}
            >
              Cần bổ sung hồ sơ
            </Button>
          )}
          {canApproveDocs && (
            <Button variant="primary" size="small" onClick={() => setDialog('APPROVE_DOCS')}>
              Duyệt hồ sơ
            </Button>
          )}
          {canReleaseHold && (
            <Button
              variant="secondary-border"
              size="small"
              onClick={() => setDialog('RELEASE_HOLD')}
            >
              Mở giữ-đủ-tiền
            </Button>
          )}
        </div>
      </div>

      {/* Banner HOLD giải ngân (gate D22) — BE trả message nguyên văn */}
      {record.hold_reason && (
        <div className="rounded-lg border border-solid border-amber-300 bg-amber-50 px-4 py-3">
          <span className="typo-body-sm-regular text-amber-800">
            Hoa hồng căn đang tạm giữ: {record.hold_reason}
          </span>
        </div>
      )}

      <div className="border-border-1 bg-surface-primary-default flex flex-col gap-6 rounded-xl border p-6">
        <FeeSupportDocumentStatusHero
          status={record.document_status}
          reviewNote={record.documents_review_note}
          hasAttachments={hasAttachments}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DisplayField
            label="Hạn nộp hồ sơ"
            value={
              record.documents_due_date ? (
                <span className={isDueOverdue ? 'text-action-primary-red-default' : undefined}>
                  {formatDate(record.documents_due_date)}
                  {isDueOverdue ? ' (quá hạn)' : ''}
                </span>
              ) : (
                '—'
              )
            }
          />
          <DisplayField
            label="Upload gần nhất"
            value={record.documents_submitted_at ? formatDate(record.documents_submitted_at) : '—'}
          />
          <DisplayField
            label="Kế toán xử lý lúc"
            value={record.documents_reviewed_at ? formatDate(record.documents_reviewed_at) : '—'}
          />
          <DisplayField
            label="Giữ đủ tiền tới khi CĐT trả đủ"
            value={record.hold_full_until_paid ? 'Có' : 'Không'}
          />
          <DisplayField
            label="Người-nhận-hộ"
            value={
              hasProxyBound
                ? `${record.proxy_recipient_name}${record.proxy_recipient_phone ? ` — ${record.proxy_recipient_phone}` : ''}`
                : 'Chưa khai (bắt buộc trước khi kế toán duyệt)'
            }
          />
          <DisplayField
            label="CCCD người-nhận-hộ"
            value={record.proxy_recipient_id_number || '—'}
          />
        </div>

        {hasProxyBound && !docsApproved && (
          <span className="typo-body-sm-regular text-content-dark-3">
            Người-nhận-hộ mới được ghi nhận — khoản cắt khách chỉ chuyển sang họ khi kế toán duyệt
            hồ sơ.
          </span>
        )}

        {/* Danh sách tài liệu — gồm cả giấy chấp thuận GĐ dự án lúc tạo lẫn hồ sơ bổ sung */}
        <div className="flex flex-col gap-2">
          <span className="typo-body-base-semibold text-content-dark-2">
            Tài liệu ({record.attachments?.length ?? 0})
          </span>
          {record.attachments?.length ? (
            <ul className="flex list-none flex-col gap-1 p-0">
              {record.attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-3">
                  {file.view_url ? (
                    <a
                      href={file.view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="typo-body-sm-regular text-action-primary-default underline"
                    >
                      {file.file_name}
                    </a>
                  ) : (
                    <span className="typo-body-sm-regular">{file.file_name}</span>
                  )}
                  {file.download_url && (
                    <a
                      href={file.download_url}
                      className="typo-body-sm-regular text-content-dark-3 underline"
                    >
                      Tải về
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="typo-body-sm-regular text-content-dark-3">Chưa có tài liệu</span>
          )}
        </div>
      </div>

      {/* Dialog: sale/admin bổ sung hồ sơ + người-nhận-hộ */}
      <AppDialog
        open={dialog === 'SUPPLEMENT'}
        onOpenChange={(open) => !open && closeDialog()}
        onCancel={closeDialog}
        title="Nộp hồ sơ cắt khách"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleSupplement}
        loading={supplementMutation.isPending}
        confirmText="Nộp hồ sơ"
        cancelText="Hủy"
        content={
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-2">
              <span className="typo-body-base-semibold text-content-dark-3">
                Tài liệu bổ sung (đơn khách ký, hợp đồng CTV, video xác nhận...)
              </span>
              <FileUpload
                multiple
                purpose={FEE_SUPPORT_ATTACHMENT_PURPOSE}
                value={attachmentTokens}
                onChange={(tokens: string[]) => setAttachmentTokens(tokens)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="typo-body-base-semibold text-content-dark-3">
                Người-nhận-hộ (CTV nhận khoản cắt khách hộ khách hàng)
              </span>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <TextField label="Họ tên" value={proxyName} onChange={setProxyName} />
                <TextField label="CCCD" value={proxyIdNumber} onChange={setProxyIdNumber} />
                <TextField label="Số điện thoại" value={proxyPhone} onChange={setProxyPhone} />
              </div>
              <span className="typo-body-sm-regular text-content-dark-3">
                Mỗi lần gửi cần ít nhất tài liệu hoặc người-nhận-hộ. Hệ thống tự khớp CTV theo
                CCCD/SĐT; người-nhận-hộ không được là nhân sự bán tham gia giao dịch.
              </span>
            </div>
          </div>
        }
      />

      {/* Dialog: kế toán duyệt hồ sơ */}
      <AppDialog
        open={dialog === 'APPROVE_DOCS'}
        onOpenChange={(open) => !open && closeDialog()}
        onCancel={closeDialog}
        title="Duyệt hồ sơ cắt khách"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleApproveDocs}
        loading={approveDocsMutation.isPending}
        confirmText="Duyệt hồ sơ"
        cancelText="Hủy"
        content={
          <p className="typo-body-base text-content-dark-1 pt-4">
            Duyệt hồ sơ phiếu <strong>{record.code}</strong>? Khoản cắt khách sẽ chuyển sang
            người-nhận-hộ và hoa hồng căn được mở giải ngân theo tiến độ.
          </p>
        }
      />

      {/* Dialog: kế toán yêu cầu bổ sung */}
      <AppDialog
        open={dialog === 'REJECT_DOCS'}
        onOpenChange={(open) => !open && closeDialog()}
        onCancel={closeDialog}
        title="Yêu cầu bổ sung hồ sơ"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleRejectDocs}
        loading={rejectDocsMutation.isPending}
        confirmText="Yêu cầu bổ sung"
        cancelText="Hủy"
        content={
          <div className="flex flex-col gap-3 pt-4">
            <span className="typo-body-base-semibold text-content-dark-3">
              Lý do <span className="text-action-primary-red-default">*</span>
            </span>
            <TextArea
              placeholder="Hồ sơ thiếu gì, cần bổ sung gì..."
              value={reviewReason}
              onChange={(val) => setReviewReason(val)}
              rows={4}
              maxCharacters={1000}
            />
            <span className="text-content-dark-3 typo-body-sm-regular">
              Sale bổ sung tài liệu là phiếu tự quay lại hàng đợi kế toán.
            </span>
          </div>
        }
      />

      {/* Dialog: kế toán mở giữ-đủ-tiền */}
      <AppDialog
        open={dialog === 'RELEASE_HOLD'}
        onOpenChange={(open) => !open && closeDialog()}
        onCancel={closeDialog}
        title="Mở cờ giữ-đủ-tiền"
        variant="custom"
        isHideCancelButton={false}
        onConfirm={handleReleaseHold}
        loading={releaseHoldMutation.isPending}
        confirmText="Mở giữ"
        cancelText="Hủy"
        content={
          <div className="flex flex-col gap-3 pt-4">
            <p className="typo-body-base text-content-dark-1">
              Phiếu đang giữ toàn bộ hoa hồng tới khi CĐT trả đủ. Mở tay khi đã có căn cứ thu đủ
              (cấn trừ, lệch lẻ...).
            </p>
            <TextArea
              placeholder="Ghi chú căn cứ (không bắt buộc)"
              value={releaseNote}
              onChange={(val) => setReleaseNote(val)}
              rows={3}
              maxCharacters={500}
            />
          </div>
        }
      />
    </div>
  )
}
