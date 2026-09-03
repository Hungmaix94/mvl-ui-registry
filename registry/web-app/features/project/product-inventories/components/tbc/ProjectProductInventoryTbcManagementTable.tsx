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
  useCommissionWorkspacePIManagement,
  CommissionPeriodEntry,
  parseCommissionLockError,
} from '@/services/realestate-service'
import { useDeleteProductInventoryTbc } from '@/features/project/product-inventories/services/product-inventory-tbc-service'

import toastService from '@/services/toast-service'

export type ProjectProductInventoryTbcManagementTableProps = {
  productInventoryId: number
  /** Resolved sale-allocation id — needed to route SA-sourced records to the SA namespace */
  salesAllocationId?: number
  isReadOnly?: boolean
}

import { TBC_STATUS_STYLES } from '@/constants/commission'
import {
  RATE_COLUMNS,
  findRate,
  formatPctAmt,
} from '@/features/project/sale-allocations/components/tbc-management-helpers'
import { MANAGEMENT_ROLES } from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementForm'
import { TBC_SOURCE } from '@/constants/commission'

export default function ProjectProductInventoryTbcManagementTable({
  productInventoryId,
  salesAllocationId,
  isReadOnly = false,
}: ProjectProductInventoryTbcManagementTableProps) {
  const navigate = useNavigate()
  const saId = salesAllocationId != null ? String(salesAllocationId) : ''
  const { displayConfirm, displayClose } = useDialog()
  const {
    data: workspace,
    isLoading,
    refetch,
  } = useCommissionWorkspacePIManagement(productInventoryId)
  const { mutateAsync: deletePeriod } = useDeleteProductInventoryTbc(
    productInventoryId,
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

  const handleEdit = (id: number, source: string) => {
    if (source === TBC_SOURCE.SA) {
      navigate(
        APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT.replace(':saId', saId as string).replace(
          ':id',
          String(id)
        )
      )
    } else {
      navigate(
        APP_PATH.PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_EDIT.replace(':saId', saId as string)
          .replace(':id', String(productInventoryId))
          .replace(':tbcId', String(id))
      )
    }
  }

  const handleCreate = (cloneId?: number, source?: string) => {
    let path = APP_PATH.PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_CREATE.replace(
      ':saId',
      saId as string
    ).replace(':id', String(productInventoryId))
    if (cloneId) {
      path += `?cloneFrom=${cloneId}`
      if (source) {
        path += `&cloneFromType=${source}`
      }
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
                handleCreate(id, workspace?.periods?.[0]?.record?.tbc_source || TBC_SOURCE.SA)
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
    const recordId = entry.record?.id || entry.id
    if (!recordId) return

    const source =
      entry.record?.tbc_source ||
      entry.tbc_source ||
      entry.entry?.tbc_source ||
      workspace?.periods?.[0]?.record?.tbc_source ||
      'sa'

    if (action === 'detail') {
      if (source === TBC_SOURCE.SA) {
        navigate(
          `${APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT.replace(':saId', saId as string).replace(
            ':id',
            String(recordId)
          )}?mode=view`
        )
      } else {
        navigate(
          `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_EDIT.replace(':saId', saId as string)
            .replace(':id', String(productInventoryId))
            .replace(':tbcId', String(recordId))}?mode=view`
        )
      }
      return
    }

    if (action === 'edit' || action === 'delete') {
      const isEdit = action === 'edit'
      const canAction = isEdit ? entry.can_edit : entry.can_delete

      if (!canAction) {
        if (entry.recommended_action === 'clone_new_period') {
          displayConfirm({
            title: 'Cấu hình đang bị khóa',
            description: `${entry.lock_reason}. Bạn có muốn tạo mới cấu hình từ đây không?`,
            confirmText: 'Tạo period mới',
            onConfirm: () => {
              const record = entry.record || entry
              handleCreate(
                recordId,
                record?.tbc_source ||
                  entry.tbc_source ||
                  entry.entry?.tbc_source ||
                  workspace?.periods?.[0]?.record?.tbc_source ||
                  'sa'
              )
              displayClose()
            },
          })
          return
        } else if (entry.recommended_action === 'historical_correction') {
          toastService.warning(
            'Cấu hình đã khóa do đã phát sinh hoa hồng. Vui lòng liên hệ Admin để điều chỉnh!'
          )
          return
        } else {
          toastService.error(entry.lock_reason || 'Không thể thực hiện hành động này!')
          return
        }
      }

      if (isEdit) {
        handleEdit(recordId, source)
      } else {
        handleDelete(recordId)
      }
    } else if (action === 'clone') {
      const record = entry.record || entry
      handleCreate(
        recordId,
        record?.tbc_source ||
          entry.tbc_source ||
          entry.entry?.tbc_source ||
          workspace?.periods?.[0]?.record?.tbc_source ||
          'sa'
      )
    }
  }

  const activeRecord = currentMgmt?.entry?.record

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
      {renderActiveSummary()}
      <Flex justify="between" align="center">
        <h3 className="text-content-dark-1 text-base font-semibold">Lịch sử cấu hình</h3>
        {!isReadOnly && (
          <Button
            type="button"
            onClick={() =>
              handleCreate(
                activeRecord?.id,
                activeRecord?.tbc_source ||
                  workspace?.periods?.[0]?.record?.tbc_source ||
                  TBC_SOURCE.SA
              )
            }
            variant="secondary-border"
          >
            Tạo thiết lập mới
          </Button>
        )}
      </Flex>
      <div className="border-border-1 relative w-full overflow-hidden rounded-none border shadow-sm">
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
                  managementPeriods.map((entry: any, index) => {
                    const statusConfig =
                      TBC_STATUS_STYLES[entry.entry?.period_status || entry.period_status] ||
                      TBC_STATUS_STYLES.fallback
                    const record = entry.record || entry

                    const activeBg =
                      entry.entry?.is_current || entry.is_current ? 'bg-[#CFFFD5]' : 'bg-white'

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
                                    {/* Action Chỉnh sửa */}
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

                                    {/* Action Xóa */}
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
