import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Table } from '@radix-ui/themes'
import { TBCManagementRateRole } from '@/api/schema'
import { FullCellNumberInput } from '@/components/commons'
import { MANAGEMENT_ROLES, TbcManagementFormValues } from './SaleAllocationTbcManagementForm'
import { RATE_COLUMNS, cellIndex } from './tbc-management-helpers'

type Props = {
  isReadOnly?: boolean
}

export function TBCManagementRateTable({ isReadOnly = false }: Props) {
  return (
    <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
      <div className="overflow-x-auto">
        <Table.Root className="w-full border-collapse bg-white text-left outline-none">
          <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
            <Table.Row>
              <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                Chức vụ
              </Table.ColumnHeaderCell>
              {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => (
                <Table.ColumnHeaderCell
                  key={col.category}
                  className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-3 py-3 text-center align-middle last:border-r-0"
                >
                  {col.label}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {MANAGEMENT_ROLES.flatMap((role, roleIdx) => {
              const isSecretary = role.value === TBCManagementRateRole.project_secretary
              const rows = [
                <Table.Row
                  key={role.value}
                  className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                >
                  <Table.Cell className="border-border-1 typo-body-base-medium text-content-dark-1 border-r px-4 py-2 align-middle font-medium">
                    {role.label}
                  </Table.Cell>
                  {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => {
                    const catIdx = RATE_COLUMNS.indexOf(col)
                    return (
                      <Table.Cell
                        key={col.category}
                        className="border-border-1 typo-body-base-regular h-full border-r bg-white !p-0 align-top last:border-r-0"
                      >
                        <RateCell
                          index={cellIndex(roleIdx, catIdx)}
                          pctOnly={col.pctOnly}
                          isReadOnly={isReadOnly}
                        />
                      </Table.Cell>
                    )
                  })}
                </Table.Row>,
              ]
              if (isSecretary) {
                rows.push(
                  <Table.Row
                    key={`${role.value}-role-total`}
                    className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                  >
                    <Table.Cell className="border-border-1 typo-body-base-regular text-content-dark-3 border-r py-2 pr-4 pl-8 align-middle">
                      └ Tổng vị trí (cả phòng TK Dự án)
                    </Table.Cell>
                    {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => {
                      const catIdx = RATE_COLUMNS.indexOf(col)
                      return (
                        <Table.Cell
                          key={col.category}
                          className="border-border-1 typo-body-base-regular h-full border-r bg-white !p-0 align-top last:border-r-0"
                        >
                          {/* Carve is configurable on every management category, not just
                              agency_fee — the accountant's secretary rate now sits on the
                              bonus categories too. RoleTotalCell stays disabled until the
                              cell's own pct is filled, matching the backend constraint. */}
                          <RoleTotalCell
                            index={cellIndex(roleIdx, catIdx)}
                            isReadOnly={isReadOnly}
                          />
                        </Table.Cell>
                      )
                    })}
                  </Table.Row>
                )
              }
              return rows
            })}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  )
}

function RoleTotalCell({ index, isReadOnly }: { index: number; isReadOnly?: boolean }) {
  const { control, watch } = useFormContext<TbcManagementFormValues>()
  const pctValue = watch(`rates.${index}.pct`)
  const totalValue = watch(`rates.${index}.pct_role_total`)

  const deptPct =
    totalValue != null && pctValue != null
      ? Number((Number(totalValue) - Number(pctValue)).toFixed(3))
      : null

  return (
    <div className="hover:ring-neutral-80 relative flex h-full w-full min-w-[150px] flex-col justify-center transition-colors ring-inset focus-within:ring-1 focus-within:ring-neutral-100 hover:ring-1">
      <div className="flex w-full items-center">
        <Controller
          name={`rates.${index}.pct_role_total` as any}
          control={control}
          render={({ field }) => (
            <FullCellNumberInput
              value={field.value as number | undefined}
              onChange={field.onChange}
              disabled={isReadOnly || pctValue == null}
              variant="ghost"
              suffix="%"
              max={100}
              className="rounded-none border-none pr-8 text-right shadow-none hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={pctValue == null ? 'Nhập tỉ lệ cá nhân trước' : '0'}
            />
          )}
        />
      </div>
      {deptPct != null && (
        <div
          className={`px-3 pb-1 text-right text-xs ${deptPct < 0 ? 'text-data-red-default' : 'text-content-dark-3'}`}
        >
          {deptPct < 0 ? 'Tổng phải ≥ tỉ lệ cá nhân' : `Về phòng: ${deptPct}%`}
        </div>
      )}
    </div>
  )
}

function RateCell({
  index,
  pctOnly,
  isReadOnly,
}: {
  index: number
  pctOnly: boolean
  isReadOnly?: boolean
}) {
  const { control, watch, setValue } = useFormContext<TbcManagementFormValues>()
  const amtValue = watch(`rates.${index}.amt`)
  const [type, setType] = useState<'pct' | 'amt'>(amtValue != null ? 'amt' : 'pct')

  const handleToggle = () => {
    if (isReadOnly || pctOnly) return
    if (type === 'pct') {
      setValue(`rates.${index}.pct`, null, { shouldDirty: true, shouldValidate: true })
      setType('amt')
    } else {
      setValue(`rates.${index}.amt`, null, { shouldDirty: true, shouldValidate: true })
      setType('pct')
    }
  }

  const isPct = pctOnly || type === 'pct'
  const name = isPct ? `rates.${index}.pct` : `rates.${index}.amt`

  return (
    <div className="hover:ring-neutral-80 relative flex h-full w-full min-w-[150px] items-center transition-colors ring-inset focus-within:ring-1 focus-within:ring-neutral-100 hover:ring-1">
      <Controller
        name={name as any}
        control={control}
        render={({ field }) => (
          <FullCellNumberInput
            value={field.value as number | undefined}
            onChange={field.onChange}
            disabled={isReadOnly}
            variant="ghost"
            suffix={isReadOnly ? (isPct ? '%' : 'VNĐ') : ''}
            max={isPct ? 100 : Number.MAX_SAFE_INTEGER}
            className={`rounded-none border-none text-right shadow-none hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isReadOnly ? (isPct ? 'pr-8' : 'pr-12') : 'pr-3'
            }`}
            placeholder="0"
          />
        )}
      />
      {!isReadOnly && (
        <button
          type="button"
          tabIndex={-1}
          disabled={pctOnly}
          onClick={handleToggle}
          className={`typo-body-base-regular ml-1 min-w-[48px] border-l pr-2 pl-2 focus:outline-none ${
            pctOnly
              ? 'cursor-not-allowed text-gray-400'
              : 'cursor-pointer text-blue-500 hover:text-blue-700'
          }`}
        >
          {isPct ? '%' : 'VNĐ'}
        </button>
      )}
    </div>
  )
}
