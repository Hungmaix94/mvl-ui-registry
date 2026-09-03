import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { FullScreenLoading, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'
import CTVReconciliationForm from '@/features/sales/ctv-reconciliations/components/CTVReconciliationForm'
import {
  useCTVReconciliationSheet,
  usePartialUpdateCTVReconciliationSheet,
} from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import { toPatchCTVReconciliationSheetPayload } from '@/features/sales/ctv-reconciliations/adapters/ctv-reconciliation-adapter'
import { type CTVReconciliationSheetValues } from '@/features/sales/ctv-reconciliations/schemas/ctv-reconciliation-sheet-schema'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

const CTVReconciliationEditPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)

  const { data: record, isLoading } = useCTVReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: partialUpdate, isPending: isSubmitting } =
    usePartialUpdateCTVReconciliationSheet()

  useEffect(() => {
    if (!record) return
    if (record.status !== ReconciliationStatus.draft) {
      toastService.error('Chỉ có thể chỉnh sửa đối chiếu CTV ở trạng thái bản nháp')
      navigate(APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(id)))
    }
  }, [record, navigate, id])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(id)))
  }, [navigate, id])

  const handleSubmit = useCallback(
    async (values: CTVReconciliationSheetValues) => {
      try {
        await partialUpdate({ id, data: toPatchCTVReconciliationSheetPayload(values) })
        toastService.success('Cập nhật đối chiếu CTV thành công')
        navigate(APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(id)))
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [id, navigate, partialUpdate]
  )

  if (!id || Number.isNaN(id)) return null

  if (isLoading || !record) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa đối chiếu CTV ${record.code}`}
        enableBackButton
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Đối chiếu CTV', href: APP_PATH.CTV_RECONCILIATION },
          {
            label: record.code,
            href: APP_PATH.CTV_RECONCILIATION_DETAIL.replace(':id', String(id)),
          },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <Flex direction="column" className="flex-1">
        <CTVReconciliationForm
          mode="edit"
          initialData={record}
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

export default CTVReconciliationEditPage
