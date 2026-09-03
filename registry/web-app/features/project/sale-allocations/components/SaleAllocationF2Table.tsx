import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown } from 'lucide-react'
import { IconPencil, IconTrash } from '@/assets/icons'
import { Button, Text, Chip } from '@/components/ui'
import { type PageTitleToolbarProps } from '@/components/ui/page-title/PageTitleToolbar'
import { useDialog } from '@/hooks/useDialog'
import { cn } from '@/utils'
import { ColoredValueVariant } from '@/api/schema'
import { TBC_SOURCE } from '@/constants/commission'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useCommissionWorkspaceSAF2, useCreateExchange } from '@/services/realestate-service'
import { useDeleteSalesAllocationTbc } from '@/features/project/sale-allocations/services/sales-allocation-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { ExchangeForm } from '@/features/exchange/_shares/components/ExchangeForm'
import { F2CategoryMetricsGrid } from '@/features/project/_shares/components/f2/F2CategoryMetricsGrid'
import { F2PeriodHistoryList } from '@/features/project/_shares/components/f2/F2PeriodHistoryList'
import {
  type F2CreateParams,
  resolveF2ExchangeId,
} from '@/features/project/_shares/components/f2/f2-constants'

/** Toolbar slots the F2 tab lifts up to the host PageTitle (project tabs pattern, như LAD). */
export type F2TabSlots = { toolbarProps?: PageTitleToolbarProps }

export type SaleAllocationF2TableProps = {
  saleAllocationId: number
  tbcSource?: 'sa' | 'pi'
  isReadOnly?: boolean
  /** Lift the create toolbar (Thêm sàn / Thêm cấu hình) into the host PageTitle tab toolbar. */
  setTabSlots?: (slots: F2TabSlots | null) => void
}

export const SaleAllocationF2Table = ({
  saleAllocationId,
  isReadOnly = false,
  setTabSlots,
}: SaleAllocationF2TableProps) => {
  const navigate = useNavigate()
  const { displayConfirm, displayClose, displayFormContent } = useDialog()
  const { data: workspace, isLoading, refetch } = useCommissionWorkspaceSAF2(saleAllocationId)
  const { mutateAsync: deletePeriod } = useDeleteSalesAllocationTbc(saleAllocationId, 'tbc-f2s')
  const createExchangeMutation = useCreateExchange()
  // Trạng thái mở/thu "Lịch sử cấu hình" theo từng sàn (id → boolean).
  const [openHistory, setOpenHistory] = useState<Record<number, boolean>>({})

  // Lift the create toolbar into the host PageTitle (project tabs pattern, như LadBatchListView).
  // Dùng ref để onClick luôn gọi handler mới nhất → effect chỉ phụ thuộc [setTabSlots, isReadOnly]
  // (giá trị ổn định) nên chạy 1 lần, tránh loop khi setTabSlots cập nhật state ở host.
  const createConfigRef = useRef<() => void>(() => {})
  const createExchangeRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!setTabSlots) return
    if (isReadOnly) {
      setTabSlots(null)
      return
    }
    setTabSlots({
      toolbarProps: {
        rightContent: (
          <>
            <Button
              type="button"
              variant="secondary-border"
              size="small"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => createExchangeRef.current()}
            >
              Tạo mới SLK
            </Button>
            <Button
              type="button"
              variant="primary"
              size="small"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => createConfigRef.current()}
            >
              Thêm cấu hình mới
            </Button>
          </>
        ),
      },
    })
    return () => setTabSlots(null)
  }, [setTabSlots, isReadOnly])

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

  // Định nghĩa handleCreate TRƯỚC mọi early-return để ref toolbar (gán ngay bên dưới) luôn trỏ tới
  // handler mới nhất kể cả lúc đang loading.
  const handleCreate = ({ cloneId, source, exchangeId, exchangeName }: F2CreateParams = {}) => {
    let path = APP_PATH.PROJECT_SA_TBC_F2_CREATE.replace(':saId', String(saleAllocationId))

    const params = new URLSearchParams()
    if (exchangeId != null) params.set('exchangeId', String(exchangeId))
    if (exchangeName) params.set('exchangeName', exchangeName)
    if (cloneId != null) params.set('cloneId', String(cloneId))
    if (source) params.set('source', source)
    const qs = params.toString()
    if (qs) path += `?${qs}`

    navigate(path)
  }

  // Gán ref toolbar UNCONDITIONALLY mỗi render (trước early-return) → click toolbar hoạt động kể cả
  // khi đang loading.
  createConfigRef.current = () => handleCreate()
  createExchangeRef.current = handleCreateExchange

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Text className="text-content-dark-3">Đang tải...</Text>
      </div>
    )
  }

  const f2Periods = workspace?.periods || []

  // ─── Group F2 periods by exchange ────────────────────────────────────────────
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

  // ─── Derive current/active F2 records from periods (is_current flag) ─────────
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

  // ─── Navigation handlers ─────────────────────────────────────────────────────
  const handleEdit = (tbcId: number, exchangeName: string) => {
    navigate(
      APP_PATH.PROJECT_SA_TBC_F2_EDIT.replace(':saId', String(saleAllocationId)).replace(
        ':id',
        String(tbcId)
      ) + `?exchangeName=${encodeURIComponent(exchangeName)}`
    )
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
          toastService.error(extractErrorMessage(error))
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

    if (action === 'detail') {
      navigate(
        `${APP_PATH.PROJECT_SA_TBC_F2_EDIT.replace(':saId', String(saleAllocationId)).replace(
          ':id',
          String(recordId)
        )}?mode=view&exchangeName=${encodeURIComponent(exchangeName)}`
      )
      return
    }

    if (action === 'edit' || action === 'delete') {
      const canAction = action === 'edit' ? entry.can_edit : entry.can_delete
      if (!canAction) {
        if (!entry.lock_reason) {
          toastService.error('Không thể thực hiện hành động này do đã có giao dịch phát sinh!')
          return
        } else {
          toastService.error(entry.lock_reason || 'Không thể thực hiện hành động này!')
          return
        }
      }

      if (action === 'edit') {
        handleEdit(recordId, exchangeName)
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

  // ─── Main Layout: Grouped by Exchange ─────────────────────────────────────────
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
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center border border-dashed p-10">
          <Text className="text-content-dark-3 typo-body-base-regular">
            Chưa có sàn liên kết nào được cấu hình
          </Text>
          {!isReadOnly && (
            <Text className="text-content-dark-3 typo-body-sm-regular mt-1">
              Dùng nút “Thêm sàn” / “Thêm cấu hình” ở thanh công cụ phía trên để bắt đầu.
            </Text>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {Object.entries(allExchanges).map(([exchangeIdStr, exchangeName]) => {
        const exchangeId = Number(exchangeIdStr)
        const activeRecord = currentGrouped[exchangeId]?.record || null
        const entries = groupedPeriods[exchangeId]?.entries || []
        const isHistoryOpen = !!openHistory[exchangeId]
        const hasActive = !!activeRecord
        // Entry đầy đủ (kèm can_edit/can_delete/lock_reason) của bản ghi đang áp dụng — cho quick actions.
        const activeEntry = entries.find((e: any) => e.is_current || e.entry?.is_current) || null

        const isF1 = !!(
          (activeRecord?.pct_f2_inventory_hold && Number(activeRecord.pct_f2_inventory_hold) > 0) ||
          (entries[0]?.record?.pct_f2_inventory_hold &&
            Number(entries[0].record.pct_f2_inventory_hold) > 0)
        )

        return (
          <div
            key={exchangeId}
            className={cn(
              'border-border-1 bg-surface-primary-default overflow-hidden rounded-xl border border-l-4',
              hasActive ? 'border-l-data-green-default' : 'border-l-border-2'
            )}
          >
            {/* Header: tên sàn · trạng thái · hành động */}
            <div className="border-border-1 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-content-dark-1 m-0 text-lg font-semibold" title={exchangeName}>
                  {exchangeName}
                </h2>
                <Chip
                  variant={isF1 ? ColoredValueVariant.BLUE : ColoredValueVariant.PURPLE}
                  size="small"
                  label={isF1 ? 'Sàn F1' : 'Sàn F2'}
                />
                <Chip
                  variant={hasActive ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
                  size="small"
                  showDot
                  label={hasActive ? 'Đang áp dụng' : 'Chưa cấu hình'}
                />
                <span className="text-content-dark-3 text-xs">{entries.length} kỳ cấu hình</span>
              </div>
            </div>

            {/* Active Summary */}
            {/* Cấu hình đang áp dụng — dải metric tile (thay cho bảng 1 dòng) */}
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-content-dark-3 text-xs font-semibold tracking-wide uppercase">
                  Cấu hình đang áp dụng
                </span>
                {/* Quick actions trên bản ghi đang áp dụng — thao tác ngay, không cần mở Lịch sử.
                    Tái dùng handleRowActionClick (đã xử lý quyền + lock + toast). */}
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

export default SaleAllocationF2Table
