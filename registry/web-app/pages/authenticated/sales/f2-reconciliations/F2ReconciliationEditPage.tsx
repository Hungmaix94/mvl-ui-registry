import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { FullScreenLoading, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { APP_PATH } from '@/routes'
import F2ReconciliationForm from '@/features/sales/f2-reconciliations/components/F2ReconciliationForm'
import {
  useF2ReconciliationSheet,
  useUpdateF2ReconciliationSheet,
} from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import { type F2ReconciliationSheetValues } from '@/features/sales/f2-reconciliations/schemas/f2-reconciliation-sheet-create-schema'
import { toUpdateF2ReconciliationSheetPayload } from '@/features/sales/f2-reconciliations/adapters/f2-reconciliation-adapter'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { cn } from '@/utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

const F2ReconciliationEditPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)

  const { data: record, isLoading } = useF2ReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: updateSheet, isPending: isSubmitting } = useUpdateF2ReconciliationSheet()

  useEffect(() => {
    if (!record) return
    if (record.status && record.status !== ReconciliationStatus.draft) {
      toastService.error('Chỉ có thể chỉnh sửa phiếu đối chiếu ở trạng thái bản nháp')
      navigate(APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(id)))
    }
  }, [record, navigate, id])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(id)))
  }, [navigate, id])

  const handleSubmit = useCallback(
    async (values: F2ReconciliationSheetValues) => {
      try {
        const payload = toUpdateF2ReconciliationSheetPayload(values)
        await updateSheet({ id, data: payload })
        toastService.success('Cập nhật đối chiếu thành công')
        navigate(APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(id)))
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [id, navigate, updateSheet]
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
          { label: 'Đối chiếu F2', href: APP_PATH.F2_RECONCILIATION },
          {
            label: record.code,
            href: APP_PATH.F2_RECONCILIATION_DETAIL.replace(':id', String(id)),
          },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <Flex direction="column" className="flex-1">
        <F2ReconciliationForm
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

export default F2ReconciliationEditPage
