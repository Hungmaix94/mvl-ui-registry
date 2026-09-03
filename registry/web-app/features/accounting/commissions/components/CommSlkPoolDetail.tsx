import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle, Chip } from '@/components/ui'
import { cn, formatCurrencyVND } from '@/utils'
import {
  useSetSourceSplits,
  useMarkPoolProcessed,
  type LinkedExchangeMonthlyCommission,
  type SetSourceSplitsRequest,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import {
  useLinkedExchangeRevenueLines,
  useLinkedExchangeStaleness,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { LinkedExchangeDeptCommissionStatus as StatusType, ColoredValueVariant } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAuth } from '@/store'
import { hasPermission } from '@/utils/auth'
import {
  buildSlkPoolRows,
  parsePoolKey,
  normalizeSlkStatus,
  linesForPool,
  pendingF2ForPool,
  type SlkPoolRow,
  type EmployeeOrgDetail,
} from '../utils/slk-pool-utils'
import { EmployeeOrgHint } from './EmployeeOrgHint'
import { CommSlkRevenueLinesTable } from './CommSlkRevenueLinesTable'
import { SlkPendingF2Notice } from './SlkPendingF2Notice'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

type Props = {
  summary: LinkedExchangeMonthlyCommission
  poolKey: string
  onBack: () => void
}

/** One editable recipient line: a fixed recipient (dept or employee) + its share %. */
type EditorLine = {
  key: string
  label: string
  recipientEmployeeId: number | null
  recipientDepartmentId: number | null
  pct: string
  /** Org detail (dept/block/branch) — set for the GĐKD line to show the breadcrumb. */
  orgDetail?: EmployeeOrgDetail | null
}

const num = (value?: string | number | null): number => Number(value || 0)

const STALE_HINT = 'Bảng kê đang hiển thị số của lần tính trước — hãy tính lại trước khi duyệt.'

/** The stored split for this pool (LINKED/COMPANY/DIRECTOR are all stored uniformly). */
function splitForPool(summary: LinkedExchangeMonthlyCommission, pool: SlkPoolRow) {
  return (summary.source_splits ?? []).find(
    (s) => s.source_type === pool.sourceType && (s.director_id ?? null) === pool.directorId
  )
}

/**
 * Build the editor's recipient lines from the pool's stored split. Every source
 * (LINKED / COMPANY / DIRECTOR) is seeded by compute() and read the same way —
 * LINKED from the rule's role weights, COMPANY 30/70, DIRECTOR entered by the
 * secretary. Falls back to the standard recipients only if a split is somehow
 * missing (defensive; compute always seeds one for a pool with revenue).
 */
function buildEditorLines(
  summary: LinkedExchangeMonthlyCommission,
  pool: SlkPoolRow
): EditorLine[] {
  const split = splitForPool(summary, pool)
  if (split && split.lines.length > 0) {
    return split.lines.map((line, i) => ({
      key: `line-${line.id ?? i}`,
      label:
        line.recipient_department_detail?.name ??
        line.recipient_employee_detail?.fullname ??
        (line.recipient_department_id ? 'Phòng ban' : 'Nhân viên'),
      recipientEmployeeId: line.recipient_employee_id ?? null,
      recipientDepartmentId: line.recipient_department_id ?? null,
      pct: line.pct != null ? String(line.pct) : '',
      // Show the org breadcrumb for the GĐKD recipient (the director employee).
      orgDetail:
        pool.directorId != null && line.recipient_employee_id === pool.directorId
          ? (line.recipient_employee_detail ?? pool.directorDetail)
          : null,
    }))
  }

  // Defensive fallback (a pool with revenue is always seeded by compute()).
  const tkkdName = summary.secretary_department_detail?.name ?? 'Phòng TKKD'
  const ceoName = summary.ceo_employee_detail?.fullname ?? 'CEO'
  const tkkdId = summary.secretary_department ?? summary.secretary_department_detail?.id ?? null
  const ceoId = summary.ceo_employee ?? summary.ceo_employee_detail?.id ?? null
  const lines: EditorLine[] = [
    {
      key: 'tkkd',
      label: tkkdName,
      recipientEmployeeId: null,
      recipientDepartmentId: tkkdId,
      pct: pool.sourceType === F2Source.company ? '30' : '',
    },
    {
      key: 'ceo',
      label: ceoName,
      recipientEmployeeId: ceoId,
      recipientDepartmentId: null,
      pct: pool.sourceType === F2Source.company ? '70' : '',
    },
  ]
  if (pool.sourceType === F2Source.director) {
    lines.push({
      key: 'director',
      label: pool.directorName ?? 'Giám đốc',
      recipientEmployeeId: pool.directorId,
      recipientDepartmentId: null,
      pct: '',
      orgDetail: pool.directorDetail,
    })
  }
  return lines
}

/** Live money for a recipient = pool total (revenue × tier rate) × the entered %.
 * Computed from the current input so it updates as the secretary types — no need to
 * save + recompute first. The pool total is deterministic (independent of the split),
 * so this matches the BE payout after save (±1 VND from largest-remainder rounding). */
function moneyForLine(pool: SlkPoolRow, line: EditorLine): number | null {
  const pct = num(line.pct)
  if (!pct || !pool.poolTotal) return null
  return Math.round((pool.poolTotal * pct) / 100)
}

export const CommSlkPoolDetail = ({ summary, poolKey, onBack }: Props) => {
  const queryClient = useQueryClient()
  const setSplits = useSetSourceSplits()
  const markProcessed = useMarkPoolProcessed()
  const { data: revenueLines } = useLinkedExchangeRevenueLines(summary.id)

  const { keysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const sourceLabels =
    (keysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as Record<string, string> | null) ??
    null
  const sourceLabel = (source: string) => sourceLabels?.[source] ?? source

  const { user } = useAuth()
  const canEditSplits = useMemo(
    () =>
      hasPermission(user?.permissions || [], 'linkedexchangemonthlycommission.set_source_splits'),
    [user?.permissions]
  )
  const canMarkProcessed = useMemo(
    () =>
      hasPermission(user?.permissions || [], 'linkedexchangemonthlycommission.mark_pool_processed'),
    [user?.permissions]
  )

  const parsed = parsePoolKey(poolKey)
  const pool = useMemo(() => {
    const rows = buildSlkPoolRows(summary)
    return rows.find((r) => r.poolKey === poolKey) ?? null
  }, [summary, revenueLines, poolKey])

  /** The transactions behind this pool's "Doanh thu nguồn SLK kỳ này". */
  const poolLines = useMemo(() => linesForPool(revenueLines ?? [], parsed), [revenueLines, parsed])

  /** This director's deals held back by an unconfirmed F2 — why the table below is short. */
  const pendingF2 = useMemo(() => pendingF2ForPool(summary, parsed), [summary, parsed])

  // Freshness of the whole statement. Only actionable while it is still a DRAFT — once
  // reviewed or posted the snapshot is frozen on purpose and "stale" is meaningless.
  const { data: staleness } = useLinkedExchangeStaleness(summary.id, {
    enabled: normalizeSlkStatus(summary.status) === StatusType.DRAFT,
  })
  const isStale = staleness?.is_stale ?? false

  // The pool is editable only while the statement is a DRAFT (REVIEWED/POSTED
  // freeze it). LINKED is now editable like every other source.
  // API returns UPPERCASE status but the generated enum is lowercase — normalise
  // (see normalizeSlkStatus) so the DRAFT check does not always read false.
  const statusKey = normalizeSlkStatus(summary.status) ?? (summary.status as StatusType)
  const isReadOnly = statusKey !== StatusType.DRAFT || !parsed || !canEditSplits
  const split = pool ? splitForPool(summary, pool) : undefined
  const isProcessed = split?.processed_at != null
  const [lines, setLines] = useState<EditorLine[] | null>(null)
  // Initialise editor lines once the pool is resolved.
  /** The saved split as the screen first showed it — the baseline every edit is measured against. */
  const baselineLines = useMemo(
    () => (pool ? buildEditorLines(summary, pool) : []),
    [summary, pool]
  )
  const editorLines = lines ?? baselineLines

  // Compared numerically so re-typing the same figure ("40" over "40.00") does not count
  // as an edit — the save/cancel pair should only appear once something actually differs.
  const isDirty =
    lines != null &&
    (lines.length !== baselineLines.length ||
      lines.some((line, i) => num(line.pct) !== num(baselineLines[i]?.pct)))

  const totalPct = editorLines.reduce((sum, l) => sum + num(l.pct), 0)
  // Tolerance compare — summed float pcts (e.g. 33.33 + 33.33 + 33.34) never land
  // exactly on 100, so a strict === would block valid 3-way director splits.
  const isSumValid = Math.abs(totalPct - 100) < 0.01

  const handlePctChange = (key: string, value: string) => {
    setLines(editorLines.map((l) => (l.key === key ? { ...l, pct: value } : l)))
  }

  const handleSave = async () => {
    if (!parsed || !pool) return
    if (!isSumValid) {
      toastService.error('Tổng tỷ lệ phải bằng 100%')
      return
    }
    const payload: SetSourceSplitsRequest = {
      splits: [
        {
          source_type: parsed.sourceType,
          director_id: parsed.directorId,
          lines: editorLines.map((l) => ({
            recipient_employee_id: l.recipientEmployeeId,
            recipient_department_id: l.recipientDepartmentId,
            pct: String(num(l.pct)),
          })),
        },
      ],
    }
    try {
      await setSplits.mutateAsync({ id: summary.id, data: payload })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.DETAIL(summary.id),
      })
      toastService.success('Lưu tỷ lệ chia thành công')
      onBack()
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleToggleProcessed = async () => {
    if (!parsed) return
    try {
      await markProcessed.mutateAsync({
        id: summary.id,
        data: {
          source_type: parsed.sourceType,
          director: parsed.directorId,
          processed: !isProcessed,
        },
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.DETAIL(summary.id),
      })
      toastService.success(isProcessed ? 'Đã bỏ đánh dấu xử lý' : 'Đã đánh dấu pool đã xử lý')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const title = pool?.directorName
    ? `${sourceLabel(F2Source.director)} — ${pool.directorName}`
    : pool
      ? sourceLabel(pool.sourceType)
      : 'Pool nguồn F2'

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={`Chi tiết pool — ${title}`}
        enableBackButton
        handleBackButton={onBack}
        customActions={
          !isReadOnly && canMarkProcessed ? (
            <Button
              variant={isProcessed ? 'secondary' : 'primary'}
              onClick={handleToggleProcessed}
              loading={markProcessed.isPending}
              // Marking is held back while the figures are out of date — signing off on
              // numbers the review gate will reject is wasted work. Un-marking stays
              // available: stepping back from a stale approval is always valid.
              disabled={(!isSumValid && !isProcessed) || (isStale && !isProcessed)}
              title={isStale && !isProcessed ? STALE_HINT : undefined}
            >
              {isProcessed ? 'Bỏ đánh dấu đã xử lý' : 'Đánh dấu đã xử lý'}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-grow flex-col gap-5 overflow-y-auto px-7 pt-4 pb-6">
        {/* Outside the pool branch on purpose: when EVERY deal of this director is still
            pending there is no pool row at all, and this notice is then the only thing that
            explains the empty screen. */}
        <SlkPendingF2Notice deals={pendingF2} />

        {!pool ? (
          <div className="text-content-dark-3 p-8 text-center text-sm">
            Không tìm thấy pool tương ứng.
          </div>
        ) : (
          <>
            {/* Out-of-date figures: say so here, before the accountant starts approving,
                rather than letting them find out at the review gate. */}
            {isStale && (
              <div className="border-data-orange-default bg-data-orange-light text-content-dark-1 rounded-lg border px-5 py-4 text-sm">
                <span className="font-semibold">Số liệu đã cũ.</span> {STALE_HINT}
              </div>
            )}

            {/* Pool summary: Kỳ · Doanh thu nguồn SLK kỳ này · Mức theo bậc · Số tiền hoa hồng */}
            <div className="border-border-1 grid grid-cols-1 gap-0 rounded-lg border bg-white md:grid-cols-4">
              <div className="flex flex-col justify-center gap-1 p-5">
                <span className="text-content-dark-3 text-xs">Kỳ</span>
                <span className="text-content-dark-1 text-sm font-semibold">
                  {String(summary.month).padStart(2, '0')}/{summary.year}
                </span>
              </div>
              <PoolStat label="Doanh thu nguồn SLK kỳ này" value={pool.revenue} />
              <div className="flex flex-col justify-center gap-1 p-5">
                <span className="text-content-dark-3 text-xs">Mức theo bậc</span>
                <span className="text-content-dark-1 text-sm font-semibold">
                  {pool.ratePct ? `${pool.ratePct}%` : '—'}
                </span>
              </div>
              <PoolStat label="Số tiền hoa hồng" value={pool.poolTotal} accent />
            </div>

            {/* Ratio editor */}
            <div className="border-border-1 flex flex-col rounded-lg border bg-white">
              <div className="border-border-1 flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-content-dark-1 text-lg font-semibold">
                    Tỷ lệ chia cho các bên nhận
                  </h3>
                  {isProcessed ? (
                    <Chip label="Đã xử lý" variant={ColoredValueVariant.GREEN} size="small" />
                  ) : (
                    <Chip label="Chưa xử lý" variant={ColoredValueVariant.ORANGE} size="small" />
                  )}
                </div>
                {!isReadOnly && (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isSumValid ? 'text-data-green-default' : 'text-action-primary-red-default'
                    )}
                  >
                    Tổng: {totalPct}%
                  </span>
                )}
              </div>

              <div className="divide-border-1 flex flex-col divide-y">
                <div className="text-content-dark-3 grid grid-cols-[1fr_120px_160px] gap-4 px-6 py-2.5 text-xs font-semibold uppercase">
                  <span>Bên nhận</span>
                  <span className="text-right">Tỷ lệ</span>
                  <span className="text-right">Thành tiền</span>
                </div>
                {editorLines.map((line) => {
                  const money = moneyForLine(pool, line)
                  return (
                    <div
                      key={line.key}
                      className="grid grid-cols-[1fr_120px_160px] items-center gap-4 px-6 py-3"
                    >
                      <div>
                        <span className="text-content-dark-1 text-sm">{line.label}</span>
                        <EmployeeOrgHint detail={line.orgDetail} />
                      </div>
                      {isReadOnly ? (
                        <span className="text-content-dark-1 text-right text-sm">
                          {line.pct !== '' ? `${line.pct}%` : '—'}
                        </span>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="border-border-1 focus:ring-brand-primary h-10 w-full [appearance:textfield] rounded-md border bg-transparent py-2 pr-8 pl-3 text-right text-sm outline-none focus:ring-1 [&::-webkit-inner-spin-button]:appearance-none"
                            value={line.pct}
                            onChange={(e) => handlePctChange(line.key, e.target.value)}
                            placeholder="0"
                          />
                          <span className="text-content-dark-3 absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                            %
                          </span>
                        </div>
                      )}
                      <span className="text-content-dark-1 text-right text-sm font-medium">
                        {money != null ? `${formatCurrencyVND(money)} VNĐ` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Only once a ratio actually changed: a save/cancel pair sitting there on an
                  untouched screen reads as work waiting to be done. */}
              {!isReadOnly && isDirty && (
                <div className="border-border-1 flex justify-end gap-2 border-t px-6 py-4">
                  <Button variant="secondary" onClick={onBack}>
                    Huỷ
                  </Button>
                  <Button onClick={handleSave} loading={setSplits.isPending} disabled={!isSumValid}>
                    Lưu tỷ lệ
                  </Button>
                </div>
              )}
              {statusKey !== StatusType.DRAFT && (
                <div className="text-content-dark-3 border-border-1 border-t px-6 py-3 text-xs">
                  Bảng kê đã {statusKey === StatusType.POSTED ? 'ghi sổ' : 'duyệt'} — tỷ lệ chỉ xem.
                  Mở lại bảng kê để chỉnh sửa.
                </div>
              )}
            </div>

            {/* Where "Doanh thu nguồn SLK kỳ này" above comes from, transaction by transaction. */}
            <CommSlkRevenueLinesTable
              monthlyId={summary.id}
              lines={poolLines}
              singleTitle={`Giao dịch đóng góp doanh thu — ${title}`}
            />
          </>
        )}
      </div>
    </div>
  )
}

function PoolStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-border-1 flex flex-col justify-center gap-1 border-b p-5 md:border-r md:border-b-0">
      <span className="text-content-dark-3 text-xs">{label}</span>
      <span
        className={cn(
          'text-xl font-semibold',
          accent ? 'text-action-primary-red-default' : 'text-content-dark-1'
        )}
      >
        {formatCurrencyVND(value)} <span className="text-sm font-normal">VNĐ</span>
      </span>
    </div>
  )
}
