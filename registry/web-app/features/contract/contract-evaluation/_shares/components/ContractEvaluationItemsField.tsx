import { useCallback, useMemo } from 'react'

import type { components } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { cn } from '@/utils'

import type { ContractEvaluationItemRating } from '../constants/contract-evaluation-constants'
import {
  buildChildItemsByParent,
  type GroupedEvaluationItems,
  groupEvaluationItems,
} from '../utils/contract-evaluation-items'

type ContractEvaluationItem = components['schemas']['ContractEvaluationItem']

/** Per-item manager ratings, indexed by `item_id` (from `manager_decisions[]`). */
export type RatingsByItem = Map<number, { order: number; rating: ContractEvaluationItemRating }[]>

// Rating value → number of filled segments (out of RATING_LEVELS), segment color, and
// text color. Uses the same data-tokens the Chip component uses — UI color only; labels
// come from useAppConstant. poor < pass < good, so the bar reads as a quality gauge.
const RATING_LEVELS = 3
const RATING_LEVEL: Record<string, number> = { poor: 1, pass: 2, good: 3 }
const RATING_FILL_CLASS: Record<string, string> = {
  good: 'bg-data-green-default',
  pass: 'bg-data-yellow-default',
  poor: 'bg-data-red-default',
}
const RATING_TEXT_CLASS: Record<string, string> = {
  good: 'text-data-green-default',
  pass: 'text-data-yellow-default',
  poor: 'text-data-red-default',
}

const RATING_COLUMN_WIDTH = 'w-28'

type ManagerLabelFn = (order: number) => string
type ManagerRating = { order: number; rating: ContractEvaluationItemRating }
type ManagerRatingsFn = (id: number) => ManagerRating[]

/** A rater column header: one per manager level present + the employee, if any. */
type RaterColumn =
  | { key: string; label: string; kind: 'nv' }
  | { key: string; label: string; kind: 'manager'; order: number }

type ContractEvaluationItemsFieldProps = {
  /**
   * Items from the API response — read-only. Populated by the backend from the
   * criteria dropdown when an evaluation is created (NV fills `employee_rating`).
   */
  items: ContractEvaluationItem[]
  /**
   * Per-item manager ratings derived from `manager_decisions[].manager_ratings`.
   * Indexed by `item_id`. Optional — omitted before any manager has rated.
   */
  ratingsByItem?: RatingsByItem
  /** Maps approver `order` → role enum (from `approvers[]`), used to label each column. */
  approverRoleByOrder?: Map<number, string>
}

/**
 * Read-only rendering of the criterion items, grouped by `(section, sub_section)`.
 * Ratings use a per-rater column table: one column per manager level that scored
 * (labeled by role, e.g. "Trưởng phòng") plus a "Nhân viên" column when the employee
 * self-rated. A column only appears when that rater has data in the group; cells with
 * no rating stay blank. Each rating is a 3-segment bar tinted by value (Kém = red,
 * Đạt = yellow, Tốt = green).
 */
const ContractEvaluationItemsField = ({
  items,
  ratingsByItem,
  approverRoleByOrder,
}: ContractEvaluationItemsFieldProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SECTION_CHOICES,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SUB_SECTION_CHOICES,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_ITEM_RATING,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_ROLE,
    ],
  })

  const sectionLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SECTION_CHOICES
  ) as Record<string, string> | undefined
  const subSectionLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SUB_SECTION_CHOICES
  ) as Record<string, string> | undefined
  const ratingLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_ITEM_RATING) as
    | Record<string, string>
    | undefined
  const roleLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_ROLE) as
    | Record<string, string>
    | undefined

  const managerLabel = useCallback<ManagerLabelFn>(
    (order) => {
      const role = approverRoleByOrder?.get(order)
      return (role && roleLabels?.[role]) || 'Quản lý'
    },
    [approverRoleByOrder, roleLabels]
  )

  const grouped = useMemo<GroupedEvaluationItems[]>(() => groupEvaluationItems(items), [items])

  const childItemsByParent = useMemo(() => buildChildItemsByParent(items), [items])

  const managerRatingsOf = useCallback<ManagerRatingsFn>(
    (id) => ratingsByItem?.get(id) ?? [],
    [ratingsByItem]
  )

  if (items.length === 0) {
    return (
      <div className="bg-background-2 text-content-dark-3 rounded-lg p-4 text-sm">
        Chưa có tiêu chí đánh giá nào.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped.map((group) => (
        <section key={group.section} className="flex flex-col gap-3">
          <h4 className="text-content-dark-2 typo-body-base-semibold flex items-center gap-2">
            <span className="bg-action-primary-red-default inline-block h-3.5 w-1 rounded-full" />
            {sectionLabels?.[group.section] ?? group.section}
          </h4>
          {group.subSections.map(({ subSection, items: groupItems }) => {
            // Every row in the group (parents + their sub-items) drives the columns.
            const rows = groupItems.flatMap((it) => [it, ...(childItemsByParent.get(it.id) ?? [])])
            const managerOrders = new Set<number>()
            let hasEmployeeRating = false
            for (const row of rows) {
              if (row.employee_rating) hasEmployeeRating = true
              for (const r of managerRatingsOf(row.id)) managerOrders.add(r.order)
            }
            // Columns: each manager level (by approval order) first, then "Nhân viên".
            const columns: RaterColumn[] = [
              ...Array.from(managerOrders)
                .sort((a, b) => a - b)
                .map((order) => ({
                  key: `m${order}`,
                  label: managerLabel(order),
                  kind: 'manager' as const,
                  order,
                })),
              ...(hasEmployeeRating
                ? [{ key: 'nv', label: 'Nhân viên', kind: 'nv' as const }]
                : []),
            ]

            return (
              <div key={subSection ?? '__flat__'} className="flex flex-col gap-1.5">
                {subSection && (
                  <h5 className="text-content-dark-3 pl-3 text-xs font-medium tracking-wide uppercase">
                    {subSectionLabels?.[subSection] ?? subSection}
                  </h5>
                )}
                <div className="border-border-1 bg-background-1 overflow-hidden rounded-lg border">
                  {columns.length > 0 && (
                    <div className="border-border-1 bg-background-2 flex items-center gap-4 border-b px-4 py-2">
                      <span className="flex-1" />
                      {columns.map((col) => (
                        <ColumnHeading key={col.key}>{col.label}</ColumnHeading>
                      ))}
                    </div>
                  )}
                  <ul className="divide-action-outline-default flex flex-col divide-y">
                    {groupItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        childItems={childItemsByParent.get(item.id) ?? []}
                        columns={columns}
                        ratingLabels={ratingLabels}
                        managerRatingsOf={managerRatingsOf}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function ColumnHeading({ children }: { children: string }) {
  return (
    <span
      className={cn(
        'text-content-dark-3 shrink-0 text-right text-[10px] font-semibold tracking-wide uppercase',
        RATING_COLUMN_WIDTH
      )}
    >
      {children}
    </span>
  )
}

/** A 3-segment level bar + the colored value word, sized to fit a rating column. */
function RatingMeter({
  rating,
  ratingLabels,
}: {
  rating: string
  ratingLabels?: Record<string, string>
}) {
  const level = RATING_LEVEL[rating] ?? 0
  const fillClass = RATING_FILL_CLASS[rating] ?? 'bg-content-dark-3'
  const textClass = RATING_TEXT_CLASS[rating] ?? 'text-content-dark-3'
  const label = ratingLabels?.[rating] ?? rating

  return (
    <div className="flex items-center justify-end gap-1.5" title={label}>
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: RATING_LEVELS }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 w-4 rounded-[2px] transition-colors',
              index < level ? fillClass : 'bg-data-light-grey-disabled'
            )}
          />
        ))}
      </div>
      <span className={cn('w-9 text-right text-xs font-semibold', textClass)}>{label}</span>
    </div>
  )
}

/** One rater column cell — the rating meter, or blank when that rater didn't score. */
function RatingCell({
  rating,
  ratingLabels,
}: {
  rating?: ContractEvaluationItemRating | null
  ratingLabels?: Record<string, string>
}) {
  return (
    <div className={cn('flex shrink-0 justify-end', RATING_COLUMN_WIDTH)}>
      {rating ? <RatingMeter rating={rating} ratingLabels={ratingLabels} /> : null}
    </div>
  )
}

function ratingForColumn(
  item: ContractEvaluationItem,
  column: RaterColumn,
  managerRatingsOf: ManagerRatingsFn
): ContractEvaluationItemRating | null {
  if (column.kind === 'nv') return item.employee_rating ?? null
  return managerRatingsOf(item.id).find((r) => r.order === column.order)?.rating ?? null
}

type ItemRowProps = {
  item: ContractEvaluationItem
  childItems: ContractEvaluationItem[]
  columns: RaterColumn[]
  ratingLabels?: Record<string, string>
  managerRatingsOf: ManagerRatingsFn
}

function ItemRow({ item, childItems, columns, ratingLabels, managerRatingsOf }: ItemRowProps) {
  const hasChildren = childItems.length > 0

  const cellsFor = (row: ContractEvaluationItem) =>
    columns.map((col) => (
      <RatingCell
        key={col.key}
        rating={ratingForColumn(row, col, managerRatingsOf)}
        ratingLabels={ratingLabels}
      />
    ))

  // Parent criterion (has sub-items): the manager scores the criterion overall (manager
  // columns); the employee lists & self-rates each declared sub-item (Nhân viên column).
  if (hasChildren) {
    return (
      <li className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-content-dark-1 min-w-0 flex-1 text-sm font-medium">
            {item.name}
          </span>
          {cellsFor(item)}
        </div>
        <ul className="border-border-1 ml-1 flex flex-col border-l-2 pl-4">
          {childItems.map((child) => (
            <li
              key={child.id}
              className="hover:bg-background-2 flex items-center gap-4 py-1.5 transition-colors"
            >
              <span className="text-content-dark-2 min-w-0 flex-1 text-sm">{child.name}</span>
              {cellsFor(child)}
            </li>
          ))}
        </ul>
      </li>
    )
  }

  // Leaf criterion.
  return (
    <li className="hover:bg-background-2 flex items-center gap-4 px-4 py-3 transition-colors">
      <span className="text-content-dark-1 min-w-0 flex-1 text-sm font-medium">{item.name}</span>
      {cellsFor(item)}
    </li>
  )
}

export default ContractEvaluationItemsField
