import { useSalaryConfigCurrent } from '@/features/payroll/services/salary-config-service'
import { FullScreenLoading } from '@/components/Loading'
import * as TableComponents from '@radix-ui/themes'
import { cn, formatCurrencyVND } from '@/utils'
import { formatPercent } from '@/utils/common'

interface TaxLevel {
  level: number
  up_to: number | null
  rate: number
}

export function PersionalIncomeTaxTab() {
  const { data, isLoading } = useSalaryConfigCurrent()
  const personalIncomeTaxConfig = data?.config.personal_income_tax

  if (isLoading) {
    return <FullScreenLoading />
  }

  // Default values
  const standardDeduction = personalIncomeTaxConfig?.standard_deduction || 11000000
  const dependentDeduction = personalIncomeTaxConfig?.dependent_deduction || 4400000
  const minimumFlatTaxThreshold = personalIncomeTaxConfig?.minimum_flat_tax_threshold || 2000000

  const progressiveLevels: TaxLevel[] = personalIncomeTaxConfig?.progressive_levels?.map(
    (level: any, index: number) => ({
      level: index + 1,
      up_to: level.up_to,
      rate: level.rate,
    })
  ) || [
    { level: 1, up_to: 5000000, rate: 0.05 },
    { level: 2, up_to: 10000000, rate: 0.1 },
    { level: 3, up_to: 18000000, rate: 0.15 },
    { level: 4, up_to: 32000000, rate: 0.2 },
    { level: 5, up_to: 52000000, rate: 0.25 },
    { level: 6, up_to: 80000000, rate: 0.3 },
    { level: 7, up_to: null, rate: 0.35 },
  ]

  const formatTaxBracket = (level: TaxLevel, prevLimit: number | null) => {
    const prevAmount = prevLimit ? prevLimit / 1000000 : 0

    if (level.up_to === null) {
      return `> ${prevAmount} triệu`
    }

    const currentAmount = level.up_to / 1000000

    if (level.level === 1) {
      return `đến ${currentAmount} triệu`
    }

    return `> ${prevAmount} - ${currentAmount} triệu`
  }

  const formatCurrency = (value: number) => {
    return formatCurrencyVND(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="space-y-6 py-6">
      {/* Progressive Tax Table */}
      <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-background-2 border-border-1 sticky top-0 z-10 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                colSpan={3}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-b',
                  'text-center'
                )}
              >
                Biểu thuế luỹ tiến
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[15%]'
                )}
              >
                Bậc
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[55%]'
                )}
              >
                Thu nhập tính thuế/tháng (triệu đồng)
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 last:border-r-0',
                  'text-center',
                  'w-[30%]'
                )}
              >
                Thuế suất (%)
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            {progressiveLevels.map((level, index) => {
              const prevLimit = index > 0 ? progressiveLevels[index - 1].up_to : null
              return (
                <tr
                  key={level.level}
                  className={cn(
                    'border-border-1 border-b transition-colors',
                    'last:border-b-0',
                    'hover:bg-data-light-grey-hover',
                    index % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                  )}
                >
                  <td
                    className={cn(
                      'border-border-1 border-r px-3 py-[10px]',
                      'text-center',
                      'text-content-dark-1'
                    )}
                  >
                    {level.level}
                  </td>
                  <td
                    className={cn(
                      'border-border-1 border-r px-3 py-[10px]',
                      'text-center',
                      'text-content-dark-1'
                    )}
                  >
                    {formatTaxBracket(level, prevLimit)}
                  </td>
                  <td className={cn('px-3 py-[10px]', 'text-center', 'text-content-dark-1')}>
                    {formatPercent(level.rate, true)}
                  </td>
                </tr>
              )
            })}
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-background-2 border-border-1 sticky top-0 z-10 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-t',
                  'text-center'
                )}
              >
                Mức thu nhập tối thiểu khấu trừ 10%
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            <tr className="border-border-1 hover:bg-data-light-grey-hover border-b bg-white last:border-b-0">
              <td className={cn('px-3 py-[10px]', 'text-center', 'text-content-dark-1')}>
                {formatCurrency(minimumFlatTaxThreshold)} đ
              </td>
            </tr>
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-background-2 border-border-1 sticky top-0 z-10 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                colSpan={2}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-y',
                  'text-center'
                )}
              >
                Loại giảm trừ
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-1/2'
                )}
              >
                Giảm trừ bản thân
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 last:border-r-0',
                  'text-center',
                  'w-1/2'
                )}
              >
                Giảm trừ người phụ thuộc
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            <tr className="border-border-1 hover:bg-data-light-grey-hover border-b bg-white last:border-b-0">
              <td className={cn('px-3 py-[10px]', 'text-center', 'text-content-dark-1')}>
                {formatCurrency(standardDeduction)} đ/tháng
              </td>
              <td className={cn('px-3 py-[10px]', 'text-center', 'text-content-dark-1')}>
                {formatCurrency(dependentDeduction)} đ/người/tháng
              </td>
            </tr>
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}
