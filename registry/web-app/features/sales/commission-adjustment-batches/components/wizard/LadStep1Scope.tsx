import { useEffect, useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'
import { Button, Chip, DotLoader, Text } from '@/components/ui'
import { DateRangePicker } from '@/components/ui/date-range-picker/DateRangePicker'
import { IconPlus } from '@/assets/icons'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { LadLineCreateRequestRequestLine_status } from '@/api/schema'

import {
  LAD_LINE_STATUS_LABEL,
  LAD_LINE_STATUS_VARIANT,
  LadBatchStatus,
  LadLineStatus,
} from '../../constants/lad-constants'
import {
  useDeleteLadLine,
  usePatchLadBatch,
  usePatchLadLine,
} from '../../services/commission-adjustment-batch-service'
import type { LadBatchDetail, LadBatchLine, LadFilterCriteria } from '../../types/lad-types'
import { LadAddDealDialog } from './LadAddDealDialog'

interface LadStep1ScopeProps {
  batchId: number
  saleAllocationId: number
  batch?: LadBatchDetail
  lines: LadBatchLine[]
  isLoadingLines?: boolean
  highlightDealIds?: number[]
}

const GRID = 'grid grid-cols-[2fr_1.2fr_1fr_0.8fr] items-center gap-3'

/**
 * Bước 1 — Phạm vi. A scope-filter summary card (pinned to the host SA — the feature adds GD
 * MANUALLY, not from a live filter, per API-Usage §0) + the affected-deal list. GD enter the batch
 * via "Thêm GD" (lọc theo phạm vi) hoặc "Thêm GD thủ công" (lọc trong dialog). The list shows
 * Tên dự án (project.name) · Mã căn (product_inventory.code) · Trạng thái áp dụng (clickable chip
 * to toggle Dự kiến ↔ Loại) · Thao tác (remove). Per-deal price/impact columns live in Bước 3.
 */
export function LadStep1Scope({
  batchId,
  saleAllocationId,
  batch,
  lines,
  isLoadingLines,
  highlightDealIds,
}: LadStep1ScopeProps) {
  const { displayConfirm, displayCustom, displayClose } = useDialog()
  const patchLine = usePatchLadLine()
  const deleteLine = useDeleteLadLine()
  const patchBatch = usePatchLadBatch()

  const fc = (batch?.filter_criteria ?? null) as LadFilterCriteria | null
  const highlightSet = useMemo(() => new Set(highlightDealIds ?? []), [highlightDealIds])

  const willApplyCount = useMemo(
    () => lines.filter((l) => l.line_status !== LadLineStatus.excluded).length,
    [lines]
  )
  const excludedCount = lines.length - willApplyCount

  // "Khoảng ngày ký" is the only editable scope filter. Applying a range writes it into the
  // FE-owned filter_criteria blob (effective_from/effective_to) via a single deliberate PATCH —
  // not a per-keystroke save (the picker commits only on its own "Áp dụng"). Locked once the
  // batch leaves draft.
  const scopeLocked = batch?.status != null && batch.status !== LadBatchStatus.draft
  const initialRange = useMemo<DateRange | undefined>(() => {
    const from = parseDateFromApi(fc?.effective_from)
    const to = parseDateFromApi(fc?.effective_to)
    return from || to ? { from, to } : undefined
  }, [fc?.effective_from, fc?.effective_to])
  const [dateRange, setDateRange] = useState<DateRange | undefined | null>(initialRange)
  useEffect(() => setDateRange(initialRange), [initialRange])

  const handleDateRangeChange = async (range: DateRange | undefined | null) => {
    const prev = dateRange
    setDateRange(range ?? undefined) // optimistic — skipInvalidate means no refetch to sync from
    const nextFilter: LadFilterCriteria = {
      ...(fc ?? {}),
      effective_from: range?.from ? formatDateToApi(range.from) : null,
      effective_to: range?.to ? formatDateToApi(range.to) : null,
    }
    try {
      await patchBatch.mutateAsync({ id: batchId, data: { filter_criteria: nextFilter } })
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      setDateRange(prev) // rollback on failure
    }
  }

  const handleToggle = async (line: LadBatchLine) => {
    const next =
      line.line_status === LadLineStatus.excluded
        ? LadLineCreateRequestRequestLine_status.draft
        : LadLineCreateRequestRequestLine_status.excluded
    try {
      await patchLine.mutateAsync({ id: batchId, lineId: line.id, data: { line_status: next } })
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleDelete = (line: LadBatchLine) => {
    const projectName = line.project?.name || '—'
    const unitCode = line.product_inventory?.code || '—'
    const customerName = line.customer?.name
    displayConfirm({
      title: 'Loại giao dịch khỏi lô',
      content: (
        <div className="mt-2 flex w-full flex-col items-center gap-3">
          <Text className="typo-body-lg-regular text-content-dark-2 text-center">
            Bạn có chắc muốn loại giao dịch sau khỏi lô áp dụng? Thao tác này không thể hoàn tác.
          </Text>
          <div className="bg-surface-secondary-1 flex w-full max-w-sm flex-col gap-2 rounded-lg px-4 py-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <Text className="typo-body-sm-regular text-content-dark-3 shrink-0">Dự án</Text>
              <Text className="typo-body-sm-semibold text-content-dark-1 text-right">
                {projectName}
              </Text>
            </div>
            <div className="flex items-start justify-between gap-3">
              <Text className="typo-body-sm-regular text-content-dark-3 shrink-0">Mã căn</Text>
              <Text className="typo-body-sm-semibold text-content-dark-1 text-right">
                {unitCode}
              </Text>
            </div>
            <div className="flex items-start justify-between gap-3">
              <Text className="typo-body-sm-regular text-content-dark-3 shrink-0">
                Mã giao dịch
              </Text>
              <Text className="typo-body-sm-semibold text-content-dark-1 text-right">
                {line.deal_code}
              </Text>
            </div>
            {customerName && (
              <div className="flex items-start justify-between gap-3">
                <Text className="typo-body-sm-regular text-content-dark-3 shrink-0">
                  Khách hàng
                </Text>
                <Text className="typo-body-sm-semibold text-content-dark-1 text-right">
                  {customerName}
                </Text>
              </div>
            )}
          </div>
        </div>
      ),
      onConfirm: async () => {
        try {
          await deleteLine.mutateAsync({ id: batchId, lineId: line.id })
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }

  const scopeDateFrom = dateRange?.from ? formatDateToApi(dateRange.from) : null
  const scopeDateTo = dateRange?.to ? formatDateToApi(dateRange.to) : null
  const existingDealIds = useMemo(() => lines.map((l) => l.deal), [lines])

  const openAddDialog = () => {
    displayCustom({
      title: 'Thêm giao dịch',
      size: 'full',
      scrollable: true,
      hideFooter: true,
      destroyOnClose: true,
      content: (
        <LadAddDealDialog
          batchId={batchId}
          saleAllocationId={saleAllocationId}
          filterMode="scope"
          dateFrom={scopeDateFrom}
          dateTo={scopeDateTo}
          excludedDealIds={existingDealIds}
          onClose={displayClose}
        />
      ),
    })
  }

  const openManualAddDialog = () => {
    displayCustom({
      title: 'Thêm giao dịch thủ công',
      size: 'full',
      scrollable: true,
      hideFooter: true,
      destroyOnClose: true,
      content: (
        <LadAddDealDialog
          batchId={batchId}
          saleAllocationId={saleAllocationId}
          filterMode="manual"
          excludedDealIds={existingDealIds}
          onClose={displayClose}
        />
      ),
    })
  }

  return (
    <Flex direction="column" gap="5">
      {/* Scope filter summary */}
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <div className="border-border-1 flex flex-col gap-0.5 border-b px-5 py-3.5">
          <Text className="typo-body-base-semibold text-content-dark-1">Bộ lọc phạm vi</Text>
          <Text className="text-content-dark-3 typo-body-sm-regular">
            Phạm vi cố định theo bảng hàng hiện tại. Giao dịch chỉ vào lô khi bạn chủ động thêm.
          </Text>
        </div>
        <div className="p-4">
          <div className="max-w-md">
            <DateRangePicker
              label="Khoảng ngày ký"
              subtitle="Lọc theo ngày ký giao dịch — để trống nếu không giới hạn."
              value={dateRange}
              onChange={handleDateRangeChange}
              showQuickSelect
              disabled={scopeLocked || patchBatch.isPending}
            />
          </div>
        </div>
      </section>

      {/* Affected deal list */}
      <section className="border-border-1 overflow-hidden rounded-xl border">
        <Flex
          justify="between"
          align="center"
          wrap="wrap"
          gap="3"
          className="border-border-1 border-b px-5 py-3.5"
        >
          <div className="flex flex-col gap-0.5">
            <Text className="typo-body-base-semibold text-content-dark-1">
              Danh sách giao dịch bị ảnh hưởng ({lines.length})
            </Text>
            <Text className="text-content-dark-3 typo-body-sm-regular">
              {willApplyCount} sẽ áp dụng · {excludedCount} đã loại trừ
            </Text>
          </div>
          <Flex align="center" gap="2">
            <Button variant="secondary-border" disabled title="Sắp có">
              ⬇ Import GD đã xác nhận
            </Button>
            <Button
              variant="secondary-border"
              leftIcon={<IconPlus />}
              onClick={openManualAddDialog}
            >
              Thêm GD thủ công
            </Button>
            <Button variant="primary" leftIcon={<IconPlus />} onClick={openAddDialog}>
              Thêm GD
            </Button>
          </Flex>
        </Flex>

        {/* Column header */}
        <div
          className={`bg-surface-secondary-2 text-content-dark-3 ${GRID} px-5 py-2 text-xs font-semibold uppercase`}
        >
          <span>Tên dự án</span>
          <span>Mã căn</span>
          <span>Trạng thái áp dụng</span>
          <span className="text-right">Thao tác</span>
        </div>

        <div className="divide-border-1 divide-y">
          {isLoadingLines && lines.length === 0 ? (
            <div className="flex justify-center py-10">
              <DotLoader />
            </div>
          ) : lines.length === 0 ? (
            <div className="text-content-dark-3 px-5 py-8 text-center text-sm">
              Chưa có giao dịch nào. Bấm "Thêm GD" hoặc "Thêm GD thủ công" để đưa giao dịch vào lô.
            </div>
          ) : (
            lines.map((line) => {
              const status = (line.line_status ?? LadLineStatus.draft) as LadLineStatus
              const flagged = highlightSet.has(line.deal)
              const projectName = line.project?.name || ''
              const unitCodeNumber = line.product_inventory?.unit_number || ''
              return (
                <div key={line.id} className={`${GRID} px-5 py-3 text-sm`}>
                  <span
                    className={
                      flagged
                        ? 'text-action-primary-red-default truncate font-semibold'
                        : 'text-content-dark-1 truncate font-medium'
                    }
                    title={projectName || undefined}
                  >
                    {projectName || '—'}
                  </span>
                  <span className={unitCodeNumber ? 'text-content-dark-1' : 'text-content-dark-3'}>
                    {unitCodeNumber || '—'}
                  </span>
                  <span>
                    <button
                      type="button"
                      title="Bấm để đổi trạng thái GD"
                      onClick={() => handleToggle(line)}
                      className="cursor-pointer"
                      disabled={patchLine.isPending}
                    >
                      <Chip
                        label={LAD_LINE_STATUS_LABEL[status]}
                        variant={LAD_LINE_STATUS_VARIANT[status]}
                        size="small"
                        showDot
                      />
                    </button>
                  </span>
                  <span className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(line)}
                      className="text-action-primary-red-default text-sm font-medium hover:underline"
                      disabled={deleteLine.isPending}
                    >
                      × Loại
                    </button>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Hint */}
      <div className="border-data-blue-default bg-data-blue-disabled rounded-lg border px-4 py-3">
        <Text className="typo-body-sm-regular text-content-dark-2">
          GD trong lô ở trạng thái Dự kiến (sẽ được áp dụng khi lô được duyệt) hoặc Loại trừ (không
          áp dụng). Nút "Import GD đã xác nhận" dùng để nhập danh sách giao dịch đã đối chiếu
          offline với CĐT. Giao dịch không phù hợp có thể bấm "× Loại" để bỏ khỏi lô.
        </Text>
      </div>
    </Flex>
  )
}

export default LadStep1Scope
