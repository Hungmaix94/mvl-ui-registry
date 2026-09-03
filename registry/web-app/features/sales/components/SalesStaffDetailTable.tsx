import { useRef, useId } from 'react'
import { Table } from '@radix-ui/themes'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { formatRateSpecWithEquivalent } from '@/utils/rate-spec'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LineRevenueGuardLabel } from '@/features/sales/components/LineRevenueGuardLabel'
import { Info } from 'lucide-react'
import useHorizontalWheelScroll from '@/hooks/useHorizontalWheelScroll'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { F2Source as F2SourceEnum } from '@/constants/api-schema-aliases'

const localF2SourceLabels: Record<string, string> = {
  linked: 'Sàn liên kết',
  company: 'Công ty',
  director: 'Giám đốc kinh doanh',
}

export interface SalesStaffDetailTableProps {
  salesStaff: any[]
  baseAmount: number
  feeCalculationPrice?: number
  commissionType?: 'pct' | 'amt'
  pctRevenue?: number | string | null
  amtRevenue?: number | string | null
  revenueType?: 'pct' | 'amt'
  showSaleType?: boolean
  saleTypeLabel?: (type: string) => string
  showConfirmationStatus?: boolean
}

export const SalesStaffDetailTable = ({
  salesStaff,
  baseAmount,
  feeCalculationPrice,
  commissionType = 'pct',
  pctRevenue,
  amtRevenue,
  revenueType = 'pct',
  showSaleType = false,
  saleTypeLabel,
  showConfirmationStatus = false,
}: SalesStaffDetailTableProps) => {
  const feeCalcPrice = feeCalculationPrice ?? baseAmount
  const isAmtCommission = commissionType === 'amt'
  const colSpanOffset = (showSaleType ? 1 : 0) + (showConfirmationStatus ? 1 : 0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  useHorizontalWheelScroll(wrapperRef)

  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const f2SourceLabels = keysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as
    | Record<string, string>
    | undefined

  const getF2SourceLabel = (f2Source: string | null | undefined) => {
    const source = f2Source || 'linked'
    return f2SourceLabels?.[source] ?? localF2SourceLabels[source] ?? source
  }

  const tableId = `table-${useId().replace(/:/g, '')}`

  return (
    <div ref={wrapperRef} id={tableId} className="border-border-1 relative border">
      <style>{`
        #${tableId} .rt-ScrollAreaScrollbar[data-orientation='horizontal'] {
          margin-left: ${showSaleType ? '350px' : '220px'} !important;
        }
      `}</style>
      <Table.Root className="w-full border-collapse [&_table.rt-TableRootTable]:min-w-[1400px]">
        <Table.Header
          className="border-border-1 bg-background-2 border-b"
          style={{ ['--table-row-background-color' as never]: 'var(--color-background-2)' }}
        >
          <Table.Row>
            {showSaleType && (
              <Table.ColumnHeaderCell
                className="typo-body-base-medium text-content-dark-2 sticky left-0 z-20 px-3 py-3 text-center align-middle"
                style={{
                  width: '130px',
                  minWidth: '130px',
                  backgroundColor: 'var(--color-background-2)',
                  boxShadow:
                    'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
                }}
              >
                Loại hình
              </Table.ColumnHeaderCell>
            )}
            <Table.ColumnHeaderCell
              className="typo-body-base-medium text-content-dark-2 sticky z-20 px-3 py-3 text-center align-middle"
              style={{
                width: '220px',
                minWidth: '220px',
                left: showSaleType ? '130px' : '0',
                backgroundColor: 'var(--color-background-2)',
                boxShadow:
                  'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
              }}
            >
              Nhân viên
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-center align-middle"
              style={{ width: '140px', minWidth: '140px' }}
            >
              Giá tạm tính
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-center align-middle"
              style={{ width: '140px', minWidth: '140px' }}
            >
              {revenueType === 'amt' ? 'Doanh thu (VNĐ)' : 'Tỷ lệ doanh thu'}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-center align-middle"
              style={{ width: '120px', minWidth: '120px' }}
            >
              Tỷ lệ tham gia
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-right align-middle"
              style={{ width: '190px', minWidth: '190px' }}
            >
              <div className="flex items-center justify-end gap-1">
                Thành tiền doanh thu cá nhân
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-content-dark-4 hover:text-content-dark-2 h-4 w-4 shrink-0 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Công thức: Doanh thu (VNĐ) × Tỷ lệ tham gia (%)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-center align-middle"
              style={{ width: '160px', minWidth: '160px' }}
            >
              {isAmtCommission ? 'Hoa hồng (VNĐ)' : 'Tỷ lệ Hoa hồng (%)'}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              className="border-border-1 typo-body-base-medium text-content-dark-2 border-r px-3 py-3 text-right align-middle"
              style={{ width: '190px', minWidth: '190px' }}
            >
              <div className="flex items-center justify-end gap-1">
                Thành tiền hoa hồng
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-content-dark-4 hover:text-content-dark-2 h-4 w-4 shrink-0 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Hoa hồng (VNĐ): Hoa hồng (VNĐ) × Tỷ lệ tham gia (%)</p>
                      <p>Hoa hồng (%): Giá tạm tính × Tỷ lệ tham gia (%) × Tỷ lệ Hoa hồng (%)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Table.ColumnHeaderCell>
            {showConfirmationStatus && (
              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium text-content-dark-2 px-3 py-3 text-center align-middle"
                style={{ width: '130px', minWidth: '130px' }}
              >
                Trạng thái
              </Table.ColumnHeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {salesStaff && salesStaff.length > 0 ? (
            salesStaff.map((staff: any, index: number) => {
              const percentage = Number(staff.participation_percentage || staff.percentage || 0)

              const rowIsAmtCommission =
                isAmtCommission ||
                (staff.amt_commission != null && Number(staff.amt_commission) > 0) ||
                (staff.amt_f2_commission != null && Number(staff.amt_f2_commission) > 0)

              let dealCommissionValue = 0
              if (rowIsAmtCommission) {
                dealCommissionValue = Number(staff.amt_commission ?? staff.amt_f2_commission ?? 0)
              } else {
                dealCommissionValue = Number(
                  staff.pct_commission ?? staff.pct_sale_commission ?? staff.pct_f2_commission ?? 0
                )
              }
              const isPartner = staff.sale_type === 'partner'
              const rowPctRevenue = isPartner
                ? 0
                : staff.pct_revenue !== undefined && staff.pct_revenue !== null
                  ? Number(staff.pct_revenue)
                  : pctRevenue !== undefined && pctRevenue !== null
                    ? Number(pctRevenue)
                    : 100
              const rowBaseAmt = isPartner
                ? 0
                : revenueType === 'amt' && amtRevenue !== undefined && amtRevenue !== null
                  ? Number(amtRevenue)
                  : feeCalcPrice * (rowPctRevenue / 100)

              const thanhTienDTCaNhan = (rowBaseAmt * percentage) / 100
              const thanhTienHoaHong = rowIsAmtCommission
                ? dealCommissionValue * (percentage / 100)
                : feeCalcPrice * (percentage / 100) * (dealCommissionValue / 100)

              return (
                <Table.Row
                  key={staff.employee_detail?.id || index}
                  className="border-border-1 border-b last:border-b-0"
                >
                  {showSaleType && (
                    <Table.Cell
                      className="typo-body-base-regular sticky left-0 z-10 px-3 py-2 align-middle"
                      style={{
                        backgroundColor: 'var(--color-background-1)',
                        boxShadow:
                          'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
                      }}
                    >
                      {saleTypeLabel ? saleTypeLabel(staff.sale_type) : staff.sale_type}
                    </Table.Cell>
                  )}
                  <Table.Cell
                    className="typo-body-base-regular sticky z-10 px-3 py-2 align-middle"
                    style={{
                      left: showSaleType ? '130px' : '0',
                      backgroundColor: 'var(--color-background-1)',
                      boxShadow:
                        'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
                    }}
                  >
                    <div className="flex flex-col gap-1 py-2">
                      <div className="typo-body-base-regular">
                        {(() => {
                          const nameContent = staff.employee_detail?.id ? (
                            <Link
                              to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(
                                ':id',
                                String(staff.employee_detail.id)
                              )}
                              className="text-brand-primary hover:text-brand-secondary transition-colors"
                              target="_blank"
                            >
                              {staff.employee_detail.fullname || '-'}
                            </Link>
                          ) : (
                            staff.employee_detail?.fullname ||
                            staff.exchange_detail?.name ||
                            staff.collaborator_detail?.name ||
                            staff.collaborator_name ||
                            (staff.employee_id
                              ? `#${staff.employee_id}`
                              : staff.exchange_id
                                ? `#${staff.exchange_id}`
                                : staff.collaborator_id
                                  ? `#${staff.collaborator_id}`
                                  : '-')
                          )

                          return (
                            <LineRevenueGuardLabel countAsLineRevenue={staff.count_as_line_revenue}>
                              {nameContent}
                            </LineRevenueGuardLabel>
                          )
                        })()}
                      </div>
                      <div className="text-content-dark-3 typo-body-small-regular mt-1">
                        {[
                          staff.employee_detail?.branch?.name,
                          staff.employee_detail?.block?.name,
                          staff.employee_detail?.department?.name,
                          staff.exchange_detail?.code,
                          staff.collaborator_detail?.code,
                          staff.collaborator_detail?.phone,
                        ]
                          .filter(Boolean)
                          .join(' - ')}
                      </div>
                      {isPartner ? (
                        <div className="text-content-dark-2 typo-body-small-regular mt-1">
                          <span className="text-content-dark-3">Nguồn F2: </span>
                          {getF2SourceLabel(staff.f2_source)}
                          {staff.f2_source === F2SourceEnum.director &&
                          staff.f2_source_director_detail
                            ? ` — ${staff.f2_source_director_detail.fullname}`
                            : ''}
                        </div>
                      ) : null}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-center px-3">
                      {formatCurrencyVND(feeCalcPrice)}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-center px-3">
                      {isPartner
                        ? revenueType === 'amt'
                          ? formatCurrencyVND(0)
                          : formatPercent(0)
                        : revenueType === 'amt'
                          ? amtRevenue !== undefined && amtRevenue !== null
                            ? formatCurrencyVND(Number(amtRevenue))
                            : '---'
                          : rowPctRevenue !== undefined && rowPctRevenue !== null
                            ? formatPercent(rowPctRevenue)
                            : '---'}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-center px-3">
                      {formatPercent(percentage)}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                      {formatCurrencyVND(thanhTienDTCaNhan)}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-center px-3">
                      {formatRateSpecWithEquivalent(staff.pct_commission_spec) ||
                        (!staff.amt_commission &&
                        !staff.amt_f2_commission &&
                        !staff.pct_commission &&
                        !staff.pct_sale_commission &&
                        !staff.pct_f2_commission
                          ? '---'
                          : rowIsAmtCommission
                            ? formatCurrencyVND(dealCommissionValue)
                            : formatPercent(dealCommissionValue))}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r !p-0 align-middle">
                    <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                      {formatCurrencyVND(thanhTienHoaHong)}
                    </div>
                  </Table.Cell>
                  {showConfirmationStatus && (
                    <Table.Cell className="border-border-1 typo-body-base-regular !p-0 align-middle">
                      <div className="flex h-full min-h-[44px] w-full items-center justify-center px-3">
                        <Chip
                          label={staff.is_confirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                          variant={
                            staff.is_confirmed
                              ? ColoredValueVariant.GREEN
                              : ColoredValueVariant.ORANGE
                          }
                          size="small"
                        />
                      </div>
                    </Table.Cell>
                  )}
                </Table.Row>
              )
            })
          ) : (
            <Table.Row>
              <Table.Cell
                colSpan={7 + colSpanOffset}
                className="text-content-dark-3 px-3 py-4 text-center align-middle"
              >
                Không có người phụ trách bán
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
        <Table.Body className="bg-action-primary-red-activated">
          <Table.Row>
            {showSaleType && (
              <Table.Cell
                className="typo-body-base-semibold sticky left-0 z-10 px-3 py-4 text-center align-middle"
                style={{
                  backgroundColor: 'var(--color-action-primary-red-activated)',
                  boxShadow: 'inset -1px 0 0 0 var(--color-border-1)',
                }}
              ></Table.Cell>
            )}
            <Table.Cell
              className="typo-body-base-semibold sticky z-10 px-3 py-4 text-center align-middle"
              style={{
                left: showSaleType ? '130px' : '0',
                boxShadow: 'inset -1px 0 0 0 var(--color-border-1)',
                backgroundColor: 'var(--color-action-primary-red-activated)',
              }}
            >
              Tổng
            </Table.Cell>
            <Table.Cell
              colSpan={2}
              className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-center align-middle"
            ></Table.Cell>
            <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-center align-middle">
              {salesStaff?.reduce(
                (sum: number, staff: any) =>
                  sum + Number(staff.participation_percentage || staff.percentage || 0),
                0
              ) || 0}
              %
            </Table.Cell>
            <Table.Cell className="border-border-1 typo-body-base-semibold text-action-primary-red-default border-r px-3 py-4 text-right align-middle">
              {formatCurrencyVND(
                salesStaff?.reduce((sum: number, staff: any) => {
                  const percentage = Number(staff.participation_percentage || staff.percentage || 0)
                  const rowPctRevenue =
                    staff.pct_revenue !== undefined && staff.pct_revenue !== null
                      ? Number(staff.pct_revenue)
                      : pctRevenue !== undefined && pctRevenue !== null
                        ? Number(pctRevenue)
                        : 100
                  const rowBaseAmt =
                    revenueType === 'amt' && amtRevenue !== undefined && amtRevenue !== null
                      ? Number(amtRevenue)
                      : feeCalcPrice * (rowPctRevenue / 100)
                  return sum + (rowBaseAmt * percentage) / 100
                }, 0) || 0
              )}
            </Table.Cell>
            <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-center align-middle"></Table.Cell>
            <Table.Cell
              className={`border-border-1 typo-body-base-semibold text-action-primary-red-default px-3 py-4 text-right align-middle ${showConfirmationStatus ? 'border-r' : ''}`}
            >
              {formatCurrencyVND(
                salesStaff?.reduce((sum: number, staff: any) => {
                  const p = Number(staff.participation_percentage || staff.percentage || 0)
                  const hasAmtVal =
                    (staff.amt_commission != null && Number(staff.amt_commission) > 0) ||
                    (staff.amt_f2_commission != null && Number(staff.amt_f2_commission) > 0)
                  const rowIsAmt = isAmtCommission || hasAmtVal

                  let dealVal = 0
                  if (rowIsAmt) {
                    dealVal = Number(staff.amt_commission ?? staff.amt_f2_commission ?? 0)
                    return sum + dealVal * (p / 100)
                  } else {
                    dealVal = Number(
                      staff.pct_commission ??
                        staff.pct_sale_commission ??
                        staff.pct_f2_commission ??
                        0
                    )
                    return sum + feeCalcPrice * (p / 100) * (dealVal / 100)
                  }
                }, 0) || 0
              )}
            </Table.Cell>
            {showConfirmationStatus && (
              <Table.Cell className="border-border-1 typo-body-base-semibold px-3 py-4 text-center align-middle"></Table.Cell>
            )}
          </Table.Row>
        </Table.Body>
      </Table.Root>
    </div>
  )
}
