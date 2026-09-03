import { Table, Flex } from '@radix-ui/themes'

import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { formatDate } from '@/utils/date-utils'
import { Button, Chip } from '@/components/ui'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconPencil, IconTrash } from '@/assets/icons'
import { MoreVertical, Eye } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  useCommissionWorkspaceSAManagement,
  CommissionPeriodEntry,
  parseCommissionLockError,
} from '@/services/realestate-service'
import { useDeleteSalesAllocationTbc } from '@/features/project/sale-allocations/services/sales-allocation-service'
import toastService from '@/services/toast-service'
import {
  findRate,
  RATE_COLUMNS,
  formatPctAmt,
} from '@/features/project/sale-allocations/components/tbc-management-helpers'

export type SaleAllocationTbcManagementTableProps = {
  saleAllocationId: number
  isReadOnly?: boolean
  highlightActiveDate?: string | null
  hideCurrentConfig?: boolean
}

import { TBC_STATUS_STYLES } from '@/constants/commission'

import { MANAGEMENT_ROLES } from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementForm'

export default function SaleAllocationTbcManagementTable({
  saleAllocationId,
  isReadOnly = false,
  highlightActiveDate,
  hideCurrentConfig = false,
}: SaleAllocationTbcManagementTableProps) {
  const navigate = useNavigate()
  const { displayConfirm, displayClose } = useDialog()
  const {
    data: workspace,
    isLoading,
    refetch,
  } = useCommissionWorkspaceSAManagement(saleAllocationId)
  const { mutateAsync: deletePeriod } = useDeleteSalesAllocationTbc(
    saleAllocationId,
    'tbc-management'
  )

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    )
  }

  const managementPeriods = workspace?.periods || []
  const currentMgmt = workspace?.current

  const handleEdit = (id: number) => {
    navigate(
      APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT.replace(':saId', String(saleAllocationId)).replace(
        ':id',
        String(id)
      )
    )
  }

  const handleCreate = (cloneId?: number) => {
    let path = APP_PATH.PROJECT_SA_TBC_MANAGEMENT_CREATE.replace(':saId', String(saleAllocationId))
    if (cloneId) {
      path += `?cloneFrom=${cloneId}`
    }
    navigate(path)
  }

  const handleDelete = async (id: number) => {
    displayConfirm({
      title: 'Xóa cấu hình',
      description: 'Bạn có chắc chắn muốn xóa cấu hình Thưởng HH quản lý này không?',
      onConfirm: async () => {
        try {
          await deletePeriod(id)
          toastService.success('Đã xóa thành công!')
          displayClose()
          refetch()
        } catch (error) {
          const lockError = parseCommissionLockError(error)
          if (lockError.recommended_action === 'clone_new_period') {
            displayConfirm({
              title: 'Cấu hình đang bị khóa',
              description: `${lockError.lock_reason}. Bạn có muốn tạo mới cấu hình từ đây không?`,
              confirmText: 'Tạo thiết lập mới',
              onConfirm: () => {
                handleCreate(id)
                displayClose()
              },
            })
          } else if (lockError.recommended_action === 'historical_correction') {
            toastService.warning(
              'Cấu hình đã khóa do đã phát sinh hoa hồng. Vui lòng liên hệ Admin để điều chỉnh!'
            )
            // Keep dialog open or close based on preference, closing is safer
            displayClose()
          } else {
            displayClose()
          }
        }
      },
    })
  }

  const handleRowActionClick = (
    entry: CommissionPeriodEntry,
    action: 'edit' | 'delete' | 'clone' | 'detail'
  ) => {
    const recordId = (entry as any).record?.id
    if (!recordId) return

    if (action === 'detail') {
      navigate(
        `${APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT.replace(':saId', String(saleAllocationId)).replace(':id', String(recordId))}?mode=view`
      )
      return
    }

    if (action === 'edit') {
      if (!entry.can_edit) {
        if (entry.recommended_action === 'clone_new_period') {
          displayConfirm({
            title: 'Cấu hình đang bị khóa',
            description: `${entry.lock_reason || 'Cấu hình đã khóa'}. Bạn có muốn tạo mới cấu hình từ đây không?`,
            confirmText: 'Tạo period mới',
            onConfirm: () => {
              handleCreate(recordId)
              displayClose()
            },
          })
        } else if (entry.recommended_action === 'historical_correction') {
          toastService.warning(
            'Cấu hình đã khóa do đã phát sinh giao dịch. Vui lòng liên hệ Admin để điều chỉnh!'
          )
        } else {
          toastService.warning(entry.lock_reason || 'Chỉnh sửa đã bị khóa.')
        }
        return
      }
      handleEdit(recordId)
    } else if (action === 'delete') {
      if (!entry.can_delete) {
        if (entry.recommended_action === 'clone_new_period') {
          displayConfirm({
            title: 'Cấu hình đang bị khóa',
            description: `${entry.lock_reason || 'Cấu hình không thể xóa'}. Bạn có muốn tạo mới cấu hình từ đây không?`,
            confirmText: 'Tạo period mới',
            onConfirm: () => {
              handleCreate(recordId)
              displayClose()
            },
          })
        } else if (entry.recommended_action === 'historical_correction') {
          toastService.warning(
            'Cấu hình đã khóa do đã phát sinh giao dịch. Vui lòng liên hệ Admin để điều chỉnh!'
          )
        } else {
          toastService.warning(entry.lock_reason || 'Tính năng xóa đã bị khóa.')
        }
        return
      }
      handleDelete(recordId)
    } else if (action === 'clone') {
      handleCreate(recordId)
    }
  }

  const renderActiveSummary = () => {
    const entry = (currentMgmt as any)?.entry
    const record = entry?.record

    return (
      <div className="mb-6 flex flex-col gap-3">
        <h3 className="text-content-dark-1 text-sm font-semibold">
          Cấu hình hoa hồng đang được áp dụng
        </h3>
        <div className="border-border-1 overflow-x-auto rounded-none border bg-white">
          <Table.Root className="w-full border-collapse text-left text-sm">
            <Table.Header className="bg-[#F0F2F5]">
              <Table.Row>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r border-b px-4 py-3 align-middle font-semibold text-[#4B4B4B]">
                  Chức vụ
                </Table.ColumnHeaderCell>
                {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => (
                  <Table.ColumnHeaderCell
                    key={col.category}
                    className="border-border-1 typo-body-base-medium border-r border-b px-4 py-3 align-middle font-semibold text-[#4B4B4B] last:border-r-0"
                  >
                    {col.label}
                  </Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body className="bg-white">
              {MANAGEMENT_ROLES.map((role) => (
                <Table.Row
                  key={role.value}
                  className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                >
                  <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle font-medium">
                    {role.label}
                  </Table.Cell>
                  {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => {
                    const { pct, amt, pctRoleTotal } = findRate(
                      record?.rates,
                      role.value as any,
                      col.category
                    )
                    return (
                      <Table.Cell
                        key={col.category}
                        className="border-border-1 border-r px-4 py-4 align-middle last:border-r-0"
                      >
                        {formatPctAmt(pct, amt, pctRoleTotal)}
                      </Table.Cell>
                    )
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!hideCurrentConfig && renderActiveSummary()}
      <Flex justify="between" align="center">
        <h3 className="text-content-dark-1 text-base font-semibold">Lịch sử cấu hình</h3>
        {!isReadOnly && (
          <Button type="button" onClick={() => handleCreate()} variant="secondary-border">
            Tạo thiết lập mới
          </Button>
        )}
      </Flex>
      <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle outline-none">
            <Table.Root
              className="w-full min-w-max border-collapse text-left outline-none"
              style={{ borderRadius: 0 }}
            >
              <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
                <Table.Row>
                  <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 border-r bg-[#F0F2F5] px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Khoảng thời gian
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Trạng thái
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Ngày tạo
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Người tạo
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Lý do/Ghi chú
                  </Table.ColumnHeaderCell>

                  {!isReadOnly && (
                    <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 sticky right-0 z-[1] w-[60px] bg-[#F0F2F5] px-4 py-3 text-center align-middle font-medium text-[#4B4B4B] shadow-[-1px_0_0_#e5e7eb]"></Table.ColumnHeaderCell>
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {managementPeriods.length === 0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={isReadOnly ? 5 : 6}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      Chưa có cấu hình lịch sử
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  managementPeriods.map((entry: any, index: number) => {
                    const statusConfig =
                      TBC_STATUS_STYLES[entry.entry?.period_status || entry.period_status] ||
                      TBC_STATUS_STYLES.fallback
                    const record = entry.record || entry

                    let isActive = entry.entry?.is_current || entry.is_current

                    if (highlightActiveDate) {
                      const refTime = new Date(highlightActiveDate).getTime()
                      const fromTime = record?.effective_from
                        ? new Date(record.effective_from).getTime()
                        : 0
                      const toTime = record?.effective_to
                        ? new Date(record.effective_to).getTime()
                        : Infinity
                      isActive = refTime >= fromTime && refTime <= toTime
                    }

                    const activeBg = isActive ? 'bg-[#CFFFD5]' : 'bg-white'

                    return (
                      <Table.Row
                        key={record?.id || index}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest('.action-cell')) {
                            const btn = e.currentTarget.querySelector(
                              '.action-btn'
                            ) as HTMLButtonElement
                            btn?.click()
                          }
                        }}
                        className={`border-border-1 hover:bg-surface-primary-hover cursor-pointer border-b transition-colors ${activeBg}`}
                      >
                        <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle whitespace-nowrap">
                          {record?.effective_from
                            ? `Từ ${formatDate(record.effective_from)}`
                            : 'Từ ...'}
                          {record?.effective_to ? ` đến ${formatDate(record.effective_to)}` : ''}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle">
                          <Chip
                            variant={statusConfig.variant}
                            size="small"
                            label={statusConfig.label}
                          />
                        </Table.Cell>
                        <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle whitespace-nowrap">
                          {record?.created_at ? formatDate(record.created_at) : '---'}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle whitespace-nowrap">
                          {record?.created_by?.name ||
                            record?.created_by?.full_name ||
                            record?.created_by_name ||
                            '---'}
                        </Table.Cell>
                        <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle">
                          {record?.note || entry?.lock_reason || '---'}
                        </Table.Cell>

                        {!isReadOnly && (
                          <Table.Cell className="action-cell border-border-1 sticky right-0 z-[1] w-[60px] bg-inherit px-2 py-4 text-center align-middle shadow-[-1px_0_0_#e5e7eb]">
                            <TooltipProvider delayDuration={200}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="text"
                                    iconOnly
                                    className="action-btn text-content-dark-1 hover:bg-background-3 h-8 w-8 px-0"
                                  >
                                    <MoreVertical className="h-5 w-5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContentPrimitive
                                  align="end"
                                  sideOffset={4}
                                  className="border-border-1 z-50 w-[160px] rounded-md border bg-white p-1 shadow-md"
                                >
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      type="button"
                                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                      onClick={() => handleRowActionClick(entry, 'detail')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <Eye size={16} />
                                      </span>
                                      <span className="w-fit">Chi tiết</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="text-content-dark-1 hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                      onClick={() => handleRowActionClick(entry, 'edit')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <IconPencil size={16} />
                                      </span>
                                      <span className="w-fit">Chỉnh sửa</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="text-data-red-default hover:bg-data-red-disabled hover:text-data-red-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer"
                                      onClick={() => handleRowActionClick(entry, 'delete')}
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center">
                                        <IconTrash size={16} />
                                      </span>
                                      <span className="w-fit">Xóa</span>
                                    </button>
                                  </div>
                                </PopoverContentPrimitive>
                              </Popover>
                            </TooltipProvider>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      </div>
    </div>
  )
}
