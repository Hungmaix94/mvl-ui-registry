import { useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { Button, PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { IconCheck } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import InvestorReconciliationForm from '@/features/sales/investor-reconciliations/components/InvestorReconciliationForm'
import {
  toReconCheckByProductId,
  toReconServerComputedByProductId,
} from '@/features/sales/_shared/reconciliation/recon-server-computed-map'
import {
  useInvestorReconciliationSheet,
  useConfirmInvestorReconciliationSheet,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { showReconciliationWarnings } from '@/features/sales/investor-reconciliations/utils/reconciliation-warnings'
import { useCreateSalesInvoiceFromReconciliation } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'
import { cn } from '@/utils'

const InvestorReconciliationDetailPage = () => {
  const { state: sidebarState } = useSidebar()
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()

  const queryClient = useQueryClient()
  const { data: record, isLoading, error } = useInvestorReconciliationSheet(id, { enabled: !!id })
  const { mutateAsync: confirmSheet, isPending: isConfirming } =
    useConfirmInvestorReconciliationSheet()
  const { mutateAsync: createInvoice, isPending: isCreatingInvoice } =
    useCreateSalesInvoiceFromReconciliation()

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.INVESTOR_RECONCILIATION_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleConfirm = useCallback(async () => {
    try {
      const result = await confirmSheet(id)
      queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
      toastService.success('Phê duyệt đối chiếu thành công')
      showReconciliationWarnings(result)
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }, [confirmSheet, id, queryClient])

  const handleCreateInvoice = async () => {
    try {
      const res = await createInvoice({
        reconciliation_id: id,
      })
      toastService.success('Tạo hóa đơn thành công!')
      if (res?.id) {
        navigate(APP_PATH.SALES_INVOICE_DETAIL.replace(':id', String(res.id)))
      }
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }

  const isNotFound = !isLoading && !record && error ? true : false
  const isError = !isLoading && !!error && !isNotFound

  // View chỉ hiển thị số do BE tính: dựng map server-computed/recon_check từ reconciliations của sheet.
  const serverComputedByProductId = useMemo(
    () => toReconServerComputedByProductId(record?.reconciliations ?? []),
    [record]
  )
  const reconCheckByProductId = useMemo(
    () => toReconCheckByProductId(record?.reconciliations ?? []),
    [record]
  )

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        enableBackButton
        handleEdit={
          ability.can('update', 'investor_reconciliation_sheet') &&
          record?.status === ReconciliationStatus.draft
            ? handleEdit
            : undefined
        }
        customActions={
          <Flex gap="2">
            {ability.can('confirm', 'investor_reconciliation_sheet') &&
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
            ) : null}

            {ability.can('create', 'salesinvoice') &&
            record?.status === ReconciliationStatus.confirmed ? (
              <Button
                variant="primary"
                size="small"
                loading={isCreatingInvoice}
                onClick={handleCreateInvoice}
                title="Tạo hóa đơn"
              >
                Tạo hóa đơn
              </Button>
            ) : null}
          </Flex>
        }
      />

      <Flex direction="column" className="flex-1">
        <DetailPageWrapper
          isLoading={isLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={ability.can('retrieve', 'investor_reconciliation_sheet')}
        >
          {record && (
            <InvestorReconciliationForm
              mode="view"
              initialData={record}
              serverComputedByProductId={serverComputedByProductId}
              reconCheckByProductId={reconCheckByProductId}
              scrollContainerRef={tableHorizontalScrollRef}
            />
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

export default InvestorReconciliationDetailPage
