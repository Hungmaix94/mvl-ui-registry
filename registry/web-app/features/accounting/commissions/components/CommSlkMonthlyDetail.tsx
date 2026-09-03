import { useMemo, useRef, useCallback, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, PageTitle, Chip, Table } from '@/components/ui'
import type { TableAction } from '@/types/table'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import {
  IconReceipt,
  IconCheck,
  IconCalendar,
  IconEye,
  IconPencilsimple,
  IconCalculator,
  IconArrowcounterclockwise,
} from '@/assets/icons'
import { cn, formatCurrencyVND } from '@/utils'
import { exportElementToPdf } from '@/utils/exportChart'
import {
  useReviewLinkedExchangeMonthlyCommission,
  usePostLinkedExchangeMonthlyCommission,
  useReopenLinkedExchangeMonthlyCommission,
  useComputeLinkedExchangeMonthlyCommission,
  useLinkedExchangeRevenueLines,
  type LinkedExchangeMonthlyCommission,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { LinkedExchangeDeptCommissionStatus as StatusType, ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { QUERY_KEYS } from '@/constants'
import { APP_PATH } from '@/routes/AppRoute.constant'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAuth } from '@/store'
import { hasPermission } from '@/utils/auth'
import {
  buildSlkPoolRows,
  pendingDirectorPools,
  pendingF2Deals,
  normalizeSlkStatus,
  type SlkPoolRow,
} from '../utils/slk-pool-utils'
import { EmployeeOrgHint } from './EmployeeOrgHint'
import { SlkPendingF2Notice } from './SlkPendingF2Notice'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

type Props = {
  summary: LinkedExchangeMonthlyCommission
  /** Omit to hide the back button — the embedded (period-driven) screen has nowhere to go back to. */
  onBack?: () => void
  /** Overrides the header title; the embedded screen IS the SLK monthly screen, not a sub-page of it. */
  title?: string
  /** Left of the toolbar — the period selector when this detail is the period-driven main screen. */
  toolbarLeftContent?: ReactNode
  /** Appended after the lifecycle buttons (e.g. the period's Excel export). */
  extraActions?: ReactNode
}

/** Short label for a payout row's role — internal UI discriminator, not a server enum. */
const PAYOUT_ROLE_LABEL: Record<string, string> = {
  slk: 'Phòng SLK',
  secretary: 'Phòng TKKD',
  ceo: 'CEO',
  director: 'Giám đốc',
  other: 'Khác',
}

/** Status dot color by status — conveys state at a glance on the red banner. */
const STATUS_DOT: Record<string, string> = {
  [StatusType.DRAFT]: 'bg-amber-400',
  [StatusType.REVIEWED]: 'bg-data-blue-default',
  [StatusType.POSTED]: 'bg-data-green-default',
}

/** Local fallback labels — used until the server constant refreshes with the 3 states. */
const STATUS_LABEL_FALLBACK: Record<string, string> = {
  [StatusType.DRAFT]: 'Nháp',
  [StatusType.REVIEWED]: 'Đã duyệt',
  [StatusType.POSTED]: 'Đã ghi sổ',
}

function BannerStatusPill({ status }: { status: StatusType }) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_DEPT_COMMISSION_STATUS],
  })
  const labels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_DEPT_COMMISSION_STATUS
  ) as Record<string, string> | null
  const label =
    labels?.[status] ?? labels?.[status.toUpperCase()] ?? STATUS_LABEL_FALLBACK[status] ?? status
  const dot = STATUS_DOT[status] ?? 'bg-neutral-60'

  return (
    <div className="bg-content-light-1 flex items-center gap-2 rounded-full py-1.5 pr-4 pl-3 shadow-sm">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <span className="text-content-dark-1 text-sm font-semibold">{label}</span>
    </div>
  )
}

/** The secretary's per-pool sign-off — the ONE state this table shows.
 *
 * Entering the split ratio is a step INSIDE the pool screen, not a separate state
 * out here: the secretary enters it, then marks the pool processed. So the row only
 * answers "has the secretary finished this pool?", and every pool answering yes is
 * exactly what unlocks the review. */
function ProcessedChip({ processed }: { processed: boolean }) {
  return processed ? (
    <Chip label="Thư ký đã xử lý" variant={ColoredValueVariant.GREEN} size="small" />
  ) : (
    <Chip label="Chưa xử lý" variant={ColoredValueVariant.ORANGE} size="small" />
  )
}

export const CommSlkMonthlyDetail = ({
  summary,
  onBack,
  title = 'Chi tiết HH theo tháng — Sàn liên kết',
  toolbarLeftContent,
  extraActions,
}: Props) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // API returns UPPERCASE status but the generated enum is lowercase — normalise so
  // comparisons + label/color maps match (see normalizeSlkStatus).
  const statusKey = normalizeSlkStatus(summary.status) ?? (summary.status as StatusType)
  const reviewMutation = useReviewLinkedExchangeMonthlyCommission()
  const postMutation = usePostLinkedExchangeMonthlyCommission()
  const reopenMutation = useReopenLinkedExchangeMonthlyCommission()
  const computeMutation = useComputeLinkedExchangeMonthlyCommission()
  const { data: revenueLines } = useLinkedExchangeRevenueLines(summary.id)

  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const sourceLabels =
    (keysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as Record<string, string> | null) ??
    null
  // Client asked for different wording ("F2-SLK" / "F2 - Công ty") on THIS screen only —
  // override locally instead of touching F2SourceType, which other screens also read.
  const SLK_LOCAL_SOURCE_LABEL: Partial<Record<string, string>> = {
    [F2Source.linked]: 'F2-SLK',
    [F2Source.company]: 'F2 - Công ty',
  }
  const sourceLabel = (source: string) =>
    SLK_LOCAL_SOURCE_LABEL[source] ?? sourceLabels?.[source] ?? source

  const poolRows = useMemo(() => buildSlkPoolRows(summary), [summary, revenueLines])
  const pendingPools = useMemo(() => pendingDirectorPools(poolRows), [poolRows])
  // Deals the BE deliberately left out of this period's revenue (F2 not confirmed yet).
  // Shown here because a director whose ONLY deal is pending has no pool row at all — the
  // whole track is missing from the table below, with nothing else to hint at why.
  const pendingF2 = useMemo(() => pendingF2Deals(summary), [summary])
  const directorNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of poolRows) {
      if (row.directorId != null && row.directorName) map.set(row.directorId, row.directorName)
    }
    return map
  }, [poolRows])
  // Every pool with revenue must be marked "processed" (and every director split
  // entered) before the statement can be reviewed.
  const unprocessedPools = useMemo(
    () =>
      poolRows.filter((p) => {
        const split = (summary.source_splits ?? []).find(
          (s) => s.source_type === p.sourceType && (s.director_id ?? null) === p.directorId
        )
        return split?.processed_at == null
      }),
    [poolRows, summary.source_splits]
  )
  const canReview =
    statusKey === StatusType.DRAFT && pendingPools.length === 0 && unprocessedPools.length === 0
  // Keyed lookup for the row chip: the pool table is the only place the accountant
  // can see WHICH pool still blocks the review, so the flag has to be on the row.
  const unprocessedKeys = useMemo(
    () => new Set(unprocessedPools.map((p) => p.poolKey)),
    [unprocessedPools]
  )
  /** Pool names still blocking the review — spelled out on the disabled button. */
  const blockingPoolNames = (rows: SlkPoolRow[]) =>
    rows
      .map((p) => (p.directorName ? `GĐ ${p.directorName}` : sourceLabel(p.sourceType)))
      .join(', ')

  // Header lifecycle actions are permission-gated (BE enforces the same codenames,
  // so an ungranted role would only get a 403). Hide, don't disable — a button that
  // always 403s is worse than no button. Mirror the BE superuser bypass
  // (RoleBasedPermission) so an admin whose permission list omits the codename is
  // not locked out of buttons the server would accept.
  const { user } = useAuth()
  const perms = user?.permissions || []
  const can = (code: string) => hasPermission(perms, code)
  const canCompute = can('linkedexchangemonthlycommission.compute')
  const canReviewPerm = can('linkedexchangemonthlycommission.review')
  const canPost = can('linkedexchangemonthlycommission.post_ledger')
  const canReopen = can('linkedexchangemonthlycommission.reopen')

  // Total SLK revenue = all three source tracks; achieved commission rate is the
  // matched tier's pct_total (snapshotted at compute time).
  const totalRevenue =
    Number(summary.total_revenue || 0) +
    Number(summary.company_f2_revenue || 0) +
    Number(summary.director_f2_revenue || 0)
  const ruleSnapshot = summary.applied_rule_snapshot as {
    pct_total?: string
    name?: string
  } | null
  // The tier's total pool rate (LinkedExchangeRevenueRule.pct_total) — this is the
  // rate each F2 source track is paid at. It is NOT the sum of the LINKED role
  // weights, so never re-derive it from those; show nothing when the snapshot
  // predates the pct_total field (such rows need a backfill). Coerce the decimal
  // string to a number so trailing zeros ("6.000000") render as "6".
  const commissionRate = ruleSnapshot?.pct_total != null ? Number(ruleSnapshot.pct_total) : null

  const poolColumns = useMemo<ColumnDef<SlkPoolRow>[]>(
    () => [
      {
        id: 'source',
        header: 'Nguồn F2',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div>
              <span className="text-content-dark-1 text-[13px] font-semibold">
                {p.directorName
                  ? `${sourceLabel(F2Source.director)} — ${p.directorName}`
                  : sourceLabel(p.sourceType)}
              </span>
              {p.sourceType === F2Source.director && <EmployeeOrgHint detail={p.directorDetail} />}
            </div>
          )
        },
        meta: { width: 'w-[240px]' },
      },
      {
        id: 'revenue',
        header: 'Doanh thu',
        cell: ({ row }) => (
          <span className="text-content-dark-1">{formatCurrencyVND(row.original.revenue)}</span>
        ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'pool',
        header: 'Hoa hồng kỳ này',
        // The pool total (revenue × tier rate) is known from revenue alone, so show it
        // even while a director split is pending — only the per-party breakdown waits
        // for the entered ratio (see the "Phân bổ các bên" column).
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {formatCurrencyVND(row.original.poolTotal)}
          </span>
        ),
        meta: { width: 'w-[150px]', align: 'right' },
      },
      {
        id: 'allocation',
        header: 'Phân bổ các bên',
        cell: ({ row }) => {
          const { payout } = row.original
          if (payout.length === 0) return <span className="text-content-dark-3 text-xs">—</span>
          return (
            <div className="flex flex-col gap-0.5">
              {payout.map((r, i) => (
                <span key={i} className="text-content-dark-2 text-xs">
                  {(r.role && PAYOUT_ROLE_LABEL[r.role]) ?? r.role ?? '—'}:{' '}
                  <span className="text-content-dark-1">
                    {formatCurrencyVND(Number(r.amount || 0))}
                  </span>
                </span>
              ))}
            </div>
          )
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'processed_state',
        header: 'Trạng thái',
        cell: ({ row }) => <ProcessedChip processed={!unprocessedKeys.has(row.original.poolKey)} />,
        meta: { width: 'w-[170px]', frozenRight: true },
      },
    ],
    // sourceLabel is derived from a stable app-constant map for the render lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unprocessedKeys]
  )

  const poolActions = useMemo<TableAction<SlkPoolRow>[]>(
    () => [
      {
        // In DRAFT the pool page lets the accountant edit the split + mark it
        // processed; once REVIEWED/POSTED it is view-only.
        label: statusKey === StatusType.DRAFT ? 'Xử lý pool' : 'Xem chi tiết',
        icon:
          statusKey === StatusType.DRAFT ? <IconPencilsimple size={16} /> : <IconEye size={16} />,
        show: () => true,
        onClick: (p) => goToPool(p.poolKey),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusKey]
  )

  const invalidateDetail = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.DETAIL(summary.id),
    })

  const handleReview = async () => {
    try {
      await reviewMutation.mutateAsync({ id: summary.id })
      invalidateDetail()
      toastService.success('Duyệt bảng kê thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handlePost = async () => {
    try {
      await postMutation.mutateAsync({ id: summary.id })
      invalidateDetail()
      toastService.success('Ghi sổ thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleReopen = async () => {
    try {
      await reopenMutation.mutateAsync({ id: summary.id })
      invalidateDetail()
      toastService.success('Đã mở lại bảng kê')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  // Compute is period-level (year+month): recomputing the whole period refreshes
  // this record too. Kept enabled only while DRAFT so a reviewed/posted statement
  // is never silently overwritten by a recompute.
  const handleCompute = async () => {
    try {
      await computeMutation.mutateAsync({ year: summary.year, month: summary.month })
      toastService.success(
        `Đã tính doanh thu kỳ ${String(summary.month).padStart(2, '0')}/${summary.year}`
      )
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const goToPool = (poolKey: string) =>
    navigate(
      APP_PATH.COMMISSION_SLK_MONTHLY_POOL.replace(':id', String(summary.id)).replace(
        ':poolKey',
        poolKey
      )
    )

  const periodPill = `${String(summary.month).padStart(2, '0')}/${summary.year}`

  const exportRef = useRef<HTMLDivElement>(null)
  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current) return
    const filename = `ChiTietHH_SLK_Ky_${summary.month}_${summary.year}.pdf`
    try {
      await exportElementToPdf(exportRef.current, {
        fileName: filename,
        overlayMessage: 'Đang tạo PDF...',
      })
    } catch {
      toastService.error('Có lỗi xảy ra khi xuất PDF')
    }
  }, [summary])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={title}
        enableBackButton={!!onBack}
        handleBackButton={onBack}
        handleExportBtnIcon={handleExportPdf}
        titleExportBtnIcon="Xuất PDF"
        toolbarLeftContent={toolbarLeftContent}
        customActions={
          <div className="flex items-center gap-2">
            {statusKey === StatusType.DRAFT && canCompute && (
              <Button
                size="small"
                variant="secondary"
                leftIcon={<IconCalculator />}
                onClick={handleCompute}
                loading={computeMutation.isPending}
              >
                Tính doanh thu kỳ này
              </Button>
            )}
            {statusKey === StatusType.DRAFT && canReviewPerm && (
              <Button
                size="small"
                leftIcon={<IconCheck />}
                onClick={handleReview}
                loading={reviewMutation.isPending}
                disabled={!canReview}
                title={
                  canReview
                    ? undefined
                    : pendingPools.length > 0
                      ? `Chưa nhập tỷ lệ chia: ${blockingPoolNames(pendingPools)}`
                      : `Chưa đánh dấu đã xử lý: ${blockingPoolNames(unprocessedPools)}`
                }
              >
                Duyệt bảng kê
              </Button>
            )}
            {statusKey === StatusType.REVIEWED && (
              <>
                {canReopen && (
                  <Button
                    size="small"
                    variant="secondary"
                    leftIcon={<IconArrowcounterclockwise />}
                    onClick={handleReopen}
                    loading={reopenMutation.isPending}
                  >
                    Mở lại bảng kê
                  </Button>
                )}
                {canPost && (
                  <Button
                    size="small"
                    leftIcon={<IconReceipt />}
                    onClick={handlePost}
                    loading={postMutation.isPending}
                  >
                    Ghi sổ
                  </Button>
                )}
              </>
            )}
            {statusKey === StatusType.POSTED && (
              <>
                {canReopen && (
                  <Button
                    size="small"
                    variant="secondary"
                    leftIcon={<IconArrowcounterclockwise />}
                    onClick={handleReopen}
                    loading={reopenMutation.isPending}
                  >
                    Mở lại bảng kê
                  </Button>
                )}
                <Button
                  size="small"
                  leftIcon={<IconReceipt />}
                  onClick={() =>
                    navigate(APP_PATH.PAYMENT_VOUCHER_CREATE, {
                      state: {
                        payee_type: 'EXCHANGE',
                        payee_exchange: summary.linked_department,
                        total_amount: Number(summary.amount_linked_department || 0),
                      },
                    })
                  }
                >
                  Tạo phiếu chi
                </Button>
              </>
            )}
            {extraActions}
          </div>
        }
      />

      <div ref={exportRef} className="flex flex-grow flex-col gap-5 overflow-y-auto px-7 pt-4 pb-6">
        {/* Period banner */}
        <div className="bg-action-primary-red-default text-content-light-1 flex items-center justify-between rounded-lg px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="bg-content-light-1/15 flex h-11 w-11 items-center justify-center rounded-md">
              <IconCalendar size={22} color="#ffffff" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-[0.08em] uppercase opacity-85">
                Kỳ tính hoa hồng
              </span>
              <span className="text-2xl font-semibold">Kỳ {periodPill}</span>
            </div>
          </div>
          <BannerStatusPill status={statusKey} />
        </div>

        {/* Key metrics: total SLK revenue, achieved commission rate, total commission */}
        <div className="border-border-1 grid grid-cols-1 gap-0 rounded-lg border bg-white md:grid-cols-3">
          <div className="border-border-1 flex flex-col justify-center gap-1 border-b p-5 md:border-r md:border-b-0">
            <span className="text-content-dark-3 text-xs font-semibold tracking-[0.06em] uppercase">
              Tổng doanh thu SLK
            </span>
            <span className="text-content-dark-1 text-2xl font-semibold">
              {formatCurrencyVND(totalRevenue)} <span className="text-base font-normal">VNĐ</span>
            </span>
            <span className="text-content-dark-3 text-[11px]">
              Sàn liên kết {formatCurrencyVND(Number(summary.total_revenue || 0))} · Công ty{' '}
              {formatCurrencyVND(Number(summary.company_f2_revenue || 0))} · Giám đốc{' '}
              {formatCurrencyVND(Number(summary.director_f2_revenue || 0))}
            </span>
          </div>
          <div className="border-border-1 flex flex-col justify-center gap-1 border-b p-5 md:border-r md:border-b-0">
            <span className="text-content-dark-3 text-xs font-semibold tracking-[0.06em] uppercase">
              Mức commission (theo bậc)
            </span>
            <span className="text-content-dark-1 text-2xl font-semibold">
              {commissionRate != null && Number.isFinite(commissionRate)
                ? `${commissionRate}%`
                : '—'}
            </span>
            <span className="text-content-dark-3 text-[11px]">
              {ruleSnapshot ? `Bậc: ${ruleSnapshot.name ?? '—'}` : 'Chưa khớp bậc'}
            </span>
          </div>
          <div className="flex flex-col justify-center gap-1 p-5">
            <span className="text-content-dark-3 text-xs font-semibold tracking-[0.06em] uppercase">
              Tổng hoa hồng kỳ này
            </span>
            <span className="text-action-primary-red-default text-2xl font-semibold">
              {formatCurrencyVND(Number(summary.amount_total || 0))}{' '}
              <span className="text-base font-normal">VNĐ</span>
            </span>
          </div>
        </div>

        <SlkPendingF2Notice
          deals={pendingF2}
          directorName={(id) => directorNameById.get(id) ?? null}
        />

        {/* Pools by F2 source */}
        <div className="border-border-1 flex flex-col rounded-lg border bg-white">
          <div className="border-border-1 flex items-center justify-between border-b px-6 py-4">
            <h3 className="text-content-dark-1 text-lg font-semibold">
              Các nguồn hoa hồng Sàn liên kết
            </h3>
            <span className="text-content-dark-3 text-xs">{poolRows.length} pool</span>
          </div>
          {/* No onRowClick: every pool row always has one visible rowAction, and
              TableRow opens the action menu instead of firing onRowClick when any
              action is visible — so the contextual action (Xem/Sửa/Nhập) is the
              single navigation affordance. */}
          {/* No pagination: a period has at most a handful of pools (one LINKED + one
              COMPANY + one per director), so a pager only ever added chrome and could
              hide a pool that still blocks the review. Always render the full set. */}
          <Table
            className="!px-0"
            data={poolRows}
            columns={poolColumns}
            isLoading={false}
            showActions
            rowActions={poolActions}
            disableInnerOverflow
            enablePagination={false}
            paginationPosition="static"
            stickyHeader
          />
        </div>

        {summary.note ? (
          <div className="border-border-1 rounded-lg border bg-white p-6">
            <div className="divide-border-1 flex flex-col divide-y">
              <DisplayFieldRow label="Ghi chú" value={summary.note} className={'justify-start'} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
