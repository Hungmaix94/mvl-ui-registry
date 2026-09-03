import { useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { Button, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { IconCheck } from '@/assets/icons'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { cn } from '@/utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

import CTVReconciliationDetail from '@/features/sales/ctv-reconciliations/components/CTVReconciliationDetail'
import {
  useCTVReconciliationSheet,
  useConfirmCTVReconciliationSheet,
} from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'

const CTVReconciliationDetailPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()

  const queryClient = useQueryClient()
  const { data: record, isLoading, error } = useCTVReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: confirmSheet, isPending: isConfirming } = useConfirmCTVReconciliationSheet()

  // Màn đối chiếu CTV CHỈ XEM (không còn edit) — bỏ nút "Sửa", chỉ giữ thao tác "Phê duyệt" cả phiếu.
  const handleConfirm = useCallback(async () => {
    try {
      await confirmSheet(id)
      queryClient.invalidateQueries({ queryKey: ['sales', 'ctv-reconciliation-sheets'] })
      toastService.success('Phê duyệt đối chiếu thành công')
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [confirmSheet, id, queryClient])

  const isNotFound = !isLoading && !record && error ? true : false
  const isError = !isLoading && !!error && !isNotFound

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Chi tiết đối chiếu CTV ${record?.code ?? ''}`}
        enableBackButton
        customActions={
          ability.can('confirm', 'ctv_reconciliation_sheet') &&
          record?.status === ReconciliationStatus.draft ? (
            <Button
              variant="primary"
              size="small"
              leftIcon={<IconCheck />}
              loading={isConfirming}
              onClick={handleConfirm}
              title="Phê duyệt"
            >
              Phê duyệt
            </Button>
          ) : undefined
        }
      />

      <Flex direction="column" className="flex-1">
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={ability.can('retrieve', 'ctv_reconciliation_sheet')}
        >
          {record && (
            <CTVReconciliationDetail data={record} scrollContainerRef={tableHorizontalScrollRef} />
          )}
        </DetailPageWrapper>
      </Flex>

      {record && (
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
      )}
    </>
  )
}

export default CTVReconciliationDetailPage
