import { useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toastService from '@/services/toast-service'
import { Flex } from '@radix-ui/themes'
import { TransactionSheetForm } from './components/TransactionSheetForm'
import { TransactionSheetFormValues } from '@/features/sales/transaction-sheets/types/transaction-sheet-form-types'
import { APP_PATH } from '@/routes'
import { PageTitle } from '@/components/ui'
import { useCreateTransactionSheet } from '@/features/sales/transaction-sheets/services/transaction-sheet-service'
import { formatDateToApi } from '@/utils/date-utils'
import {
  useDepositContract,
  DepositStatus,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { withRememberedSearch } from '@/utils/list-url-memory'

const TransactionSheetCreatePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const depositContractId = searchParams.get('deposit_contract_id')

  const { data: depositContractDetail, isLoading: isLoadingDeposit } = useDepositContract(
    Number(depositContractId),
    { enabled: !!depositContractId }
  )

  const { mutateAsync: createTransactionSheet, isPending: isSubmitting } =
    useCreateTransactionSheet()

  useEffect(() => {
    if (!depositContractDetail) return
    const dc = depositContractDetail as { status?: string; approval_status?: string }
    const status = dc.status
    const approvalStatus = dc.approval_status
    if (
      approvalStatus !== 'approved' ||
      status === DepositStatus.REFUNDED ||
      status === DepositStatus.ABANDONED ||
      status === DepositStatus.REJECTED
    ) {
      toastService.error(
        'Hợp đồng đặt cọc chưa được phê duyệt hoặc đã bị hủy/hoàn tiền/từ chối. Không thể tạo Phiếu TTGD.'
      )
      navigate(APP_PATH.TRANSACTION_SHEET, { replace: true })
    }
  }, [depositContractDetail, navigate])

  const initialValues = useMemo<any>(() => {
    if (!depositContractDetail) return undefined

    const dc = depositContractDetail as any
    return {
      deposit_contract: dc.id,
      customer: dc.customer_detail?.id,
      customer_type: dc.customer_detail?.customer_type,
      investor: dc.investor_detail?.id,
      project: dc.project_detail?.id,
      product_inventory: dc.product_inventory_detail?.id,
      sales_allocation: dc.sales_allocation_detail?.id,
      note: dc.note,
      fee_calculation_price:
        dc.fee_calculation_price !== undefined && dc.fee_calculation_price !== null
          ? Number(dc.fee_calculation_price)
          : undefined,

      sales_staff:
        dc.sales_staff?.map((sale: any) => ({
          employee: sale.employee_detail?.id ?? sale.employee,
          exchange: sale.exchange_detail?.id ?? sale.exchange,
          collaborator: sale.collaborator_detail?.id ?? sale.collaborator,
          employee_detail: sale.employee_detail,
          exchange_detail: sale.exchange_detail,
          collaborator_detail: sale.collaborator_detail,
          full_name:
            sale.collaborator_name ||
            sale.full_name ||
            sale.collaborator_detail?.fullname ||
            sale.collaborator_detail?.name ||
            sale.employee_detail?.fullname ||
            sale.exchange_detail?.name ||
            '',
          sale_type: sale.sale_type,
          percentage: Number(sale.percentage ?? sale.participation_percentage) || 0,
          pct_commission: sale.pct_commission,
          amt_commission: sale.amt_commission,
        })) || [],
    }
  }, [depositContractDetail])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.TRANSACTION_SHEET))
  }, [navigate])

  const handleSubmit = useCallback(
    async (values: TransactionSheetFormValues) => {
      const payload: any = {
        deposit_contract_id: values.deposit_contract,
        customer_id: values.customer,
        note: values.note,
        sales_staff: values.sales_staff.map((item) => {
          const fullName =
            item.sale_type === 'mv'
              ? item.employee_detail?.fullname || ''
              : item.sale_type === 'collaborator'
                ? item.collaborator_detail?.fullname || item.collaborator_detail?.name || ''
                : item.exchange_detail?.label || item.exchange_detail?.name || ''

          return {
            sale_type: item.sale_type,
            employee_id: item.employee,
            exchange_id: item.exchange,
            collaborator_id: item.collaborator,
            full_name: fullName,
            participation_percentage: Number(item.percentage) || 0,
          }
        }),
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
      if (values.attachments && values.attachments.length > 0) {
        payload.files = { attachments: values.attachments }
      }

      await createTransactionSheet(payload)
      toastService.success('Tạo mới Phiếu thông tin giao dịch thành công')
      navigate(APP_PATH.TRANSACTION_SHEET)
    },
    [createTransactionSheet, navigate]
  )

  return (
    <>
      <PageTitle enableBackButton />
      <div className="flex flex-col gap-4 pb-12">
        {depositContractId && isLoadingDeposit ? (
          <Flex align="center" justify="center" className="min-h-[400px]">
            <span>Đang tải dữ liệu...</span>
          </Flex>
        ) : (
          <TransactionSheetForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </>
  )
}

export default TransactionSheetCreatePage
