import { useSalaryConfigCurrent } from '@/features/payroll/services/salary-config-service'
import { FullScreenLoading } from '@/components/Loading'
import * as TableComponents from '@radix-ui/themes'
import { cn } from '@/utils'
import { formatPercent } from '@/utils/common'

interface InsuranceType {
  key: string
  name: string
  employee_rate: number | undefined
  employer_rate: number | undefined
  salary_ceiling: number | undefined
}

export function SocialInsuranceTab() {
  const { data, isLoading } = useSalaryConfigCurrent()

  const socialInsuranceConfig = data?.config?.insurance_contributions

  if (isLoading) {
    return <FullScreenLoading />
  }

  const insuranceData: InsuranceType[] = [
    {
      key: 'social_insurance',
      name: 'Bảo hiểm xã hội',
      employee_rate: socialInsuranceConfig?.social_insurance?.employee_rate,
      employer_rate: socialInsuranceConfig?.social_insurance?.employer_rate,
      salary_ceiling: socialInsuranceConfig?.social_insurance?.salary_ceiling,
    },
    {
      key: 'health_insurance',
      name: 'Bảo hiểm y tế',
      employee_rate: socialInsuranceConfig?.health_insurance?.employee_rate,
      employer_rate: socialInsuranceConfig?.health_insurance?.employer_rate,
      salary_ceiling: socialInsuranceConfig?.health_insurance?.salary_ceiling,
    },
    {
      key: 'accident_occupational_insurance',
      name: 'Bảo hiểm tai nạn lao động - Bệnh nghề nghiệp',
      employee_rate: socialInsuranceConfig?.accident_occupational_insurance?.employee_rate,
      employer_rate: socialInsuranceConfig?.accident_occupational_insurance?.employer_rate,
      salary_ceiling: socialInsuranceConfig?.accident_occupational_insurance?.salary_ceiling,
    },
    {
      key: 'unemployment_insurance',
      name: 'Bảo hiểm thất nghiệp',
      employee_rate: socialInsuranceConfig?.unemployment_insurance?.employee_rate,
      employer_rate: socialInsuranceConfig?.unemployment_insurance?.employer_rate,
      salary_ceiling: socialInsuranceConfig?.unemployment_insurance?.salary_ceiling,
    },
    {
      key: 'union_fee',
      name: 'Đoàn phí Công đoàn',
      employee_rate: socialInsuranceConfig?.union_fee?.employee_rate,
      employer_rate: socialInsuranceConfig?.union_fee?.employer_rate,
      salary_ceiling: socialInsuranceConfig?.union_fee?.salary_ceiling,
    },
  ]

  return (
    <div className="py-6">
      <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
        <TableComponents.Table.Root layout="fixed" className="w-full text-sm">
          {/* Table Header */}
          <TableComponents.Table.Header className="bg-neutral-20 border-border-1 sticky top-0 z-10 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-left',
                  'w-[40%]'
                )}
              >
                Thông tin
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[20%]'
                )}
              >
                Trích từ doanh nghiệp
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className={cn(
                  'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1 border-r',
                  'text-center',
                  'w-[20%]'
                )}
              >
                Trích từ lương người lao động
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Header>

          {/* Table Body */}
          <TableComponents.Table.Body>
            {insuranceData.map((item, index) => (
              <tr
                key={item.key}
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
                    'break-words whitespace-normal',
                    'text-left'
                  )}
                >
                  <span className="text-content-dark-1">{item.name}</span>
                </td>
                <td
                  className={cn(
                    'border-border-1 border-r px-3 py-[10px]',
                    'text-center',
                    'text-content-dark-1'
                  )}
                >
                  {item.employer_rate !== undefined ? formatPercent(item.employer_rate, true) : '-'}
                </td>
                <td
                  className={cn(
                    'border-border-1 px-3 py-[10px]',
                    'text-center',
                    'text-content-dark-1'
                  )}
                >
                  {item.employee_rate !== undefined
                    ? `${formatPercent(item.employee_rate, true)}`
                    : '-'}
                </td>
              </tr>
            ))}
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}
