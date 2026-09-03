import { FullScreenLoading } from '@/components/Loading'
import { useSalaryConfigCurrent } from '@/features/payroll/services/salary-config-service'
import * as TableComponents from '@radix-ui/themes'
import { cn } from '@/utils'
import { formatPercent } from '@/utils/common'

interface KPITier {
  code: string
  percentage: number
  description: string
}

export function KPISalaryTab() {
  const { data, isLoading } = useSalaryConfigCurrent()
  const kpiSalaryConfig = data?.config.kpi_salary

  if (isLoading) {
    return <FullScreenLoading />
  }

  const tiers: KPITier[] = kpiSalaryConfig?.tiers || []

  return (
    <div className="space-y-6 py-8">
      <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-neutral-20 border-border-1 sticky top-0 z-10 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                  'px-4 py-[14px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-1/2'
                )}
              >
                Mức
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                  'px-4 py-[14px]',
                  'border-border-1 last:border-r-0',
                  'text-center',
                  'w-1/2'
                )}
              >
                Tỉ lệ thưởng bổ sung
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            {tiers.map((tier, index) => (
              <tr
                key={tier.code}
                className={cn(
                  'border-border-1 border-b transition-colors',
                  'last:border-b-0',
                  'hover:bg-data-light-grey-hover',
                  index % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
                )}
              >
                <td
                  className={cn(
                    'px-4 py-[14px]',
                    'text-center',
                    'border-border-1 border-r',
                    'text-content-dark-1',
                    'font-medium'
                  )}
                  style={{ verticalAlign: 'middle' }}
                >
                  {tier.code}
                </td>
                <td
                  className={cn(
                    'px-4 py-[14px]',
                    'text-center',
                    'text-content-dark-1',
                    'font-medium'
                  )}
                  style={{ verticalAlign: 'middle' }}
                >
                  {formatPercent(tier.percentage, true)}
                </td>
              </tr>
            ))}
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}
