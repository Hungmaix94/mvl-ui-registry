import { useEffect, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Button, Text } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'

import { useLadActions } from '../../hooks/useLadActions'
import { usePreviewLad } from '../../services/commission-adjustment-batch-service'
import { LadLineStatus } from '../../constants/lad-constants'
import type {
  LadBatchDetail,
  LadBatchLine,
  LadFilterCriteria,
  LadPayloadSnapshot,
} from '../../types/lad-types'
import { LadConfigDiffView } from '../detail/LadConfigDiffView'
import { LadSubmitConfirmation } from './LadSubmitConfirmation'

export interface LadReviewSubmitProps {
  batchId: number
  batch?: LadBatchDetail
  lines: LadBatchLine[]
  onApplied: (batchId: number) => void
  onGoToStep: (step: number) => void
  onExitToList: () => void
  /** Failed submit (unconfirmed_lines) — highlight ids + return to scope (handled by shell). */
  onUnconfirmedLines?: (dealIds: number[]) => void
}

function filterSummary(fc?: LadFilterCriteria | null): string {
  if (!fc) return '—'
  const parts: string[] = []
  if (fc.effective_from || fc.effective_to) {
    parts.push(`Ngày ký ${fc.effective_from ?? '...'} → ${fc.effective_to ?? 'nay'}`)
  }
  if (fc.sales_allocation_id) parts.push(`SA #${fc.sales_allocation_id}`)
  return parts.length ? parts.join(' · ') : '—'
}

/**
 * Màn 5/5 — Xác nhận & gửi duyệt. Recap (số GD, bộ lọc, lý do) + config diff + net impact, then
 * submit. On success renders the confirmation screen; submit errors route back to the right step.
 */
export function LadReviewSubmit({
  batchId,
  batch,
  lines,
  onApplied,
  onGoToStep,
  onExitToList,
  onUnconfirmedLines,
}: LadReviewSubmitProps) {
  const { submitBatch, isBusy } = useLadActions()
  const preview = usePreviewLad()
  const [deltaTotal, setDeltaTotal] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fc = (batch?.filter_criteria ?? null) as LadFilterCriteria | null
  const payload = (batch?.payload_snapshot ?? null) as LadPayloadSnapshot | null
  const confirmedCount = lines.filter((l) => l.line_status === LadLineStatus.applied).length

  useEffect(() => {
    let cancelled = false
    preview
      .mutateAsync(batchId)
      .then((res) => {
        if (!cancelled) setDeltaTotal(res?.delta_total ?? null)
      })
      .catch(() => {
        if (!cancelled) setDeltaTotal(null)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  const handleSubmit = () =>
    submitBatch(batchId, {
      onPending: () => setSubmitted(true),
      onApplied: () => setSubmitted(true),
      onUnconfirmed: (ids) => onUnconfirmedLines?.(ids),
      onRevenueError: () => onGoToStep(2),
    })

  if (submitted) {
    return (
      <LadSubmitConfirmation
        code={batch?.code}
        onOpenBatch={() => onApplied(batchId)}
        onExitToList={onExitToList}
      />
    )
  }

  return (
    <Flex direction="column" gap="5">
      <Text className="typo-heading-h6 text-content-dark-1 font-semibold">
        Xác nhận & chuyển sang dự kiến
      </Text>

      {/* Recap */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Recap label="Số giao dịch" value={`${confirmedCount}/${lines.length} xác nhận`} />
        <Recap label="Bộ lọc" value={filterSummary(fc)} />
        <Recap
          label="Δ tổng phí (ròng)"
          value={deltaTotal != null ? `${formatCurrencyVND(deltaTotal)} đ` : '—'}
        />
        <Recap label="Lý do" value={batch?.reason || '—'} />
      </div>

      {/* Config recap + edit links */}
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Text className="typo-body-base-semibold text-content-dark-1">Cấu hình áp dụng</Text>
          <Flex gap="2">
            <Button variant="text" onClick={() => onGoToStep(1)}>
              Sửa phạm vi
            </Button>
            <Button variant="text" onClick={() => onGoToStep(2)}>
              Sửa cấu hình
            </Button>
          </Flex>
        </Flex>
        <LadConfigDiffView payload={payload} />
      </Flex>

      {/* Submit */}
      <Flex justify="end" className="border-border-1 border-t pt-4">
        <Button variant="primary" onClick={handleSubmit} disabled={isBusy}>
          Chuyển sang dự kiến
        </Button>
      </Flex>
    </Flex>
  )
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-1 flex flex-col gap-1 rounded-lg border p-3">
      <Text className="typo-body-sm-regular text-content-dark-3">{label}</Text>
      <Text className="typo-body-sm-semibold text-content-dark-1">{value}</Text>
    </div>
  )
}

export default LadReviewSubmit
