import type { ReactNode } from 'react'
import { Flex } from '@radix-ui/themes'
import { Chip } from '@/components/ui'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import { EmployeeProfileLink, ReferenceCode } from '@/components/commons'
import ProjectDetailLink from '@/components/commons/ProjectDetailLink'
import { IconCalendar } from '@/assets/icons'
import { cn, formatCurrencyVND } from '@/utils'
import type { ProjectDirectorCommissionPeriod } from '@/features/accounting/director-commissions/services/director-commission-service'
import {
  BALANCE_STATE_VARIANT,
  DIRECTOR_COMMISSION_STATUS_VARIANT,
} from '@/features/accounting/director-commissions/constants/director-commission-constants'
import { useDirectorCommissionConstants } from '@/features/accounting/director-commissions/hooks/useDirectorCommissionConstants'

type DirectorCommissionDetailProps = {
  item: ProjectDirectorCommissionPeriod
  /** Buttons rendered inline next to the status chip in the summary card header. */
  headerActions?: ReactNode
}

function formatPeriodLabel(month?: number | null, year?: number | null): string {
  if (!month || !year) return 'Kỳ —'
  return `Kỳ ${String(month).padStart(2, '0')}/${year}`
}

function formatPeriodPill(month?: number | null, year?: number | null): string | null {
  if (!month || !year) return null
  return `${String(month).padStart(2, '0')}/${year}`
}

type SummaryRowProps = {
  label: ReactNode
  value: ReactNode
  className?: string
  index?: number
  formula?: ReactNode
}

function SummaryRow({ label, value, className, index, formula }: SummaryRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3.5', className)}>
      <span className="text-content-dark-2 flex flex-col text-sm">
        <span>
          {index != null ? <span className="text-content-dark-4 mr-1">({index})</span> : null}
          {label}
        </span>
        {formula ? (
          <span className="text-content-dark-4 text-[11px] font-normal italic">{formula}</span>
        ) : null}
      </span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

function MoneyValue({
  amount,
  tone = 'default',
  prefix,
}: {
  amount: number
  tone?: 'default' | 'red' | 'blue' | 'orange'
  prefix?: string
}) {
  const toneClass =
    tone === 'red'
      ? 'text-data-red-default'
      : tone === 'blue'
        ? 'text-data-blue-default'
        : tone === 'orange'
          ? 'text-data-orange-default'
          : 'text-content-dark-1'
  return (
    <>
      <span className={cn('font-semibold', toneClass)}>
        {prefix}
        {formatCurrencyVND(amount)}
      </span>
      <span className="text-content-dark-3 ml-1 text-xs font-normal">VNĐ</span>
    </>
  )
}

export default function DirectorCommissionDetail({
  item,
  headerActions,
}: DirectorCommissionDetailProps) {
  const { statusLabels, balanceLabels } = useDirectorCommissionConstants()
  const statusLabel = statusLabels[item.status] ?? String(item.status)
  const statusVariant = DIRECTOR_COMMISSION_STATUS_VARIANT[item.status]
  const balanceLabel = balanceLabels[item.balance_state] ?? String(item.balance_state)
  const balanceVariant = BALANCE_STATE_VARIANT[item.balance_state]

  const periodLabel = formatPeriodLabel(item.period_month, item.period_year)
  const periodPill = formatPeriodPill(item.period_month, item.period_year)

  const pctPayout = Number(item.pct_payout ?? 0)
  const pctEntitled = Number(item.pct_entitled ?? 0)
  const pctDiff = Number((pctEntitled - pctPayout).toFixed(4))
  const payout = Number(item.payout_amount ?? 0)
  const isClawback = payout < 0

  return (
    <div className="flex flex-col gap-5">
      {/* Period banner */}
      <div className="bg-action-primary-red-default text-content-light-1 flex items-center justify-between rounded-lg px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="bg-content-light-1/15 flex h-11 w-11 items-center justify-center rounded-md">
            <IconCalendar size={22} className="text-content-light-1" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-[0.08em] uppercase opacity-85">
              Kỳ tính hoa hồng
            </span>
            <span className="text-2xl font-semibold">{periodLabel}</span>
          </div>
        </div>
        {periodPill ? (
          <div className="bg-content-light-1 text-content-dark-1 rounded-full px-4 py-1.5 text-sm font-semibold">
            {periodPill}
          </div>
        ) : null}
      </div>

      {/* Summary card */}
      <div className="border-border-1 flex flex-col rounded-lg border bg-white">
        <Flex
          direction={{ initial: 'column', md: 'row' }}
          align={{ initial: 'start', md: 'center' }}
          justify="between"
          gap="3"
          className="border-border-1 border-b px-6 py-4"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-content-dark-1 text-lg font-semibold">
              Hoa hồng Giám đốc dự án
              {item.project_name ? (
                <>
                  {' - '}
                  <ProjectDetailLink projectId={item.project} className="font-semibold">
                    {item.project_name}
                  </ProjectDetailLink>
                </>
              ) : null}
            </h3>
            {item.director_name ? (
              // Đồng bộ với cột "Giám đốc dự án" ở màn Danh sách (CR 86eyr1rju): tên là link mở
              // tab mới có gate quyền, mã nhân viên đi kèm dạng pill.
              <span className="text-content-dark-3 flex flex-wrap items-center gap-1.5 text-sm">
                GĐ dự án:
                <EmployeeProfileLink employeeId={item.director}>
                  {item.director_name}
                </EmployeeProfileLink>
                {item.director_code ? (
                  <ReferenceCode
                    code={item.director_code}
                    className="[&_code]:px-1 [&_code]:py-0 [&_code]:text-xs"
                  />
                ) : null}
              </span>
            ) : null}
          </div>
          <Flex align="center" gap="2" wrap="wrap">
            {statusVariant ? <Chip variant={statusVariant} label={statusLabel} /> : null}
            {headerActions}
          </Flex>
        </Flex>

        <div className="grid grid-cols-1 gap-6 px-6 py-5 md:grid-cols-3">
          <div className="flex flex-col md:col-span-2">
            <SummaryRow
              index={1}
              label="Tiền về trong kỳ (net)"
              value={<MoneyValue amount={Number(item.receipt_in_period ?? 0)} />}
            />
            <SummaryRow
              index={2}
              label="Lũy kế tiền về (net)"
              value={<MoneyValue amount={Number(item.receipt_cum ?? 0)} />}
            />
            <SummaryRow
              index={3}
              label="Mức % chi kỳ này"
              value={
                <span className="text-content-dark-1 font-semibold">
                  {pctPayout}%
                  {pctPayout !== pctEntitled ? (
                    <span className="text-content-dark-3 ml-1 text-xs font-normal">
                      (được hưởng {pctEntitled}%)
                    </span>
                  ) : null}
                </span>
              }
            />
            <SummaryRow
              index={4}
              label="Số dư % giữa kỳ này và cấu hình"
              value={<span className="text-content-dark-1 font-semibold">{pctDiff}%</span>}
            />
            <SummaryRow
              index={5}
              className="border-border-1 border-b"
              label={<span className="text-content-dark-1 font-semibold">Được hưởng lũy kế</span>}
              formula={`= (2) × ${pctEntitled}%`}
              value={<MoneyValue amount={Number(item.entitled_cum ?? 0)} tone="blue" />}
            />
            <SummaryRow
              index={6}
              label="Đã chi lũy kế trước kỳ"
              value={<MoneyValue amount={Number(item.paid_before ?? 0)} />}
            />
            <SummaryRow
              index={7}
              label="Chi / (Đòi lại) kỳ này"
              formula="= Được hưởng lũy kế − Đã chi lũy kế trước kỳ"
              value={
                isClawback ? (
                  <MoneyValue amount={Math.abs(payout)} tone="orange" prefix="Đòi lại " />
                ) : (
                  <MoneyValue amount={payout} tone="red" />
                )
              }
            />
            <SummaryRow
              index={8}
              label={<span className="text-content-dark-1 font-semibold">Số dư cuối kỳ</span>}
              value={
                <span className="flex items-center justify-end gap-2">
                  <MoneyValue amount={Number(item.balance_after ?? 0)} />
                  {balanceVariant ? (
                    <Chip variant={balanceVariant} label={balanceLabel} size="small" />
                  ) : null}
                </span>
              }
            />
          </div>

          <div
            className={cn(
              'flex flex-col gap-4 self-start p-5',
              'bg-[linear-gradient(180deg,var(--color-action-primary-red-activated)_0%,var(--color-content-light-1)_100%)]',
              'border-action-primary-red-default/40 h-full rounded-lg border'
            )}
          >
            <span className="text-action-primary-red-default text-xs font-semibold tracking-[0.08em] uppercase">
              Hoa hồng GĐ dự án — Kỳ này
            </span>
            <div className="flex flex-1 flex-col justify-center">
              <span
                className={cn(
                  'text-3xl leading-tight font-semibold',
                  isClawback ? 'text-data-orange-default' : 'text-action-primary-red-default'
                )}
              >
                {isClawback ? 'Đòi lại ' : ''}
                {formatCurrencyVND(Math.abs(payout))}
              </span>
              <span
                className={cn(
                  'text-base font-normal',
                  isClawback ? 'text-data-orange-default' : 'text-action-primary-red-default'
                )}
              >
                VNĐ
              </span>
            </div>
          </div>
        </div>

        {item.note ? (
          <div className="border-border-1 border-t px-6 py-4">
            <DisplayFieldRow label="Ghi chú" value={item.note} className="justify-start" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
