import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { FullScreenLoading, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import { QUERY_KEYS } from '@/constants'
import InvestorReconciliationForm from '@/features/sales/investor-reconciliations/components/InvestorReconciliationForm.tsx'
import {
  useInvestorReconciliationSheet,
  useUpdateInvestorReconciliationSheet,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import {
  investorReconciliationLineService,
  useInvestorReconciliationLines,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import { toUpdateInvestorReconciliationSheetMetaPayload } from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import {
  lineRowToFormItem,
  toLineCreatePayload,
  toLinePatchPayload,
} from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-line-adapter'
import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  toReconCheckByProductId,
  toReconServerComputedByProductId,
} from '@/features/sales/_shared/reconciliation/recon-server-computed-map'
import toastService from '@/services/toast-service'
import { cn } from '@/utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases.ts'

const InvestorReconciliationEditPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const queryClient = useQueryClient()

  const { data: record, isLoading } = useInvestorReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: updateSheet, isPending: isSubmitting } =
    useUpdateInvestorReconciliationSheet()

  useEffect(() => {
    if (!record) return
    if (record.status !== ReconciliationStatus.draft) {
      toastService.error('Chỉ có thể chỉnh sửa phiếu đối chiếu ở trạng thái bản nháp')
      navigate(APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(id)))
    }
  }, [record, navigate, id])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(id)))
  }, [navigate, id])

  const handleSubmit = useCallback(
    // "Cập nhật thông tin chung": chỉ lưu metadata phiếu (căn quản lý qua /lines/). Lưu thành công →
    // quay về màn chi tiết (màn trước đó). Lỗi bubble lên form để map field (handleApiError);
    // không try/catch ở đây (navigate chỉ chạy khi update resolve).
    async (values: InvestorReconciliationSheetCreateValues) => {
      await updateSheet({ id, data: toUpdateInvestorReconciliationSheetMetaPayload(values) })
      toastService.success('Cập nhật thông tin chung thành công')
      navigate(APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(id)))
    },
    [id, updateSheet, navigate]
  )

  // Per-căn save via /lines/: load existing IR rows, then POST (new) / PATCH (existing) /
  // DELETE each căn independently.
  const { data: lines } = useInvestorReconciliationLines(id, { enabled: !!id })

  const initialItems = useMemo<InvestorReconciliationSheetCreateItemValues[] | undefined>(
    () => (lines ? lines.map(lineRowToFormItem) : undefined),
    [lines]
  )
  const lineIdByProductId = useMemo<Record<number, number>>(
    () =>
      Object.fromEntries(
        (lines ?? [])
          .filter((l) => Number(l.product_inventory) > 0 && Number(l.id) > 0)
          .map((l) => [Number(l.product_inventory), Number(l.id)])
      ),
    [lines]
  )

  // BE-computed totals + recon_check per căn — hiển thị số đối chiếu (FE không tự tính). Từ /lines/ rows.
  const serverComputedByProductId = useMemo(
    () => toReconServerComputedByProductId(lines ?? []),
    [lines]
  )
  const reconCheckByProductId = useMemo(() => toReconCheckByProductId(lines ?? []), [lines])

  const invalidateLines = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.SALES.INVESTOR_RECONCILIATION_SHEET.LINES(id),
    })
    // Sheet detail mang tổng phiếu (BE: total_amount/total_vat_amount/total_amount_with_vat/
    // requires_adjustment_invoice) ⇒ refetch để "Tổng kết phiếu đối chiếu" cập nhật sau khi lưu/xóa căn.
    queryClient.invalidateQueries({
      queryKey: ['sales', 'investor-reconciliation-sheets', 'detail', id],
    })
  }, [queryClient, id])

  const handleSaveLine = useCallback(
    async (item: InvestorReconciliationSheetCreateItemValues, lineId: number | null) => {
      // Convert the form item → wire body here (call boundary); the service speaks schema types only.
      const row = lineId
        ? await investorReconciliationLineService.patchLine(id, lineId, toLinePatchPayload(item))
        : await investorReconciliationLineService.createLine(id, toLineCreatePayload(item))
      await invalidateLines()
      return row.id ?? null
    },
    [id, invalidateLines]
  )

  const handleDeleteLine = useCallback(
    async (lineId: number) => {
      await investorReconciliationLineService.deleteLine(id, lineId)
      await invalidateLines()
    },
    [id, invalidateLines]
  )

  if (!id || Number.isNaN(id)) {
    return null
  }

  if (isLoading || !record) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa đối chiếu ${record.code}`}
        enableBackButton
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Đối chiếu chủ đầu tư', href: APP_PATH.INVESTOR_RECONCILIATION },
          {
            label: record.code,
            href: APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(id)),
          },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <Flex direction="column" className="flex-1">
        <InvestorReconciliationForm
          mode="edit"
          initialData={record}
          onSubmit={handleSubmit}
          onSaveLine={handleSaveLine}
          onDeleteLine={handleDeleteLine}
          initialItems={initialItems}
          lineIdByProductId={lineIdByProductId}
          serverComputedByProductId={serverComputedByProductId}
          reconCheckByProductId={reconCheckByProductId}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          scrollContainerRef={tableHorizontalScrollRef}
        />
      </Flex>
      <div
        className={cn(
          'bg-content-light-1 fixed bottom-0 z-50 flex flex-col py-2',
          sidebarState === 'expanded'
            ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
            : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
        )}
      >
        <div className="pr-7 pl-7">
          <HorizontalScrollBar
            containerRef={tableHorizontalScrollRef}
            className="border-border-1 border-x-0 border-b-0"
          />
        </div>
      </div>
    </>
  )
}

export default InvestorReconciliationEditPage
