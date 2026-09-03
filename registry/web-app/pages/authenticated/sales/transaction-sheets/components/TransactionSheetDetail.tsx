import { Flex } from '@radix-ui/themes'
import { Text } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { CustomerDetailCard } from '@/features/sales/components/CustomerDetailCard'
import { ProjectDetailGrid } from '@/features/sales/components/ProjectDetailGrid'
import {
  TransactionSheet,
  TransactionSheetStatus,
} from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { format } from 'date-fns'
import { useCustomer } from '@/services/sales-service'
import { formatCurrencyVND } from '@/utils/common'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { TransactionSaleStaffReadOnlyTable } from '@/features/sales/components/TransactionSaleStaffReadOnlyTable'
import { TransactionSheetStatusBadge } from './TransactionSheetStatusBadge'
import { APP_PATH } from '@/routes'
import { Link } from 'react-router-dom'

type Props = {
  sheet: TransactionSheet
}

export const TransactionSheetDetail = ({ sheet }: Props) => {
  const { data: customerData } = useCustomer(Number(sheet.customer_detail?.id))

  return (
    <Flex direction="column" gap="6" className="px-10 py-4">
      {/* ────────────────────────────────────────────────────────
                  SECTION 1 — Thông tin Khách hàng
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin khách hàng</Text>
        <CustomerDetailCard
          customer={{
            id: customerData?.id || sheet.customer_detail?.id,
            customer_type: customerData?.customer_type || sheet.customer_detail?.customer_type,
            code: customerData?.code || sheet.customer_detail?.code,
            name:
              (customerData?.customer_type || sheet.customer_detail?.customer_type) === 'business'
                ? customerData?.business_name || sheet.customer_detail?.name
                : customerData?.full_name || sheet.customer_detail?.name,
            identify_number:
              (customerData?.customer_type || sheet.customer_detail?.customer_type) === 'business'
                ? customerData?.business_tax_code || sheet.customer_detail?.identify_number
                : customerData?.id_number || sheet.customer_detail?.identify_number,
            phone: customerData?.phone,
            email: customerData?.email,
          }}
        />
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 2 — Thông tin Dự án
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin dự án</Text>
        <ProjectDetailGrid
          projectData={{
            project_name: sheet.project_detail?.name,
            project_id: sheet.project_detail?.id,
            investor_name: sheet.investor_detail?.name || '-',
            property_code:
              sheet.product_inventory_detail?.unit_number ||
              sheet.product_inventory_detail?.code ||
              '-',
            product_inventory_id: sheet.product_inventory_detail?.id,
            sales_allocation_id: sheet.sales_allocation_detail?.id,
          }}
        />
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 3 — Thông tin Giao dịch
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin giao dịch</Text>
        <div className="bg-background-1 grid grid-cols-1 gap-6 md:grid-cols-2">
          <DetailRow
            label="Hợp đồng đặt cọc"
            value={
              sheet.deposit_contract_detail?.id ? (
                <Link
                  to={APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(
                    ':id',
                    String(sheet.deposit_contract_detail.id)
                  )}
                  className="text-action-primary-default hover:underline"
                >
                  {sheet.deposit_contract_detail.code}
                </Link>
              ) : (
                sheet.deposit_contract_detail?.code || '-'
              )
            }
          />
          <DetailRow
            label="Ngày ký HĐMB dự kiến"
            value={
              sheet.purchase_contract_date
                ? format(new Date(sheet.purchase_contract_date), 'dd/MM/yyyy')
                : '-'
            }
          />
          <DetailRow
            label="Trạng thái"
            value={
              sheet.approval_status ? (
                <TransactionSheetStatusBadge
                  status={sheet.approval_status as unknown as TransactionSheetStatus}
                />
              ) : (
                '-'
              )
            }
          />
          <DetailRow
            label="Giá niêm yết"
            value={sheet.listed_price ? formatCurrencyVND(Number(sheet.listed_price)) : '-'}
          />
          <DetailRow
            label="Giá tạm tính"
            value={
              sheet.fee_calculation_price
                ? formatCurrencyVND(Number(sheet.fee_calculation_price))
                : '-'
            }
          />
          <DetailRow label="Người tạo" value={sheet.created_by?.fullname || '-'} />
          <DetailRow
            label="Ngày tạo"
            value={sheet.created_at ? format(new Date(sheet.created_at), 'dd/MM/yyyy HH:mm') : '-'}
          />
          <DetailRow
            label="Ngày cập nhật cuối cùng"
            value={sheet.updated_at ? format(new Date(sheet.updated_at), 'dd/MM/yyyy HH:mm') : '-'}
          />
          <div className="md:col-span-2">
            <DetailRow label="Ghi chú" value={sheet.note || '-'} />
          </div>
        </div>
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 4 — Nhân sự phụ trách bán
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Nhân sự phụ trách bán</Text>
        <TransactionSaleStaffReadOnlyTable
          data={(sheet.sales_staff as any[]) || []}
          feeCalculationPrice={
            sheet.fee_calculation_price ? Number(sheet.fee_calculation_price) : undefined
          }
          pctRevenue={sheet.pct_revenue ? Number(sheet.pct_revenue) : undefined}
        />
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 5 — Thông tin người xác nhận
      ──────────────────────────────────────────────────────── */}
      <Flex direction="column" gap="4">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</Text>
        <Flex direction="column" className="w-full">
          <ConfirmationLogsTable logs={(sheet as any).confirmation_logs || []} />
        </Flex>
      </Flex>

      <SeparatorHorizontal />

      {/* ────────────────────────────────────────────────────────
                  SECTION 6 — Tài liệu đính kèm
      ──────────────────────────────────────────────────────── */}
      <AttachmentSection attachments={(sheet as any).attachments || []} isRequired={false} />
    </Flex>
  )
}
