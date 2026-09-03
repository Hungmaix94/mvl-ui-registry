import { useCallback, useEffect, useMemo, useState } from 'react'
import { type DateRange } from 'react-day-picker'
import { Flex, Text } from '@radix-ui/themes'
import type { ColumnDef } from '@tanstack/react-table'
import { ColoredValueVariant, LadLineCreateRequestRequestLine_status } from '@/api/schema'
import { DealStatus } from '@/constants/api-schema-aliases'
import { IconMagnifyingglass } from '@/assets/icons'
import { Button, Chip, Table, TextField } from '@/components/ui'
import { DateRangePicker } from '@/components/ui/date-range-picker/DateRangePicker'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { PAGE_SIZE } from '@/constants/table'
import { Deal, useDeals } from '@/features/sales/deals/services/deal-service'
import useAppConstant from '@/hooks/useAppConstant'
import toastService from '@/services/toast-service'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { extractErrorMessage } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { useQueryClient } from '@tanstack/react-query'

import { getLadService } from '../../services/commission-adjustment-batch-service'
import { ladScopeChangeQueryKeys } from '../../utils/lad-cache-invalidation'

export type LadAddDealFilterMode = 'scope' | 'manual'

interface LadAddDealDialogProps {
  batchId: number
  saleAllocationId: number
  /** `scope` — dùng khoảng ngày ký từ Bộ lọc phạm vi; `manual` — user chọn + bấm Tìm kiếm trong dialog. */
  filterMode: LadAddDealFilterMode
  dateFrom?: string | null
  dateTo?: string | null
  excludedDealIds: number[]
  onClose: () => void
}

const getStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case 'open':
    case 'active':
      return ColoredValueVariant.BLUE
    case 'completed':
      return ColoredValueVariant.GREEN
    case 'cancelled':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

/**
 * Dialog chọn GD từ danh sách có phân trang. Lọc theo khoảng ngày ký (rate_determination_date).
 * Giữ lựa chọn xuyên suốt các trang; GD đã có trong lô bị disable.
 */
export function LadAddDealDialog({
  batchId,
  saleAllocationId,
  filterMode,
  dateFrom,
  dateTo,
  excludedDealIds,
  onClose,
}: LadAddDealDialogProps) {
  const queryClient = useQueryClient()
  const excludedSet = useMemo(() => new Set(excludedDealIds), [excludedDealIds])
  const isManualFilter = filterMode === 'manual'

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [selectedMap, setSelectedMap] = useState<Map<number, Deal>>(() => new Map())

  const [pendingRange, setPendingRange] = useState<DateRange | undefined>()
  const [pendingUnitNumber, setPendingUnitNumber] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | null>(null)
  const [appliedDateTo, setAppliedDateTo] = useState<string | null>(null)
  const [appliedUnitNumber, setAppliedUnitNumber] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const activeDateFrom = isManualFilter ? appliedDateFrom : dateFrom
  const activeDateTo = isManualFilter ? appliedDateTo : dateTo
  const activeUnitNumber = isManualFilter ? appliedUnitNumber : null

  useEffect(() => {
    setPageIndex(0)
  }, [activeDateFrom, activeDateTo, activeUnitNumber, saleAllocationId])

  const queryParams = useMemo(
    () => ({
      page: pageIndex + 1,
      page_size: pageSize,
      sales_allocation: saleAllocationId,
      rate_determination_date_from: activeDateFrom || undefined,
      rate_determination_date_to: activeDateTo || undefined,
      unit_number: activeUnitNumber || undefined,
      status: DealStatus.active,
    }),
    [pageIndex, pageSize, saleAllocationId, activeDateFrom, activeDateTo, activeUnitNumber]
  )

  const queryEnabled = saleAllocationId > 0 && (isManualFilter ? hasSearched : true)

  const { data, isLoading } = useDeals(queryParams, { enabled: queryEnabled })
  const deals = data?.results ?? []
  const totalRecords = data?.count ?? 0
  const pageCount = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES],
  })
  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const handleSelectionChange = useCallback(
    (selectedOnPage: Deal[]) => {
      setSelectedMap((prev) => {
        const next = new Map(prev)
        const selectedIds = new Set(selectedOnPage.map((d) => d.id))
        for (const deal of deals) {
          if (excludedSet.has(deal.id)) continue
          if (selectedIds.has(deal.id)) {
            next.set(deal.id, deal)
          } else {
            next.delete(deal.id)
          }
        }
        return next
      })
    },
    [deals, excludedSet]
  )

  const handlePaginationChange = useCallback((nextPageIndex: number, nextPageSize: number) => {
    setPageIndex(nextPageIndex)
    setPageSize(nextPageSize)
  }, [])

  const handleSearch = () => {
    setAppliedDateFrom(pendingRange?.from ? formatDateToApi(pendingRange.from) : null)
    setAppliedDateTo(pendingRange?.to ? formatDateToApi(pendingRange.to) : null)
    setAppliedUnitNumber(pendingUnitNumber.trim() || null)
    setHasSearched(true)
    setPageIndex(0)
  }

  const columns: ColumnDef<Deal>[] = useMemo(
    () => [
      {
        header: 'Mã GD',
        accessorKey: 'code',
        meta: { width: 'w-[140px]' },
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium" title={row.original.code ?? ''}>
            {row.original.code || '-'}
          </span>
        ),
      },
      {
        header: 'Căn',
        id: 'unit',
        meta: { width: 'w-[100px]' },
        cell: ({ row }) => {
          const unit =
            row.original.product_inventory?.unit_number ||
            row.original.product_inventory?.code ||
            '-'
          return (
            <span className="truncate" title={unit}>
              {unit}
            </span>
          )
        },
      },
      {
        header: 'Khách',
        id: 'customer',
        meta: { width: 'w-[160px]' },
        cell: () => <span className="text-content-dark-3">—</span>,
      },
      {
        header: 'Ngày ký',
        id: 'signed_date',
        meta: { width: 'w-[110px]' },
        cell: ({ row }) => {
          const date = row.original.rate_determination_date
          return date ? formatDate(date) : '-'
        },
      },
      {
        header: 'Giá HĐ',
        id: 'listed_price',
        meta: { align: 'right', width: 'w-[140px]' },
        cell: ({ row }) => {
          const val = row.original.listed_price
          return val != null ? (
            <span className="whitespace-nowrap">{formatCurrencyVND(Number(val))}</span>
          ) : (
            '-'
          )
        },
      },
      {
        header: 'Trạng thái',
        accessorKey: 'status',
        meta: { width: 'w-[130px]' },
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          const label = String(
            statusOptions.find((o) => o.value === status)?.label || status || 'Không xác định'
          )
          return <Chip label={label} variant={getStatusVariant(status)} size="small" />
        },
      },
    ],
    [statusOptions]
  )

  const addDeals = async () => {
    const dealIds = Array.from(selectedMap.keys())
    if (!dealIds.length) return

    try {
      const results = await Promise.allSettled(
        dealIds.map((dealId) =>
          getLadService().createLine(batchId, {
            deal_id: dealId,
            line_status: LadLineCreateRequestRequestLine_status.draft,
          })
        )
      )

      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const failCount = results.length - successCount

      // Đổi phạm vi GD ⇒ làm mới CẢ LINES (Bước 1) LẪN F2S (Bước 2, danh sách sàn liên kết suy từ
      // các GD trong lô). Bỏ sót F2S khiến Bước 2 phục vụ cache rỗng cũ khi remount (global
      // staleTime 5') ⇒ thêm GD xong quay lại Bước 2 không thấy F2 nào. Nguồn key gom ở helper.
      await Promise.all(
        ladScopeChangeQueryKeys(batchId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      )

      if (successCount > 0 && failCount === 0) {
        toastService.success(`Đã thêm ${successCount} giao dịch vào lô.`)
        onClose()
      } else if (successCount > 0) {
        toastService.warning(
          `Đã thêm ${successCount} giao dịch. ${failCount} giao dịch không thêm được.`
        )
        onClose()
      } else {
        const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
        toastService.error(extractErrorMessage(firstError?.reason))
      }
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  // Chặn double-submit ở mức đồng bộ — xem docs/ai/conventions.md § Chống double-submit.
  // Trước đây không có guard nào, chỉ có `disabled` phụ thuộc render. Ở đây hậu quả nhân
  // theo số dòng: mỗi lần bấm bắn N request `createLine` song song, nên bấm hai lần là
  // nhân đôi TOÀN BỘ giao dịch được thêm vào lô.
  const { submit: handleAdd, isSubmitting } = useSubmitOnce(addDeals)

  const selectedCount = selectedMap.size

  const emptyMessage = isManualFilter
    ? hasSearched
      ? 'Không có giao dịch phù hợp với bộ lọc đã chọn.'
      : 'Chọn khoảng ngày ký hoặc nhập mã căn rồi bấm "Tìm kiếm" để xem danh sách giao dịch.'
    : 'Không có giao dịch phù hợp trong khoảng ngày ký đã chọn.'

  return (
    <div className="flex flex-col gap-4">
      {isManualFilter ? (
        <Flex align="end" wrap="wrap" gap="3">
          <div className="min-w-[280px] flex-1">
            <DateRangePicker
              label="Khoảng ngày ký"
              subtitle="Lọc theo ngày ký giao dịch — để trống nếu không giới hạn."
              value={pendingRange}
              onChange={(range) => setPendingRange(range ?? undefined)}
              showQuickSelect
            />
          </div>
          <div className="min-w-[200px]">
            <TextField
              label="Mã căn"
              subtitle="Lọc theo mã căn — để trống nếu không giới hạn."
              placeholder="Nhập mã căn..."
              value={pendingUnitNumber}
              onChange={setPendingUnitNumber}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <Button variant="primary" leftIcon={<IconMagnifyingglass />} onClick={handleSearch}>
            Tìm kiếm
          </Button>
        </Flex>
      ) : (
        <Text className="text-content-dark-3 typo-body-sm-regular">
          Lọc theo khoảng ngày ký đã chọn ở bước Phạm vi. Tích chọn giao dịch — lựa chọn được giữ
          khi chuyển trang.
        </Text>
      )}

      {isManualFilter && hasSearched && (
        <Text className="text-content-dark-3 typo-body-sm-regular">
          Tích chọn giao dịch — lựa chọn được giữ khi chuyển trang.
        </Text>
      )}

      <Table<Deal>
        data={deals}
        columns={columns}
        isLoading={isLoading && queryEnabled}
        showSTT={false}
        enableRowSelection={(row) => !excludedSet.has(row.original.id)}
        onSelectionChange={handleSelectionChange}
        getRowId={(row) => String(row.id)}
        manualPagination
        enablePagination
        pageCount={pageCount}
        pageSize={pageSize}
        currentPageIndex={pageIndex}
        totalRecords={totalRecords}
        onPaginationChange={handlePaginationChange}
        paginationPosition="inline"
        className="px-0 pb-0"
        disableInnerOverflow
        emptyMessage={emptyMessage}
      />

      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Text className="text-content-dark-2 typo-body-sm-regular">
          Đã chọn: <span className="font-semibold">{selectedCount}</span>
        </Text>
        <Flex gap="3">
          <Button variant="secondary-border" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={selectedCount === 0 || isSubmitting}
            loading={isSubmitting}
          >
            Thêm
          </Button>
        </Flex>
      </Flex>
    </div>
  )
}

export default LadAddDealDialog
