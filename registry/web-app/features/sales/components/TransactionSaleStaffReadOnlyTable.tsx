import { Table } from '@radix-ui/themes'
import { formatCurrencyVND, formatPercent } from '@/utils'
import {
  TRANSACTION_SALE_TYPE,
  TransactionSaleType,
} from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'

type SaleStaffEntry = {
  sale_type?: string
  full_name?: string
  employee_detail?: {
    id?: number
    fullname?: string
    branch?: { name?: string }
    department?: { name?: string }
  }
  exchange_detail?: { name?: string }
  collaborator_detail?: { name?: string; fullname?: string }
  participation_percentage?: string | number
  percentage?: number
  revenue_amount?: string | number
}

type Props = {
  data: SaleStaffEntry[]
  feeCalculationPrice?: number
  pctRevenue?: number
  amtRevenue?: number
}

export const TransactionSaleStaffReadOnlyTable = ({
  data,
  feeCalculationPrice,
  pctRevenue,
  amtRevenue,
}: Props) => {
  const totalPercentage = data.reduce((acc, curr) => {
    const pct = curr.participation_percentage != null
      ? Number(curr.participation_percentage)
      : curr.percentage != null
        ? Number(curr.percentage)
        : 0
    return acc + pct
  }, 0)

  const totalAmount = data
    .filter((s) => s.sale_type !== 'partner')
    .reduce((acc, curr) => {
      const pct = curr.participation_percentage != null
        ? Number(curr.participation_percentage)
        : curr.percentage != null
          ? Number(curr.percentage)
          : 0
      
      const amt = feeCalculationPrice != null
        ? pctRevenue != null
          ? (feeCalculationPrice * pctRevenue * pct) / 10000
          : (feeCalculationPrice * pct) / 100
        : Number(curr.revenue_amount || 0)
        
      return acc + amt
    }, 0)



  return (
    <div className="border-border-1 overflow-hidden border">
      <Table.Root className="w-full border-collapse">
        <Table.Header className="border-border-1 bg-background-2 border-b">
          <Table.Row>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: 'auto', minWidth: '300px' }}
            >
              Người bán
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: '150px', minWidth: '150px' }}
            >
              Loại hình
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: '150px', minWidth: '150px' }}
            >
              Tỷ lệ tham gia (%)
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: '220px', minWidth: '220px' }}
            >
              Tỷ lệ doanh thu (Tạm tính)
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: '280px', minWidth: '280px' }}
            >
              {/* NOTE: Cột này thể hiện Thành tiền doanh thu BĐS (Tạm tính) (STT 42 / Bug 86exqzkx4) */}
              Thành tiền doanh thu BĐS (Tạm tính)
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B] hover:bg-transparent"
              style={{ width: '300px', minWidth: '300px' }}
            >
              Thành tiền doanh thu cá nhân (Tạm tính)
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data.length > 0 ? (
            data.map((sale, idx) => {
              const isInternal = sale.sale_type === 'mv'
              const personLabel = isInternal
                ? sale.employee_detail?.fullname || '-'
                : sale.full_name ||
                  sale.exchange_detail?.name ||
                  sale.collaborator_detail?.fullname ||
                  sale.collaborator_detail?.name ||
                  '-'

              const pct =
                sale.participation_percentage != null
                  ? sale.participation_percentage
                  : sale.percentage != null
                    ? sale.percentage
                    : null

              return (
                <Table.Row
                  key={idx}
                  className="border-border-1 border-b last:border-0 hover:bg-transparent"
                >
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle hover:bg-transparent">
                    <div className="flex flex-col">
                      {isInternal && sale.employee_detail?.id ? (
                        <Link
                          to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(
                            ':id',
                            String(sale.employee_detail.id)
                          )}
                          target="_blank"
                          className="text-action-primary-default font-medium hover:underline"
                        >
                          {personLabel}
                        </Link>
                      ) : (
                        <span>{personLabel}</span>
                      )}
                      {isInternal && (
                        <span className="text-content-dark-3 text-xs">
                          {[
                            sale.employee_detail?.branch?.name,
                            sale.employee_detail?.department?.name,
                          ]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 align-middle hover:bg-transparent">
                    {TRANSACTION_SALE_TYPE[sale.sale_type as TransactionSaleType] ??
                      sale.sale_type ??
                      '-'}
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-center align-middle hover:bg-transparent">
                    {pct != null ? formatPercent(pct) : '-'}
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-center align-middle hover:bg-transparent">
                    {sale.sale_type === 'partner'
                      ? formatPercent(0)
                      : pctRevenue != null
                        ? formatPercent(pctRevenue)
                        : '100%'}
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-right align-middle text-[#E5202B] hover:bg-transparent">
                    {sale.sale_type === 'partner'
                      ? formatCurrencyVND(0) + ' VNĐ'
                      : (() => {
                          const rowBaseAmt = amtRevenue != null
                            ? amtRevenue
                            : feeCalculationPrice != null
                              ? pctRevenue != null
                                ? (feeCalculationPrice * pctRevenue) / 100
                                : feeCalculationPrice
                              : (pct != null && Number(pct) > 0
                                ? (Number(sale.revenue_amount || 0) * 100) / Number(pct)
                                : Number(sale.revenue_amount || 0));
                          return formatCurrencyVND(rowBaseAmt) + ' VNĐ';
                        })()}
                  </Table.Cell>
                  <Table.Cell className="typo-body-base-regular px-3 py-2 text-right align-middle text-[#E5202B] hover:bg-transparent">
                    {sale.sale_type === 'partner'
                      ? formatCurrencyVND(0) + ' VNĐ'
                      : (() => {
                          const rowIndividualAmt = feeCalculationPrice != null && pct != null
                            ? pctRevenue != null
                              ? (feeCalculationPrice * pctRevenue * Number(pct)) / 10000
                              : (feeCalculationPrice * Number(pct)) / 100
                            : sale.revenue_amount != null
                              ? Number(sale.revenue_amount)
                              : 0;
                          return formatCurrencyVND(rowIndividualAmt) + ' VNĐ';
                        })()}
                  </Table.Cell>
                </Table.Row>
              )
            })
          ) : (
            <Table.Row className="hover:bg-transparent">
              <Table.Cell
                colSpan={6}
                className="text-content-dark-3 p-4 text-center text-sm hover:bg-transparent"
              >
                Không có dữ liệu
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
        {/* Total row */}
        {data.length > 0 && (
          <Table.Body className="bg-[#F7EBEB]">
            <Table.Row className="hover:bg-transparent">
              <Table.Cell
                className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle"
                colSpan={2}
              >
                Tổng
              </Table.Cell>
              <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-left align-middle">
                {formatPercent(totalPercentage)}
              </Table.Cell>
              <Table.Cell className="border-border-1 !p-0" />
              <Table.Cell className="border-border-1 border-r !p-0" />
              <Table.Cell className="typo-body-base-semibold px-3 py-4 text-right align-middle text-[#E5202B]">
                {formatCurrencyVND(totalAmount)} VNĐ
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        )}
      </Table.Root>
    </div>
  )
}
