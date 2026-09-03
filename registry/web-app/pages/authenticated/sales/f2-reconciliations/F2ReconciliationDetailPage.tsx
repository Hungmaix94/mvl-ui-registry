import { useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { Button, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { IconCheck, IconDownload } from '@/assets/icons'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  useF2ReconciliationSheet,
  useConfirmF2ReconciliationSheet,
  useExportF2ReconciliationSheetDetail,
} from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { cn } from '@/utils'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

import F2ReconciliationDetail from '@/features/sales/f2-reconciliations/components/F2ReconciliationDetail'

const F2ReconciliationDetailPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()

  const queryClient = useQueryClient()
  const { data: record, isLoading, error } = useF2ReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: confirmSheet, isPending: isConfirming } = useConfirmF2ReconciliationSheet()
  const { mutateAsync: exportDetail, isPending: isExporting } =
    useExportF2ReconciliationSheetDetail()

  // Màn đối chiếu F2 CHỈ XEM (không còn edit) — bỏ nút "Sửa", chỉ giữ thao tác "Phê duyệt" cả phiếu.
  const handleConfirm = useCallback(async () => {
    try {
      await confirmSheet(id)
      queryClient.invalidateQueries({ queryKey: ['sales', 'f2-reconciliation-sheets'] })
      toastService.success('Phê duyệt đối chiếu thành công')
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [confirmSheet, id, queryClient])

  const handleExportDetail = useCallback(async () => {
    try {
      await exportDetail({ id, code: record?.code })
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [exportDetail, id, record?.code])

  const isNotFound = !isLoading && !record && error ? true : false
  const isError = !isLoading && !!error && !isNotFound

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Chi tiết đối chiếu ${record?.code ?? ''}`}
        enableBackButton
        customActions={
          <Flex gap="2">
            {ability.can('export_detail', 'f2_reconciliation_sheet') && record && (
              <Button
                variant="secondary"
                size="small"
                leftIcon={<IconDownload />}
                loading={isExporting}
                onClick={handleExportDetail}
                title="Xuất chi tiết"
              >
                Xuất chi tiết
              </Button>
            )}
            {ability.can('confirm', 'f2_reconciliation_sheet') &&
              record?.status === ReconciliationStatus.draft && (
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
              )}
          </Flex>
        }
      />

      <Flex direction="column" className="flex-1">
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={ability.can('retrieve', 'f2_reconciliation_sheet')}
        >
          {record && (
            <F2ReconciliationDetail data={record} scrollContainerRef={tableHorizontalScrollRef} />
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

export default F2ReconciliationDetailPage
