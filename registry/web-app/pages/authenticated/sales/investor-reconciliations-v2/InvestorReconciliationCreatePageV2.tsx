import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import InvestorReconciliationFormV2 from '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationFormV2'
import { toCreateInvestorReconciliationSheetMetaPayload } from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import type { InvestorReconciliationSheetCreateValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { useCreateInvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import toastService from '@/services/toast-service'
import { cn } from '@/utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

/**
 * Đối chiếu chủ đầu tư (bản 2.0 — bản duy nhất còn định tuyến) — màn "Tạo phiếu". Tái sử dụng nguyên
 * service/adapter/schema của v1 (`investor-reconciliations/`), chỉ đổi layout form (xem
 * InvestorReconciliationFormV2). Sau khi tạo thành công, chuyển thẳng sang màn Chi tiết để thêm căn
 * (KHÔNG có route edit riêng — sửa thông tin chung ngay tại màn Chi tiết).
 */
const InvestorReconciliationCreatePageV2 = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { mutateAsync: createSheet, isPending: isSubmitting } =
    useCreateInvestorReconciliationSheet()

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.INVESTOR_RECONCILIATION))
  }, [navigate])

  const handleSubmit = useCallback(
    async (values: InvestorReconciliationSheetCreateValues) => {
      const created = await createSheet(toCreateInvestorReconciliationSheetMetaPayload(values))
      toastService.success('Đã tạo phiếu nháp — tiếp tục thêm căn đối chiếu')
      navigate(APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(created.id)))
    },
    [createSheet, navigate]
  )

  return (
    <>
      <PageTitle
        title="Tạo phiếu đối chiếu chủ đầu tư"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex direction="column" className="flex-1">
        <InvestorReconciliationFormV2
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
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

export default InvestorReconciliationCreatePageV2
