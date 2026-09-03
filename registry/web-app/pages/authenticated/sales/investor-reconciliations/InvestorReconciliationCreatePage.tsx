import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import InvestorReconciliationForm from '@/features/sales/investor-reconciliations/components/InvestorReconciliationForm.tsx'
import { toCreateInvestorReconciliationSheetMetaPayload } from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import type { InvestorReconciliationSheetCreateValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { useCreateInvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import toastService from '@/services/toast-service'
import { cn } from '@/utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

const InvestorReconciliationCreatePage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { mutateAsync: createSheet, isPending: isSubmitting } =
    useCreateInvestorReconciliationSheet()

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.INVESTOR_RECONCILIATION))
  }, [navigate])

  const handleSubmit = useCallback(
    // Bước 1: chỉ tạo phiếu nháp từ thông tin chung (KHÔNG kèm items). Lỗi bubble lên form
    // (handleApiError) — không try/catch ở đây. Thành công → sang màn Edit để thêm căn.
    async (values: InvestorReconciliationSheetCreateValues) => {
      const created = await createSheet(toCreateInvestorReconciliationSheetMetaPayload(values))
      const id = (created as { id?: number } | undefined)?.id ?? null
      toastService.success('Đã tạo phiếu nháp — tiếp tục thêm căn đối chiếu')
      navigate(
        id
          ? APP_PATH.INVESTOR_RECONCILIATION_EDIT.replace(':id', String(id))
          : APP_PATH.INVESTOR_RECONCILIATION
      )
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
        <InvestorReconciliationForm
          mode="create"
          onSubmit={handleSubmit}
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

export default InvestorReconciliationCreatePage
