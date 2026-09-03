import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown } from 'lucide-react'
import { IconPencil, IconTrash } from '@/assets/icons'
import { Button, Text, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { useDialog } from '@/hooks/useDialog'
import { TBC_SOURCE } from '@/constants/commission'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useCommissionWorkspacePIF2, useCreateExchange } from '@/services/realestate-service'
import { useDeleteProductInventoryTbc } from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import toastService from '@/services/toast-service'
import { ExchangeForm } from '@/features/exchange/_shares/components/ExchangeForm'
import { F2CategoryMetricsGrid } from '@/features/project/_shares/components/f2/F2CategoryMetricsGrid'
import { F2PeriodHistoryList } from '@/features/project/_shares/components/f2/F2PeriodHistoryList'
import {
  type F2CreateParams,
  resolveF2ExchangeId,
} from '@/features/project/_shares/components/f2/f2-constants'
import { cn } from '@/utils'

export type PiF2TableProps = {
  productInventoryId: number
  /** Resolved sale-allocation id — needed to route SA-sourced records to the SA namespace */
  salesAllocationId?: number
  tbcSource?: 'sa' | 'pi'
  isReadOnly?: boolean
}

export const PiF2Table = ({
  productInventoryId,
  salesAllocationId,
  isReadOnly = false,
}: PiF2TableProps) => {
  const navigate = useNavigate()
  const saId = salesAllocationId != null ? String(salesAllocationId) : ''
  const { displayConfirm, displayClose, displayFormContent } = useDialog()
  const { data: workspace, isLoading, refetch } = useCommissionWorkspacePIF2(productInventoryId)
  const { mutateAsync: deletePeriod } = useDeleteProductInventoryTbc(productInventoryId, 'tbc-f2s')
  const createExchangeMutation = useCreateExchange()
  const [openHistory, setOpenHistory] = useState<Record<number, boolean>>({})

  const handleCreateExchange = () => {
    displayFormContent({
      title: 'Tạo mới SLK',
      content: (
        <ExchangeForm
          onSubmit={async (values) => {
            const { attachment_tokens, ...rest } = values
            const payload = {
              ...rest,
              ...(attachment_tokens &&
                attachment_tokens.length > 0 && {
                  files: {
                    attachments: attachment_tokens,
                  },
                }),
            }
            await createExchangeMutation.mutateAsync(payload as any)
            toastService.success('Tạo sàn liên kết thành công')
            refetch()
            displayClose()
          }}
          onCancel={displayClose}
          isSubmitting={createExchangeMutation.isPending}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Text className="text-content-dark-3">Đang tải...</Text>
      </div>
    )
  }

  const f2Periods = workspace?.periods || []

  const groupPeriodsByExchange = (periods: any[]) => {
    const grouped: Record<number, { exchangeName: string; entries: any[] }> = {}
    periods.forEach((entry: any) => {
      const record = entry.record || entry
      const exchangeId = record?.exchange
      if (!exchangeId) return
      if (!grouped[exchangeId]) {
        grouped[exchangeId] = {
          exchangeName:
            record?.exchange_detail?.name || record?.exchange_name || `Sàn #${exchangeId}`,
          entries: [],
        }
      }
      grouped[exchangeId].entries.push(entry)
    })
    return grouped
  }

  const groupedPeriods = groupPeriodsByExchange(f2Periods)

  const deriveCurrentByExchange = () => {
    const grouped: Record<number, { exchangeName: string; record: any }> = {}
    f2Periods.forEach((entry: any) => {
      const isCurrent = entry.is_current || entry.entry?.is_current
      if (!isCurrent) return
      const record = entry.record || entry
      const exchangeId = record?.exchange
      if (!exchangeId) return
      grouped[exchangeId] = {
        exchangeName:
          record?.exchange_detail?.name || record?.exchange_name || `Sàn #${exchangeId}`,
        record,
      }
    })
    return grouped
  }

  const currentGrouped = deriveCurrentByExchange()

  const handleCreate = ({ cloneId, source, exchangeId, exchangeName }: F2CreateParams = {}) => {
    let path = APP_PATH.PROJECT_PRODUCT_INVENTORIES_F2_CREATE.replace(
      ':saId',
      saId as string
    ).replace(':id', String(productInventoryId))

    const params = new URLSearchParams()
    if (exchangeId != null) params.set('exchangeId', String(exchangeId))
    if (exchangeName) params.set('exchangeName', exchangeName)
    if (cloneId != null) params.set('cloneId', String(cloneId))
    if (source) params.set('source', source)
    const qs = params.toString()
    if (qs) path += `?${qs}`

    navigate(path)
  }

  // Toolbar tạo mới (Tạo mới SLK / Thêm cấu hình mới) — góc phải trên, dùng chung cho cả trạng thái
  // rỗng và có dữ liệu để đồng nhất với màn chi tiết SA (nút luôn ở phía trên bên phải).
  const createToolbar = isReadOnly ? null : (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        onClick={handleCreateExchange}
        variant="secondary-border"
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Tạo mới SLK
      </Button>
      <Button
        type="button"
        onClick={() => handleCreate()}
        variant="primary"
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Thêm cấu hình mới
      </Button>
    </div>
  )

  const handleEdit = (tbcId: number, exchangeName: string, source: string) => {
    if (source === TBC_SOURCE.SA) {
      navigate(
        APP_PATH.PROJECT_SA_TBC_F2_EDIT.replace(':saId', saId as string).replace(
          ':id',
          String(tbcId)
        ) + `?exchangeName=${encodeURIComponent(exchangeName)}`
      )
    } else {
      navigate(
        APP_PATH.PROJECT_PRODUCT_INVENTORIES_F2_EDIT.replace(':saId', saId as string)
          .replace(':id', String(productInventoryId))
          .replace(':tbcId', String(tbcId)) + `?exchangeName=${encodeURIComponent(exchangeName)}`
      )
    }
  }

  const handleDelete = (tbcId: number) => {
    displayConfirm({
      title: 'Xóa cấu hình',
      description: 'Bạn có chắc chắn muốn xóa cấu hình này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deletePeriod(String(tbcId))
          toastService.success('Xóa cấu hình thành công')
          refetch()
          displayClose()
        } catch (error) {
          console.error('Delete failed:', error)
          displayClose()
        }
      },
      onCancel: () => displayClose(),
    })
  }

  const handleRowActionClick = (
    entry: any,
    action: 'edit' | 'delete' | 'clone' | 'detail',
    exchangeName: string
  ) => {
    const recordId = entry.record?.id || entry.id
    if (!recordId) return

    const source =
      entry.record?.tbc_source ||
      entry.tbc_source ||
      entry.entry?.tbc_source ||
      workspace?.periods?.[0]?.record?.tbc_source ||
      TBC_SOURCE.SA

    if (action === 'detail') {
      if (source === TBC_SOURCE.SA) {
        navigate(
          `${APP_PATH.PROJECT_SA_TBC_F2_EDIT.replace(':saId', saId as string).replace(
            ':id',
            String(recordId)
          )}?mode=view&exchangeName=${encodeURIComponent(exchangeName)}`
        )
      } else {
        navigate(
          `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_F2_EDIT.replace(':saId', saId as string)
            .replace(':id', String(productInventoryId))
            .replace(
              ':tbcId',
              String(recordId)
            )}?mode=view&exchangeName=${encodeURIComponent(exchangeName)}`
        )
      }
      return
    }

    if (action === 'edit' || action === 'delete') {
      const canAction = action === 'edit' ? entry.can_edit : entry.can_delete
      if (!canAction) {
        if (!entry.lock_reason) {
          toastService.error('Không thể thực hiện hành động này do đã có giao dịch phát sinh!')
          return
        }
        toastService.error(entry.lock_reason || 'Không thể thực hiện hành động này!')
        return
      }

      if (action === 'edit') {
        handleEdit(recordId, exchangeName, source)
      } else {
        handleDelete(recordId)
      }
    } else if (action === 'clone') {
      const record = entry.record || entry
      handleCreate({
        cloneId: recordId,
        source: record?.tbc_source || entry.tbc_source || TBC_SOURCE.SA,
        exchangeId: resolveF2ExchangeId(record?.exchange),
        exchangeName,
      })
    }
  }

  const allExchanges: Record<number, string> = {}
  Object.entries(groupedPeriods).forEach(([exId, { exchangeName }]) => {
    allExchanges[Number(exId)] = exchangeName
  })
  Object.entries(currentGrouped).forEach(([exId, { exchangeName }]) => {
    allExchanges[Number(exId)] = exchangeName
  })

  const hasData = Object.keys(allExchanges).length > 0

  if (!hasData) {
    return (
      <div className="flex w-full flex-col gap-6">
        {createToolbar}
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center border border-dashed p-10">
          <Text className="text-content-dark-3 typo-body-base-regular">
            Chưa có sàn liên kết nào được cấu hình
          </Text>
          {!isReadOnly && (
            <Text className="text-content-dark-3 typo-body-sm-regular mt-1">
              Dùng nút “Tạo mới SLK” / “Thêm cấu hình mới” ở thanh công cụ phía trên để bắt đầu.
            </Text>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {createToolbar}

      {Object.entries(allExchanges).map(([exchangeIdStr, exchangeName]) => {
        const exchangeId = Number(exchangeIdStr)
        const activeRecord = currentGrouped[exchangeId]?.record || null
        const entries = groupedPeriods[exchangeId]?.entries || []
        const isHistoryOpen = !!openHistory[exchangeId]
        const hasActive = !!activeRecord
        const activeEntry = entries.find((e: any) => e.is_current || e.entry?.is_current) || null

        return (
          <div
            key={exchangeId}
            className={cn(
              'border-border-1 bg-surface-primary-default overflow-hidden rounded-xl border border-l-4',
              hasActive ? 'border-l-data-green-default' : 'border-l-border-2'
            )}
          >
            <div className="border-border-1 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-content-dark-1 m-0 text-lg font-semibold" title={exchangeName}>
                  {exchangeName}
                </h2>
                <Chip
                  variant={hasActive ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
                  size="small"
                  showDot
                  label={hasActive ? 'Đang áp dụng' : 'Chưa cấu hình'}
                />
                <span className="text-content-dark-3 text-xs">{entries.length} kỳ cấu hình</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-content-dark-3 text-xs font-semibold tracking-wide uppercase">
                  Cấu hình đang áp dụng
                  {activeRecord?.tbc_source === 'sa' && (
                    <span className="font-semibold text-[#3E63DD] lowercase">
                      {' '}
                      (Kế thừa từ thông tin bán hàng)
                    </span>
                  )}
                </span>
                {!isReadOnly && hasActive && activeEntry && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={
                        !activeEntry.can_edit && activeEntry.lock_reason
                          ? activeEntry.lock_reason
                          : 'Chỉnh sửa'
                      }
                      aria-label="Chỉnh sửa"
                      aria-disabled={!activeEntry.can_edit}
                      onClick={() => handleRowActionClick(activeEntry, 'edit', exchangeName)}
                      className={cn(
                        'hover:bg-background-3 hover:text-content-dark-1 flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                        !activeEntry.can_edit
                          ? 'text-content-dark-3 pointer-events-none opacity-50'
                          : 'text-content-dark-2'
                      )}
                    >
                      <IconPencil size={16} />
                    </button>
                    <button
                      type="button"
                      title={
                        !activeEntry.can_delete && activeEntry.lock_reason
                          ? activeEntry.lock_reason
                          : 'Xóa'
                      }
                      aria-label="Xóa"
                      aria-disabled={!activeEntry.can_delete}
                      onClick={() => handleRowActionClick(activeEntry, 'delete', exchangeName)}
                      className={cn(
                        'hover:bg-data-red-disabled flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                        !activeEntry.can_delete
                          ? 'text-content-dark-3 pointer-events-none opacity-50'
                          : 'text-data-red-default hover:text-data-red-hover'
                      )}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                )}
              </div>
              {hasActive ? (
                <F2CategoryMetricsGrid record={activeRecord} />
              ) : (
                <div className="border-border-1 bg-background-1 text-content-dark-3 rounded-lg border border-dashed p-6 text-center text-sm">
                  Chưa có cấu hình đang áp dụng cho sàn này
                </div>
              )}
            </div>

            <div className="border-border-1 border-t">
              <button
                type="button"
                onClick={() => setOpenHistory((s) => ({ ...s, [exchangeId]: !s[exchangeId] }))}
                aria-expanded={isHistoryOpen}
                className="hover:bg-background-2 flex w-full items-center gap-2 px-5 py-3 text-left transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'text-content-dark-3 h-4 w-4 shrink-0 transition-transform duration-300',
                    isHistoryOpen && 'rotate-180'
                  )}
                />
                <span className="text-content-dark-1 text-sm font-semibold">Lịch sử cấu hình</span>
                <span className="text-content-dark-3 text-xs">({entries.length})</span>
              </button>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  isHistoryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div
                  className={cn(
                    'overflow-hidden transition-opacity duration-300',
                    isHistoryOpen ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div className="px-5 pb-5">
                    <F2PeriodHistoryList
                      entries={entries}
                      isReadOnly={isReadOnly}
                      onRowAction={(entry, action) =>
                        handleRowActionClick(entry, action, exchangeName)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PiF2Table
