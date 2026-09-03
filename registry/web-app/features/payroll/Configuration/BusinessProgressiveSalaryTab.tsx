import { FullScreenLoading } from '@/components/Loading'
import { useSalaryConfigCurrent } from '@/features/payroll/services/salary-config-service'
import * as TableComponents from '@radix-ui/themes'
import { cn, formatCurrencyVND } from '@/utils'

interface Criteria {
  name: string
  min: number
}

interface Tier {
  code: string
  amount: number
  criteria: Criteria[]
}

export function BusinessProgressiveSalaryTab() {
  const { data, isLoading } = useSalaryConfigCurrent()
  const businessProgressiveSalaryConfig = data?.config.business_progressive_salary

  if (isLoading) {
    return <FullScreenLoading />
  }

  const tiers: Tier[] = businessProgressiveSalaryConfig?.tiers || [
    {
      code: 'M0',
      amount: 0,
      criteria: [
        { name: 'transaction_count', min: 1 },
        { name: 'revenue', min: 50000000 },
      ],
    },
    {
      code: 'M1',
      amount: 7000000,
      criteria: [
        { name: 'transaction_count', min: 2 },
        { name: 'revenue', min: 200000000 },
      ],
    },
    {
      code: 'M2',
      amount: 9000000,
      criteria: [
        { name: 'transaction_count', min: 3 },
        { name: 'revenue', min: 300000000 },
      ],
    },
    {
      code: 'M3',
      amount: 11000000,
      criteria: [
        { name: 'transaction_count', min: 4 },
        { name: 'revenue', min: 400000000 },
      ],
    },
    {
      code: 'M4',
      amount: 13000000,
      criteria: [
        { name: 'transaction_count', min: 5 },
        { name: 'revenue', min: 500000000 },
      ],
    },
  ]

  const getCriteriaDescription = (tier: Tier): string => {
    const criteria = tier.criteria
    const transactionCount = criteria.find((c) => c.name === 'transaction_count')?.min || 0
    const revenue = criteria.find((c) => c.name === 'revenue')?.min || 0

    return `${transactionCount} giao dịch và doanh thu từ ${formatCurrency(revenue)}`
  }

  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(0)} tỷ đồng`
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)} triệu đồng`
    }
    return `${value}`
  }

  const formatSalary = (value: number): string => {
    return formatCurrencyVND(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="space-y-6 py-8">
      <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-neutral-20 border-border-1 sticky top-0 z-10 border-b">
            {/* First header row */}
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                rowSpan={2}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-4 py-[14px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[20%]'
                )}
                style={{ verticalAlign: 'middle' }}
              >
                Đối tượng
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                rowSpan={2}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-4 py-[14px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[20%]'
                )}
                style={{ verticalAlign: 'middle' }}
              >
                Tiêu chí
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                colSpan={tiers.length}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-4 py-[14px]',
                  'border-border-1 border-b',
                  'text-center',
                  'w-[70%]'
                )}
              >
                Mức lương (VNĐ/Tháng)
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>

            {/* Second header row with tier codes */}
            <TableComponents.Table.Row>
              {tiers.map((tier) => (
                <TableComponents.Table.ColumnHeaderCell
                  key={tier.code}
                  className={cn(
                    'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                    'px-4 py-[14px]',
                    'border-border-1 border-r',
                    'text-center align-middle',
                    `w-[${70 / tiers.length}%]`
                  )}
                >
                  {tier.code}
                </TableComponents.Table.ColumnHeaderCell>
              ))}
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            {/* Criteria row */}
            <tr className="border-border-1 hover:bg-data-light-grey-hover border-b bg-white">
              <td
                rowSpan={2}
                className={cn(
                  'px-4 py-[14px]',
                  'text-center',
                  'border-border-1 border-r',
                  'text-content-dark-1',
                  'font-medium'
                )}
                style={{ verticalAlign: 'middle' }}
              >
                NVKD
              </td>
              <td
                className={cn(
                  'px-3 py-[27px]',
                  'text-center',
                  'border-border-1 border-r',
                  'text-content-dark-1',
                  'bg-neutral-5'
                )}
                style={{ verticalAlign: 'middle' }}
              >
                Tổng DS và giao dịch/tháng
              </td>
              {tiers.map((tier) => (
                <td
                  key={`${tier.code}-criteria`}
                  className={cn(
                    'px-3 py-[27px]',
                    'text-center',
                    'border-border-1 border-r',
                    'text-content-dark-1',
                    'text-sm',
                    'bg-neutral-5'
                  )}
                  style={{ verticalAlign: 'middle' }}
                >
                  {getCriteriaDescription(tier)}
                </td>
              ))}
            </tr>

            {/* Salary row */}
            <tr className="border-border-1 hover:bg-data-light-grey-hover border-b bg-white last:border-b-0">
              <td
                className={cn(
                  'px-3 py-9',
                  'text-center',
                  'border-border-1 border-r',
                  'text-content-dark-1'
                )}
                style={{ verticalAlign: 'middle' }}
              >
                Mức lương
              </td>
              {tiers.map((tier) => (
                <td
                  key={`${tier.code}-salary`}
                  className={cn(
                    'px-3 py-9',
                    'text-center',
                    'border-border-1 border-r',
                    'text-content-dark-1',
                    'font-medium'
                  )}
                  style={{ verticalAlign: 'middle' }}
                >
                  {formatSalary(tier.amount)}
                </td>
              ))}
            </tr>
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}
