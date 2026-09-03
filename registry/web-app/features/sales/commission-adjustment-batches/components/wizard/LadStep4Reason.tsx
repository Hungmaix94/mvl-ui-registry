import { useCallback, useEffect, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Checkbox, TextArea, TextField } from '@/components/ui'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

import { usePatchLadBatch } from '../../services/commission-adjustment-batch-service'
import type { LadBatchDetail, LadFilterCriteria } from '../../types/lad-types'
import { LadStep4Attachments } from './LadStep4Attachments'

/**
 * TODO(schema): `override_per_deal_revenue` chưa có trong schema sinh ra — BE đã chạy nhưng field
 * chưa lên môi trường dùng cho `yarn api:generate`. Ép kiểu tại chỗ dùng (đúng luật ở AGENTS.md)
 * thay vì bẩn `LadBatchDetail` dùng chung. Xoá shim này ngay sau khi `yarn api:update` thấy field.
 */
type OverridePerDealRevenue = { override_per_deal_revenue?: boolean }

export interface LadStep4ReasonProps {
  batchId: number
  batch?: LadBatchDetail
  /** Footer-driven save: persist reason/attachments. Returns false to block navigation. */
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
}

/**
 * Bước 4 — Mô tả lô (tên + lý do) và chứng từ (mockup). Tên lô lưu vào field `name` thật của batch
 * (BE đã hỗ trợ); vẫn ĐỌC fallback `filter_criteria.batch_title` cho lô nháp cũ. Attachments confirm
 * ngay khi upload; PATCH gửi id[].
 */
export function LadStep4Reason({ batchId, batch, onRegisterSave }: LadStep4ReasonProps) {
  const patchBatch = usePatchLadBatch()
  const [batchTitle, setBatchTitle] = useState('')
  const [reason, setReason] = useState('')
  const [attachmentIds, setAttachmentIds] = useState<number[]>([])
  const [overridePerDealRevenue, setOverridePerDealRevenue] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (seeded || !batch) return
    const fc = (batch.filter_criteria ?? null) as LadFilterCriteria | null
    // Ưu tiên field `name` thật; rơi về batch_title (legacy) cho lô nháp tạo trước khi đổi.
    const title = (batch.name ?? fc?.batch_title ?? '').trim()
    const reasonText = batch.reason ?? ''
    const overrideRevenue = (batch as OverridePerDealRevenue).override_per_deal_revenue ?? false
    setBatchTitle(title)
    setReason(reasonText)
    setOverridePerDealRevenue(overrideRevenue)
    // Baseline để dirty-check. Attachments là write-only (API không đọc lại) → baseline [].
    lastSavedRef.current = JSON.stringify({
      title,
      reason: reasonText,
      overrideRevenue,
      attachments: [] as number[],
    })
    setSeeded(true)
  }, [batch, seeded])

  const save = useCallback(async (): Promise<boolean> => {
    const title = batchTitle.trim()
    const reasonText = reason.trim()
    if (!title) {
      toastService.error('Vui lòng nhập tên lô.')
      return false
    }
    if (!reasonText) {
      toastService.error('Vui lòng nhập lý do.')
      return false
    }
    // Không đổi so với lần lưu/seed gần nhất → không gọi API. `last_modified_step` do goToStep ghi
    // khi điều hướng tới bước này (không ghi trùng ở đây).
    const currentJson = JSON.stringify({
      title,
      reason: reasonText,
      overrideRevenue: overridePerDealRevenue,
      attachments: attachmentIds,
    })
    if (currentJson === lastSavedRef.current) return true
    try {
      await patchBatch.mutateAsync({
        id: batchId,
        data: {
          // Tên lô lưu vào field `name` thật (cột "Tên lô" ở list đọc trực tiếp `name`).
          name: title,
          reason: reasonText,
          override_locked: batch?.override_locked ?? false,
          ...(attachmentIds.length > 0 ? { attachments: attachmentIds } : {}),
          // Xem shim OverridePerDealRevenue ở đầu file — field chưa có trong PATCH body sinh ra.
          ...({ override_per_deal_revenue: overridePerDealRevenue } as OverridePerDealRevenue),
        },
      })
      lastSavedRef.current = currentJson
      return true
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      return false
    }
  }, [batchTitle, reason, overridePerDealRevenue, attachmentIds, batchId, batch, patchBatch])

  useEffect(() => {
    onRegisterSave?.(save)
    return () => onRegisterSave?.(null)
  }, [onRegisterSave, save])

  return (
    <Flex direction="column" gap="5">
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 border-b px-5 py-3.5">
          <p className="typo-body-base-semibold text-content-dark-1">Mô tả lô</p>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <TextField
            label="Tên lô"
            required
            placeholder="VD: Hồi tố giảm phí tháng 4/2026 theo CV-VHG-042"
            value={batchTitle}
            onChange={(v) => setBatchTitle(v)}
          />
          <TextArea
            label="Lý do"
            required
            placeholder="VD: CĐT VinGroup duyệt giảm phí 1% theo CV-VHG-042/2026 và biên bản đối chiếu BBĐC-2026-04-018."
            value={reason}
            onChange={(v) => setReason(v)}
            rows={5}
          />
          <div className="flex flex-col gap-1.5">
            <Checkbox
              checked={overridePerDealRevenue}
              onCheckedChange={(checked) => setOverridePerDealRevenue(checked === true)}
              label="Ghi đè cả những GD đã có điều chỉnh doanh thu riêng"
            />
            <p className="text-content-dark-3 typo-body-sm-regular pl-6">
              Mặc định, lô sẽ giữ nguyên doanh thu của GD đã được duyệt điều chỉnh riêng (xem cảnh
              báo &quot;Điều chỉnh doanh thu riêng&quot; ở bước Xem trước). Bật tuỳ chọn này để áp
              số doanh thu của lô lên cả những GD đó — chỉ áp dụng cho lần duyệt này, không xoá
              trạng thái điều chỉnh riêng của GD.
            </p>
          </div>
        </div>
      </section>

      <LadStep4Attachments batchId={batchId} onAttachmentIdsChange={setAttachmentIds} />
    </Flex>
  )
}

export default LadStep4Reason
