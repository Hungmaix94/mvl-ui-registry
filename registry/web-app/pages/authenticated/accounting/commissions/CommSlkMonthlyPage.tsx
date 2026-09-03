import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle } from '@/components/ui'
import { FullScreenLoading } from '@/components/Loading'
import TableError from '@/components/ui/table/TableError'
import { TableNoData } from '@/components/ui/table/TableNoData'
import { IconCalculator, IconDownload } from '@/assets/icons'
import { parsePositiveInt } from '@/utils/common'
import {
  useComputeLinkedExchangeMonthlyCommission,
  useLinkedExchangeMonthlyCommission,
  useLinkedExchangeMonthlyCommissions,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { CommSlkMonthlyDetail } from '@/features/accounting/commissions/components/CommSlkMonthlyDetail'
import {
  formatSlkPeriodLabel,
  resolveSlkAddPeriodState,
} from '@/features/accounting/commissions/utils/slk-add-period'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAuth } from '@/store'
import { hasPermission } from '@/utils/auth'

/** Prefix of every SLK-monthly query key (see QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS). */
const SLK_MONTHLY_QUERY_PREFIX = ['accounting', 'linked-exchange-monthly-commissions']

const PAGE_TITLE = 'HH theo tháng — Sàn liên kết'

/** Query params the screen used while it still had a list layer (search box, status
 *  filter, pager). Stripped on load so an old bookmark cannot resurrect dead state. */
const LEGACY_PARAMS = ['page', 'page_size', 'status', 'q'] as const

/**
 * SLK monthly commission — one statement per period.
 *
 * `LinkedExchangeMonthlyCommission` is unique on (year, month), so a list screen here
 * only ever showed a single row. The period selector IS the whole navigation: pick a
 * period, read its statement. The list is resolved to an id and the record is then read
 * through the DETAIL query — the same query every lifecycle mutation (review / post /
 * reopen / set-splits / mark-processed) invalidates, so the figures on screen stay
 * correct after each action instead of serving a stale list cache.
 */
const CommSlkMonthlyPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const {
    data: allPeriods,
    isLoading: isLoadingPeriods,
    error: periodsError,
  } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])
  const hasPeriods = periods.length > 0

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const newParams = new URLSearchParams(searchParams)
    let changed = false

    for (const key of LEGACY_PARAMS) {
      if (newParams.has(key)) {
        newParams.delete(key)
        changed = true
      }
    }

    if (!newParams.has('year') || !newParams.has('month')) {
      const defaultPeriod = currentPeriod ?? periods[0]
      if (defaultPeriod) {
        newParams.set('year', String(defaultPeriod.year))
        newParams.set('month', String(defaultPeriod.month))
        changed = true
      }
    }

    if (changed) setSearchParams(newParams, { replace: true })
    else setIsUrlReady(true)
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
      const period = periods.find((p) => p.id === periodId)
      if (!period) return
      const newParams = new URLSearchParams(searchParams)
      newParams.set('year', String(period.year))
      newParams.set('month', String(period.month))
      setSearchParams(newParams, { replace: true })
    },
    [periods, searchParams, setSearchParams]
  )

  // Resolve the period's statement id. `page_size: 1` because (year, month) is unique —
  // there is never a second row to page to.
  const {
    data: listResponse,
    isLoading: isLoadingList,
    error: listError,
  } = useLinkedExchangeMonthlyCommissions(
    { month: month || 1, year: year || 2000, page: 1, page_size: 1 },
    { enabled: isUrlReady && !!month && !!year }
  )

  const recordId = listResponse?.results?.[0]?.id ?? null

  const {
    data: record,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useLinkedExchangeMonthlyCommission(recordId ?? 0, { enabled: !!recordId })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/linked-exchange-monthly-commissions/export/',
    'hoa-hong-slk-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({ month: month || undefined, year: year || undefined })
  }, [openExportDialog, month, year])

  // `isUrlReady` only ever flips once the period list has arrived, so it must NOT be the
  // sole loading gate: an empty or failed periods query would otherwise spin forever with
  // nothing on screen explaining why.
  const isLoading =
    isLoadingPeriods ||
    isLoadingCurrent ||
    (hasPeriods && !isUrlReady) ||
    isLoadingList ||
    (!!recordId && isLoadingDetail)
  const error = (periodsError ?? listError ?? detailError) as Error | null

  // "Thêm kỳ": a statement row only exists after compute() runs (here, or via the monthly
  // celery job). With no row this screen shows the empty state and the detail — the only
  // other compute button — never renders, so this is the sole way in for a missed period.
  // The list query above IS the existence check: it carries no status filter, so an empty
  // result means the period genuinely has no statement.
  const { user } = useAuth()
  const canCompute =
    !!user?.is_superuser ||
    hasPermission(user?.permissions || [], 'linkedexchangemonthlycommission.compute')
  const computeMutation = useComputeLinkedExchangeMonthlyCommission()
  const { displayConfirm } = useDialog()
  const queryClient = useQueryClient()

  const addPeriodState = resolveSlkAddPeriodState({
    canCompute,
    month,
    year,
    // Not resolved yet — a click now could hit a period that already has a statement,
    // which the BE refuses once it is REVIEWED/POSTED.
    isProbing: !isUrlReady || isLoadingList,
    periodExists: !!recordId,
  })

  const handleAddPeriod = useCallback(() => {
    if (!month || !year) return
    const label = formatSlkPeriodLabel(month, year)
    displayConfirm({
      title: 'Thêm kỳ hoa hồng SLK',
      content: `Thêm bảng kê hoa hồng SLK kỳ ${label}? Hệ thống sẽ tính doanh thu SLK của kỳ và tạo bảng kê ở trạng thái Nháp.`,
      confirmText: 'Thêm kỳ',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          await computeMutation.mutateAsync({ year, month })
          queryClient.invalidateQueries({ queryKey: SLK_MONTHLY_QUERY_PREFIX })
          toastService.success(`Đã thêm bảng kê kỳ ${label}`)
        } catch (err) {
          toastService.error(extractErrorMessage(err))
        }
      },
    })
  }, [computeMutation, displayConfirm, month, queryClient, year])

  const periodSelector = (
    <AccountingPeriodSelect
      periods={periods}
      selectedPeriodId={activePeriodId}
      onSelect={handlePeriodSelect}
    />
  )

  const exportAction = (
    <Button
      size="small"
      variant="secondary"
      leftIcon={<IconDownload size={16} />}
      onClick={handleExport}
      loading={isExporting}
    >
      Xuất Excel
    </Button>
  )

  // The detail owns the page chrome (title, lifecycle actions, PDF export); the period
  // selector and the Excel export are injected so the toolbar stays a single row.
  if (record) {
    return (
      <CommSlkMonthlyDetail
        summary={record}
        title={PAGE_TITLE}
        toolbarLeftContent={periodSelector}
        extraActions={exportAction}
      />
    )
  }

  const periodLabel = month && year ? formatSlkPeriodLabel(month, year) : '—'

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={PAGE_TITLE}
        toolbarLeftContent={periodSelector}
        customActions={
          addPeriodState.visible ? (
            <Button
              size="small"
              variant="secondary-border"
              leftIcon={<IconCalculator className="h-4 w-4" />}
              onClick={handleAddPeriod}
              disabled={addPeriodState.disabled}
              loading={computeMutation.isPending}
            >
              Thêm kỳ
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-grow flex-col overflow-y-auto px-7 pt-4 pb-6">
        {isLoading ? (
          <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
        ) : error ? (
          <TableError />
        ) : hasPeriods ? (
          <TableNoData
            message="Kỳ này chưa có bảng kê hoa hồng"
            description={
              addPeriodState.visible
                ? `Chưa có dữ liệu hoa hồng SLK cho kỳ ${periodLabel}. Bấm "Thêm kỳ" ở thanh công cụ để tính doanh thu và tạo bảng kê, hoặc chọn kỳ khác.`
                : `Chưa có dữ liệu hoa hồng SLK cho kỳ ${periodLabel}. Chọn kỳ khác ở thanh công cụ để xem bảng kê.`
            }
          />
        ) : (
          <TableNoData
            message="Chưa có kỳ kế toán nào"
            description="Cần khai báo kỳ kế toán trước khi xem hoa hồng SLK theo tháng."
          />
        )}
      </div>
    </div>
  )
}

export default CommSlkMonthlyPage
