import { Flex } from '@radix-ui/themes'
import { IconCopy, IconTrash } from '@/assets/icons'
import { Button, Text } from '@/components/ui'
import { DATETIME_FORMAT, MONTH_FORMAT } from '@/constants/date-format'
import { useAbility } from '@/lib/ability'
import { cn, formatCurrencyVND } from '@/utils'
import { formatDate } from '@/utils/date-utils'

import { LAD_SUBJECT, LadBatchStatus } from '../../constants/lad-constants'
import { useLadActions } from '../../hooks/useLadActions'
import type { LadBatchDetail, LadFilterCriteria } from '../../types/lad-types'
import { toNum } from '../../utils/lad-parse'
import { LadApprovalActions } from '../LadApprovalActions'
import { LadBatchStatusBadge } from '../LadBatchStatusBadge'
import { deltaClass } from './ladDelta'

interface LadDetailHeaderProps {
  batch: LadBatchDetail
  isReadOnly?: boolean
  /** Σ Δ phí (ròng) from preview — shown as "Δ tổng phí CĐT". */
  deltaTotal?: number | null
  /** Scope breakdown from preview lines (GD nội bộ / qua F2). */
  internalCount?: number | null
  f2Count?: number | null
  onBackToList: () => void
  onContinueEdit: (batchId: number, step?: number) => void
  onCloned: (batchId: number, step?: number) => void
}

function dt(value?: string | null): string {
  return value ? formatDate(value, DATETIME_FORMAT) : '—'
}

function filterSummary(fc?: LadFilterCriteria | null): string {
  if (!fc) return '—'
  const parts: string[] = []
  if (fc.effective_from || fc.effective_to) {
    const fromLabel = fc.effective_from ? formatDate(fc.effective_from, MONTH_FORMAT) : '...'
    const toLabel = fc.effective_to ? formatDate(fc.effective_to, MONTH_FORMAT) : 'nay'
    parts.push(
      `Tháng ký ${fromLabel}${fc.effective_to && fc.effective_from !== fc.effective_to ? ` → ${toLabel}` : ''}`
    )
  }
  if (fc.sales_allocation_id) parts.push(`SA #${fc.sales_allocation_id}`)
  return parts.length ? parts.join(' · ') : '—'
}

function InfoCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text className="text-content-dark-3 text-xs uppercase">{label}</Text>
      <Text className={cn('typo-body-sm-semibold', valueClassName ?? 'text-content-dark-1')}>
        {value}
      </Text>
    </div>
  )
}

/**
 * Detail header — một card "Thông tin lô áp dụng" (mockup): metadata 2×3, phạm vi/Δ phí, lý do + actions.
 */
export function LadDetailHeader({
  batch,
  isReadOnly,
  deltaTotal,
  internalCount,
  f2Count,
  onBackToList,
  onContinueEdit,
  onCloned,
}: LadDetailHeaderProps) {
  const ability = useAbility()
  const { submitBatch, confirmDelete, confirmClone, isBusy } = useLadActions()

  const status = batch.status as LadBatchStatus
  const isDraft = status === LadBatchStatus.draft
  const isPending = status === LadBatchStatus.pending
  const isApplied = status === LadBatchStatus.applied

  const canUpdate = ability.can('update', LAD_SUBJECT)
  const canDestroy = ability.can('destroy', LAD_SUBJECT)
  const canSubmit = ability.can('submit', LAD_SUBJECT)
  const canClone = ability.can('clone', LAD_SUBJECT)

  const fc = (batch.filter_criteria ?? null) as LadFilterCriteria | null

  const scopeValue = (() => {
    const base = `${batch.deal_count ?? 0} giao dịch`
    if (internalCount == null && f2Count == null) return base
    return `${base} · ${internalCount ?? 0} nội bộ · ${f2Count ?? 0} qua F2`
  })()

  // Ưu tiên Δ từ preview (luôn mới nhất với lô nháp); lô đã gửi duyệt/áp dụng dùng
  // delta_total_sum BE đã chốt (decimal-string, null khi còn nháp).
  const deltaResolved = deltaTotal ?? toNum(batch.delta_total_sum)
  const deltaValue =
    deltaResolved != null
      ? `${deltaResolved > 0 ? '+' : ''}${formatCurrencyVND(deltaResolved)} đ`
      : '—'
  const deltaAccent = deltaResolved != null ? deltaClass(deltaResolved) : undefined

  const approverLabel = isApplied ? 'Người duyệt' : 'Gửi duyệt bởi'
  const approverTimeLabel = isApplied ? 'Thời gian duyệt' : 'Thời gian gửi duyệt'
  const approverName = batch.submitted_by?.name ?? '—'

  const reasonLabel = isApplied ? 'Lý do áp dụng' : isPending ? 'Lý do gửi duyệt' : 'Lý do'
  const cardNote = isApplied
    ? 'Snapshot bất biến đã khoá'
    : isDraft
      ? 'Có thể chỉnh sửa cho tới khi áp dụng'
      : isPending
        ? 'Đang chờ duyệt — chưa áp dụng'
        : 'Đã từ chối — có thể sửa lại'

  const handleSubmit = () =>
    submitBatch(batch.id, {
      onUnconfirmed: () => onContinueEdit(batch.id, 1),
      onRevenueError: () => onContinueEdit(batch.id, 2),
    })

  const actions = !isReadOnly && (
    <Flex direction="column" gap="2" className="w-full shrink-0 md:w-[400px]">
      {isDraft && (
        <>
          {canSubmit && (
            <Button variant="primary" onClick={handleSubmit} disabled={isBusy}>
              Chuyển sang dự kiến
            </Button>
          )}
          {canUpdate && (
            <Button
              variant="secondary-border"
              onClick={() => onContinueEdit(batch.id, batch.last_modified_step || 1)}
            >
              Tiếp tục chỉnh sửa
            </Button>
          )}
          {canDestroy && (
            <Button
              variant="secondary-border"
              leftIcon={<IconTrash className="h-4 w-4" />}
              onClick={() => confirmDelete(batch.id, onBackToList)}
              disabled={isBusy}
            >
              Xóa lô
            </Button>
          )}
        </>
      )}
      {isPending && (
        <LadApprovalActions
          batchId={batch.id}
          onDone={onBackToList}
          onReverted={() => onContinueEdit(batch.id, batch.last_modified_step || 1)}
        />
      )}
      {(isApplied || status === LadBatchStatus.rejected) && canClone && (
        <Button
          variant="primary"
          leftIcon={<IconCopy className="h-4 w-4" />}
          onClick={() => confirmClone(batch.id, onCloned)}
          disabled={isBusy}
        >
          Nhân bản lô
        </Button>
      )}
    </Flex>
  )

  return (
    <Flex direction="column" gap="4">
      <button
        type="button"
        onClick={onBackToList}
        className="border-content-dark-1 text-content-dark-1 hover:bg-background-2 typo-body-sm-semibold flex w-fit items-center gap-1.5 rounded-lg border-[1.5px] px-3.5 py-2 transition-colors"
      >
        ‹ Quay lại danh sách lô
      </button>

      <section className="border-border-1 overflow-hidden rounded-xl border p-5">
        <Flex justify="start" align="center" wrap="wrap" gap="2" className="mb-2">
          <Text className="text-action-primary-red-default text-xs font-semibold tracking-wide uppercase">
            Thông tin lô áp dụng
          </Text>
          <Text className="text-content-dark-3 typo-body-sm-regular">· {cardNote}</Text>
        </Flex>

        {/* Tên lô — tiêu đề nổi bật (lô nháp chưa đặt tên hiện placeholder mờ) + pill trạng thái. */}
        <Flex justify="between" align="center" gap="3" wrap="wrap" className="mb-4">
          <Text
            className={cn(
              'typo-heading-h4 block font-semibold',
              batch.name?.trim() ? 'text-content-dark-1' : 'text-content-dark-3'
            )}
          >
            {batch.name?.trim() || 'Chưa đặt tên lô'}
          </Text>
          <LadBatchStatusBadge status={batch.status} className="shrink-0" />
        </Flex>

        {/* Hàng 1: mã lô · người tạo · thời gian tạo */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-3">
          <InfoCell label={isDraft ? 'Mã yêu cầu' : 'Mã lô'} value={batch.code} />
          <InfoCell label="Người tạo" value={batch.created_by?.name ?? '—'} />
          <InfoCell label="Thời gian tạo" value={dt(batch.created_at)} />
        </div>

        {/* Hàng 2: duyệt / áp dụng */}
        {(isApplied || isPending || batch.submitted_at) && (
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-3">
            <InfoCell label={approverLabel} value={approverName} />
            <InfoCell label={approverTimeLabel} value={dt(batch.submitted_at)} />
            <InfoCell label="Thời gian áp dụng" value={isApplied ? dt(batch.applied_at) : '—'} />
          </div>
        )}

        <div className="border-border-1 my-4 border-t" />

        {/* Hàng 3: phạm vi · bộ lọc · Δ phí */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-3">
          <InfoCell label="Phạm vi áp dụng" value={scopeValue} />
          <InfoCell label="Bộ lọc phạm vi" value={filterSummary(fc)} />
          <InfoCell label="Δ tổng phí CĐT" value={deltaValue} valueClassName={deltaAccent} />
        </div>

        {(batch.reason || actions) && (
          <>
            <div className="border-border-1 my-4 border-t" />
            <Flex justify="between" align="start" gap="6" wrap={'wrap'}>
              <div className="flex h-full min-w-[240px] flex-1 flex-col justify-start">
                <Text className="text-content-dark-3 mb-1 block text-xs uppercase">
                  {reasonLabel}
                </Text>
                <Text className="typo-body-sm-regular text-content-dark-2">
                  {batch.reason?.trim() || '—'}
                </Text>
              </div>
              {actions}
            </Flex>
          </>
        )}
      </section>
    </Flex>
  )
}

export default LadDetailHeader
