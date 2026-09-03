import { useEffect, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { DotLoader, Text } from '@/components/ui'

import {
  useLadBatch,
  useLadF2s,
  useLadLines,
  usePreviewLad,
} from '../../services/commission-adjustment-batch-service'
import { LadBatchStatus } from '../../constants/lad-constants'
import type {
  LadF2AppliedRate,
  LadFilterCriteria,
  LadPayloadSnapshot,
  LadPreviewResult,
} from '../../types/lad-types'
import { LadConfigSnapshotTable } from './LadConfigSnapshotTable'
import { LadDetailHeader } from './LadDetailHeader'
import { LadImpactTable } from './LadImpactTable'

export interface LadBatchDetailViewProps {
  batchId: number
  isReadOnly?: boolean
  onBackToList: () => void
  onContinueEdit: (batchId: number, step?: number) => void
  onCloned: (batchId: number, step?: number) => void
}

function filterScope(fc?: LadFilterCriteria | null): string {
  if (!fc) return ''
  const parts: string[] = []
  if (fc.effective_from || fc.effective_to) {
    parts.push(`Ngày ký ${fc.effective_from ?? '...'} → ${fc.effective_to ?? 'nay'}`)
  }
  if (fc.sales_allocation_id) parts.push(`SA #${fc.sales_allocation_id}`)
  return parts.join(' · ')
}

/**
 * UNIFIED detail view (draft | pending | applied). Layout matches the mockups:
 *   Header (banner + info card + status-aware actions) → Snapshot cấu hình (CĐT + F2) → Phạm vi
 *   tác động (per-GD before/after fee from preview).
 *
 * The preview endpoint supplies delta_total + per-GD before/after (the read model's lines are thin),
 * so we run it on mount. Attachments are write-only in the API (no read list) — that section is
 * intentionally omitted (see deviations D2).
 */
export function LadBatchDetailView({
  batchId,
  isReadOnly,
  onBackToList,
  onContinueEdit,
  onCloned,
}: LadBatchDetailViewProps) {
  const { data: batch, isLoading } = useLadBatch(batchId)
  const { data: linesData, isLoading: isLoadingLines } = useLadLines(batchId)
  const lines = linesData?.results ?? []

  const { data: f2Data, isLoading: isLoadingF2s } = useLadF2s(batchId)
  // BE serves the f2s list as a BARE ARRAY, but the schema types it as PaginatedLadF2AppliedRateList.
  // Normalize both shapes so f2Rows is always the array.
  const f2Rows: LadF2AppliedRate[] = Array.isArray(f2Data)
    ? f2Data
    : ((f2Data as { results?: LadF2AppliedRate[] } | undefined)?.results ?? [])

  const preview = usePreviewLad()
  const [previewResult, setPreviewResult] = useState<LadPreviewResult | null>(null)
  const batchStatus = batch?.status

  useEffect(() => {
    setPreviewResult(null)
    // Chỉ dry-run cho lô NHÁP (số liệu chưa chốt). Lô đã gửi duyệt/áp dụng/từ chối đã có
    // before/after_total + delta_total_sum persist; preview lúc này so config hiện hành với
    // chính nó → before == after, Δ = 0 (sai lịch sử) và tốn 1 POST vô ích.
    if (batchStatus !== LadBatchStatus.draft) return
    let cancelled = false
    preview
      .mutateAsync(batchId)
      .then((res) => {
        if (!cancelled) setPreviewResult(res ?? null)
      })
      .catch(() => {
        if (!cancelled) setPreviewResult(null)
      })
    return () => {
      cancelled = true
    }
    // Preview is intentionally uncached — re-run only when the batch/status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, batchStatus])

  const previewLines = previewResult?.lines ?? []

  const { internalCount, f2Count } = useMemo(() => {
    let internal = 0
    let f2 = 0
    for (const line of previewLines) {
      if (line.exchange_id == null) internal += 1
      else f2 += 1
    }
    return { internalCount: internal, f2Count: f2 }
  }, [previewLines])

  if (isLoading && !batch) {
    return (
      <Flex justify="center" align="center" className="py-16">
        <DotLoader />
      </Flex>
    )
  }

  if (!batch) {
    return (
      <Flex direction="column" align="center" gap="3" className="py-16 text-center">
        <Text className="typo-heading-h5 text-content-dark-1 font-semibold">Không tìm thấy lô</Text>
        <Text className="typo-body-base-regular text-content-dark-3">
          Lô áp dụng không tồn tại hoặc đã bị xoá.
        </Text>
      </Flex>
    )
  }

  const isApplied = batch.status === LadBatchStatus.applied
  const payload = (batch.payload_snapshot ?? null) as LadPayloadSnapshot | null
  const fc = (batch.filter_criteria ?? null) as LadFilterCriteria | null
  const hasPreview = previewLines.length > 0
  const scope = filterScope(fc)

  return (
    <Flex direction="column" gap="6">
      <LadDetailHeader
        batch={batch}
        isReadOnly={isReadOnly}
        deltaTotal={previewResult?.delta_total ?? null}
        internalCount={hasPreview ? internalCount : null}
        f2Count={hasPreview ? f2Count : null}
        onBackToList={onBackToList}
        onContinueEdit={onContinueEdit}
        onCloned={onCloned}
      />

      <LadConfigSnapshotTable
        payload={payload}
        f2Rows={f2Rows}
        // Nháp: TRƯỚC LÔ = config hiện hành từ preview; lô đã chốt: snapshot persist trên line.
        beforeConfig={previewLines[0]?.before ?? lines[0]?.before_snapshot ?? null}
        // batch.deal_count chỉ được BE aggregate khi submit — bản nháp luôn 0, nên ưu tiên
        // deal_count từ preview (số GD áp dụng thực tế), rồi mới rơi về header/lines.
        dealCount={previewResult?.deal_count ?? (batch.deal_count || lines.length)}
        isLocked={isApplied}
      />

      <Flex direction="column" gap="3">
        <div className="flex flex-col gap-0.5">
          <Text className="typo-body-base-semibold text-content-dark-1">
            Phạm vi tác động ({batch.deal_count ?? lines.length} giao dịch)
          </Text>
          {scope && <Text className="typo-body-sm-regular text-content-dark-3">{scope}</Text>}
        </div>
        <LadImpactTable
          lines={lines}
          previewLines={previewLines}
          deltaTotal={previewResult?.delta_total ?? null}
          summary={batch.lines_summary}
          isLoading={isLoadingLines || (preview.isPending && !previewResult)}
          f2Rows={f2Rows}
          isLoadingF2s={isLoadingF2s}
        />
      </Flex>
    </Flex>
  )
}

export default LadBatchDetailView
