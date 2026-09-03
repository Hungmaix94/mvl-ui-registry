import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toastService from '@/services/toast-service'
import { Flex } from '@radix-ui/themes'
import { Loader2 } from 'lucide-react'

import { TransactionSheetForm } from './components/TransactionSheetForm'
import { TransactionSheetFormValues } from '@/features/sales/transaction-sheets/types/transaction-sheet-form-types'
import { APP_PATH } from '@/routes'
import { PageTitle } from '@/components/ui'
import {
  useTransactionSheet,
  useUpdateTransactionSheet,
} from '@/features/sales/transaction-sheets/services/transaction-sheet-service'
import { formatDateToApi } from '@/utils/date-utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

const TransactionSheetEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: transactionSheet, isLoading: isLoadingData } = useTransactionSheet(Number(id), !!id)

  const { mutateAsync: updateTransactionSheet, isPending: isUpdating } = useUpdateTransactionSheet()

  const initialValues = useMemo<Partial<TransactionSheetFormValues> | undefined>(() => {
    if (!transactionSheet) return undefined

    return {
      deposit_contract: transactionSheet.deposit_contract_detail?.id,
      customer: transactionSheet.customer_detail?.id,
      customer_type: transactionSheet.customer_detail?.customer_type,
      fee_calculation_price: transactionSheet.fee_calculation_price
        ? Number(transactionSheet.fee_calculation_price)
        : undefined,
      pct_revenue: transactionSheet.pct_revenue ? Number(transactionSheet.pct_revenue) : undefined,
      purchase_contract_date: transactionSheet.purchase_contract_date
        ? new Date(transactionSheet.purchase_contract_date)
        : undefined,
      note: transactionSheet.note || undefined,
      attachments_detail: (transactionSheet as unknown as Record<string, any>).attachments || [],
      sales_staff:
        (transactionSheet.sales_staff?.map((item: any) => ({
          sale_type: item.sale_type,
          employee: item.employee_detail?.id || null,
          exchange: item.exchange_detail?.id || null,
          collaborator: item.collaborator_detail?.id || item.collaborator || null,
          employee_detail: item.employee_detail,
          exchange_detail: item.exchange_detail,
          collaborator_detail: item.collaborator_detail,
          full_name:
            item.collaborator_name ||
            (item as unknown as Record<string, any>).full_name ||
            item.collaborator_detail?.fullname ||
            item.collaborator_detail?.name ||
            item.employee_detail?.fullname ||
            item.exchange_detail?.name ||
            '',
          percentage: Number(item.participation_percentage ?? item.percentage) || 0,
        })) as unknown as TransactionSheetFormValues['sales_staff']) || [],
    } as Partial<TransactionSheetFormValues>
  }, [transactionSheet])

  const handleCancel = useCallback(() => {
    if (id) {
      navigate(APP_PATH.TRANSACTION_SHEET_DETAIL.replace(':id', id))
    } else {
      navigate(withRememberedSearch(APP_PATH.TRANSACTION_SHEET))
    }
  }, [navigate, id])

  const handleSubmit = useCallback(
    async (values: TransactionSheetFormValues) => {
      if (!id) return
      const payload: any = {
        deposit_contract_id: values.deposit_contract,
        customer_id: values.customer,
        note: values.note,
      }

      if (values.fee_calculation_price !== undefined && values.fee_calculation_price !== null) {
        payload.fee_calculation_price = String(values.fee_calculation_price)
      } else {
        payload.fee_calculation_price = null as any
      }
      const purchaseContractDate = formatDateToApi(values.purchase_contract_date ?? undefined)
      if (purchaseContractDate) {
        payload.purchase_contract_date = purchaseContractDate
      }
      payload.attachment_ids = values.kept_attachment_ids || []
      if (values.attachments && values.attachments.length > 0) {
        payload.files = { attachments: values.attachments }
      }

      await updateTransactionSheet({ id: Number(id), data: payload })
      toastService.success('Cập nhật Phiếu thông tin giao dịch thành công')
      navigate(APP_PATH.TRANSACTION_SHEET)
    },
    [updateTransactionSheet, navigate, id]
  )

  if (isLoadingData) {
    return (
      <Flex align="center" justify="center" className="h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </Flex>
    )
  }

  return (
    <>
      <PageTitle
        title="Chỉnh sửa Phiếu thông tin giao dịch"
        enableBackButton
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Phiếu thông tin giao dịch', href: APP_PATH.TRANSACTION_SHEET },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <div className="flex flex-col gap-4 pb-12">
        {initialValues && (
          <TransactionSheetForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isUpdating}
            isEdit
          />
        )}
      </div>
    </>
  )
}

export default TransactionSheetEditPage
