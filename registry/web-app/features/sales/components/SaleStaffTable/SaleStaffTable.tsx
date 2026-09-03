import { useRef, useId } from 'react'
import { Table, Text, DropdownMenu } from '@radix-ui/themes'
import { Plus, Pencil, Trash2 } from 'lucide-react'

import { cn, formatCurrencyVND, formatPercent } from '@/utils'
import { Button, IconButton } from '@/components/ui'
import { LineRevenueGuardLabel } from '@/features/sales/components/LineRevenueGuardLabel'
import { FormArrayError } from '@/components/ui/form'
import useHorizontalWheelScroll from '@/hooks/useHorizontalWheelScroll'

import type { SaleStaffTableProps } from './types'

/**
 * SaleStaffTable – shared presentational component.
 *
 * Renders the "Nhân sự phụ trách bán" table used in both
 * DepositContract and BookingContract forms.
 *
 * All form-binding is delegated to the parent via render props
 * (renderParticipationCell / renderCommissionCell) so this component
 * stays independent of any specific RHF form type.
 */
export function SaleStaffTable({
  isReadOnly,
  isAmtCommission,
  revenueType,
  rows,
  totalPercentage,
  totalDTCaNhan,
  totalHoaHong,
  canShowFinancials = true,
  renderParticipationCell,
  renderCommissionCell,
  onAdd,
  onEdit,
  onRemove,
  formArrayErrors,
}: SaleStaffTableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  useHorizontalWheelScroll(wrapperRef)
  const tableId = `sale-staff-table-${useId().replace(/:/g, '')}`

  // ─── Column header style helpers ────────────────────────────────
  const stickyColStyle = (left: string, width: string): React.CSSProperties => ({
    left,
    width,
    minWidth: width,
    backgroundColor: 'var(--color-background-2)',
    boxShadow: 'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
  })

  const actionColStyle: React.CSSProperties = {
    width: '60px',
    minWidth: '60px',
    backgroundColor: 'var(--color-background-2)',
    boxShadow: 'inset 1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
  }

  const stickyRowCellStyle = (left: string, width: string): React.CSSProperties => ({
    left,
    width,
    minWidth: width,
    maxWidth: width,
    backgroundColor: '#ffffff',
    boxShadow: 'inset -1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
  })

  const actionRowCellStyle: React.CSSProperties = {
    width: '60px',
    minWidth: '60px',
    backgroundColor: '#ffffff',
    boxShadow: 'inset 1px 0 0 0 var(--color-border-1), inset 0 -1px 0 0 var(--color-border-1)',
  }

  // ─── Empty state ─────────────────────────────────────────────────
  if (rows.length === 0 && !isReadOnly) {
    return (
      <div className="flex flex-col gap-4">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Nhân sự phụ trách bán</Text>
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center rounded-sm border border-dashed p-8">
          <Button
            type="button"
            variant="secondary-border"
            size="medium"
            onClick={onAdd}
            leftIcon={<Plus className="h-4 w-4" />}
            className="gap-2"
          >
            Thêm nhân sự phụ trách bán
          </Button>
        </div>
        <FormArrayError errors={formArrayErrors} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-content-dark-1 typo-body-xl-semibold">Nhân sự phụ trách bán</Text>

      <div
        ref={wrapperRef}
        id={tableId}
        className="border-border-1 relative overflow-hidden border"
      >
        <style>{`
          #${tableId} .rt-ScrollAreaScrollbar[data-orientation='horizontal'] {
            margin-left: 450px !important;
          }
        `}</style>

        <Table.Root className="w-full border-collapse [&_table.rt-TableRootTable]:min-w-[1620px]">
          {/* ── Header ───────────────────────────────────────────── */}
          <Table.Header
            className="border-border-1 bg-background-2 border-b"
            style={{ ['--table-row-background-color' as never]: 'var(--color-background-2)' }}
          >
            <Table.Row>
              <Table.ColumnHeaderCell
                className="typo-body-base-medium sticky left-0 z-20 px-3 py-3 text-center align-middle text-[#4B4B4B]"
                style={stickyColStyle('0px', '150px')}
              >
                Loại hình
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="typo-body-base-medium sticky z-20 px-3 py-3 text-left align-middle text-[#4B4B4B]"
                style={stickyColStyle('150px', '300px')}
              >
                Nhân viên
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                style={{ width: '150px', minWidth: '150px' }}
              >
                Giá tạm tính
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                style={{ width: '180px', minWidth: '180px' }}
              >
                {revenueType === 'amt' ? 'Doanh thu (VNĐ)' : 'Tỉ lệ doanh thu'}
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r py-3 pr-8 pl-3 text-right align-middle text-[#4B4B4B]"
                style={{ width: '140px', minWidth: '140px' }}
              >
                Tỷ lệ tham gia
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                style={{ width: '220px', minWidth: '220px' }}
              >
                Thành tiền doanh thu cá nhân
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r py-3 pr-8 pl-3 text-right align-middle text-[#4B4B4B]"
                style={{ width: '180px', minWidth: '180px' }}
              >
                Tỷ lệ Hoa hồng{isAmtCommission ? ' (VNĐ)' : ' (%)'}
              </Table.ColumnHeaderCell>

              <Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                style={{ width: '240px', minWidth: '240px' }}
              >
                Thành tiền hoa hồng
              </Table.ColumnHeaderCell>

              {!isReadOnly && (
                <Table.ColumnHeaderCell
                  className="sticky right-0 z-20 px-3 py-3 text-center align-middle"
                  style={actionColStyle}
                />
              )}
            </Table.Row>
          </Table.Header>

          {/* ── Body rows ─────────────────────────────────────────── */}
          <Table.Body>
            {rows.map((row, index) => (
              <Table.Row key={row.id} className="border-border-1 border-b last:border-b-0">
                {/* Loại hình – sticky left 0 */}
                <Table.Cell
                  className="typo-body-base-regular sticky left-0 z-10 px-3 py-2 align-middle"
                  style={stickyRowCellStyle('0px', '150px')}
                >
                  {row.saleTypeLabel}
                </Table.Cell>

                {/* Nhân viên – sticky left 150 */}
                <Table.Cell
                  className="typo-body-base-regular sticky z-10 px-3 py-2 align-middle"
                  style={stickyRowCellStyle('150px', '300px')}
                >
                  <div className="flex flex-col gap-0.5 py-1">
                    <LineRevenueGuardLabel countAsLineRevenue={row.countAsLineRevenue ?? undefined}>
                      <span>{row.personLabel}</span>
                    </LineRevenueGuardLabel>
                    {row.branchDeptLabel && (
                      <span className="text-content-dark-3 typo-body-small-regular">
                        {row.branchDeptLabel}
                      </span>
                    )}
                    {row.personnelError && (
                      <span className="mt-1 text-xs text-red-500">{row.personnelError}</span>
                    )}
                  </div>
                </Table.Cell>

                {/* Giá tạm tính */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle'
                  )}
                >
                  <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                    {canShowFinancials ? formatCurrencyVND(row.feeCalculationPriceDisplay) : ''}
                  </div>
                </Table.Cell>

                {/* Doanh thu / tỉ lệ doanh thu */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle'
                  )}
                >
                  <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                    {canShowFinancials ? row.revenueDisplay : ''}
                  </div>
                </Table.Cell>

                {/* Tỷ lệ tham gia – form-bound render prop */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle',
                    { 'bg-neutral-10': isReadOnly }
                  )}
                >
                  {renderParticipationCell(index, row)}
                </Table.Cell>

                {/* Thành tiền DT cá nhân */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle'
                  )}
                >
                  <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                    {row.thanhTienDTCaNhan !== null ? formatCurrencyVND(row.thanhTienDTCaNhan) : ''}
                  </div>
                </Table.Cell>

                {/* Hoa hồng – form-bound render prop */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle',
                    { 'bg-neutral-10': isReadOnly }
                  )}
                >
                  {renderCommissionCell(index, row)}
                </Table.Cell>

                {/* Thành tiền hoa hồng */}
                <Table.Cell
                  className={cn(
                    'border-border-1 typo-body-base-regular border-r bg-white !p-0 align-middle'
                  )}
                >
                  <div className="flex h-full min-h-[44px] w-full items-center justify-end px-3">
                    {row.thanhTienHoaHong !== null ? formatCurrencyVND(row.thanhTienHoaHong) : ''}
                  </div>
                </Table.Cell>

                {/* Actions – sticky right */}
                {!isReadOnly && (
                  <Table.Cell
                    className="sticky right-0 z-10 px-3 py-2 text-center align-middle"
                    style={actionRowCellStyle}
                  >
                    <div className="flex items-center justify-center">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <IconButton variant="text" color="gray" className="text-gray-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item onClick={() => onEdit(index)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenu.Item>
                          <DropdownMenu.Item color="red" onClick={() => onRemove(index)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>

          {/* ── Add button row ────────────────────────────────────── */}
          {!isReadOnly && (
            <Table.Body>
              <Table.Row>
                <Table.Cell colSpan={9} className="border-none !px-0 !py-4">
                  <div className="sticky left-3 w-max pl-3">
                    <Button
                      type="button"
                      variant="text"
                      color="gray"
                      size="large"
                      onClick={onAdd}
                      leftIcon={<Plus className="h-5 w-5" />}
                      className="font-body-base-medium text-content-dark-1 flex gap-3"
                    >
                      Thêm nhân sự phụ trách bán
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          )}

          {/* ── Total row ─────────────────────────────────────────── */}
          <Table.Body className="bg-background-2">
            <Table.Row>
              <Table.Cell
                className="typo-body-base-semibold sticky left-0 z-10 px-3 py-4 text-center align-middle"
                style={{
                  width: '150px',
                  minWidth: '150px',
                  backgroundColor: 'var(--color-background-2)',
                  boxShadow: 'inset -1px 0 0 0 var(--color-border-1)',
                }}
              >
                Tổng
              </Table.Cell>

              <Table.Cell
                className="typo-body-base-semibold sticky z-10 px-3 py-4 text-left align-middle"
                style={{
                  left: '150px',
                  width: '300px',
                  minWidth: '300px',
                  backgroundColor: 'var(--color-background-2)',
                  boxShadow: 'inset -1px 0 0 0 var(--color-border-1)',
                }}
              />

              {/* Giá tạm tính + Doanh thu – empty */}
              <Table.Cell
                className="border-border-1 border-r"
                colSpan={2}
                style={{ backgroundColor: 'var(--color-background-2)' }}
              />

              {/* Tổng tỷ lệ tham gia */}
              <Table.Cell className="border-border-1 typo-body-base-semibold border-r py-4 pr-8 pl-3 text-right align-middle">
                {formatPercent(totalPercentage)}
              </Table.Cell>

              {/* Tổng DT cá nhân */}
              <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle text-[#E5202B]">
                {canShowFinancials && totalDTCaNhan > 0 ? formatCurrencyVND(totalDTCaNhan) : ''}
              </Table.Cell>

              {/* Tổng hoa hồng */}
              <Table.Cell className="border-border-1 typo-body-base-semibold border-r py-4 pr-8 pl-3 text-right align-middle" />

              {/* Tổng hoa hồng */}
              <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-right align-middle text-[#E5202B]">
                {canShowFinancials && totalHoaHong > 0 ? formatCurrencyVND(totalHoaHong) : ''}
              </Table.Cell>

              {!isReadOnly && (
                <Table.Cell
                  className="sticky right-0 z-10 !p-0"
                  style={{
                    width: '60px',
                    minWidth: '60px',
                    backgroundColor: 'var(--color-background-2)',
                    boxShadow: 'inset 1px 0 0 0 var(--color-border-1)',
                  }}
                />
              )}
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>

      <FormArrayError errors={formArrayErrors} />
    </div>
  )
}
