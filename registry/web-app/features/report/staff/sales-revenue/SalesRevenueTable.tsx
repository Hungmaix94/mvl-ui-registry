import { useMemo } from 'react'
import * as TableComponents from '@radix-ui/themes'
import type { SalesRevenueReportListItem } from '@/services'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'
import { Loading } from '@/components/Loading'

type SalesRevenueRow = {
  criteria: string
  [key: string]: string | number
}

type SalesRevenueTableProps = {
  data?: SalesRevenueReportListItem[]
  isLoading?: boolean
}

/**
 * Transform API response data into table format
 * Each field becomes a row, and each month becomes a column
 */
function transformSalesRevenueData(
  items: SalesRevenueReportListItem[] | undefined
): SalesRevenueRow[] {
  if (!items || items.length === 0) {
    return []
  }

  // Create a map to collect all field values across months
  const fieldMap = new Map<string, SalesRevenueRow>()

  // Field names mapping (Vietnamese labels from API to display labels)
  const fieldLabels: Record<string, string> = {
    target: 'Chỉ tiêu',
    total_revenue: 'Tổng doanh số',
    employee_count: 'Số NV có doanh số',
    total_sales_staff: 'Tổng số NVKD',
    revenue_achievement_rate: 'Tỷ lệ doanh thu so với chỉ tiêu (%)',
    employee_participation_rate: 'Tỷ lệ NV có doanh số (%)',
    avg_revenue_per_employee: 'Trung bình doanh thu của 1 NVKD',
    // Vietnamese field names from API
    'Chỉ tiêu KPI': 'Chỉ tiêu',
    'Tổng doanh thu': 'Tổng doanh số',
    'Nhân viên có doanh thu': 'Số NV có doanh số',
    'Tổng số nhân viên kinh doanh': 'Tổng số NVKD',
    'Doanh thu so với chỉ tiêu (%)': 'Tỷ lệ doanh thu so với chỉ tiêu (%)',
    'Tỷ lệ nhân viên có doanh thu (%)': 'Tỷ lệ NV có doanh số (%)',
    'Doanh thu trung bình mỗi nhân viên': 'Trung bình doanh thu của 1 NVKD',
  }

  // Process each month's data
  items.forEach((monthItem) => {
    const monthLabel = `Tháng ${monthItem.label}` // e.g., "Tháng 01/2025"

    monthItem.data.forEach((fieldValue) => {
      const fieldName = fieldValue.field
      const fieldLabel = fieldLabels[fieldName] || fieldName

      if (!fieldMap.has(fieldName)) {
        fieldMap.set(fieldName, {
          criteria: fieldLabel,
        })
      }

      const row = fieldMap.get(fieldName)!

      // Format value based on field type
      let formattedValue: string | number
      if (
        fieldName.includes('rate') ||
        fieldName.includes('(%)') ||
        fieldName === 'revenue_achievement_rate' ||
        fieldName === 'employee_participation_rate' ||
        fieldName === 'Doanh thu so với chỉ tiêu (%)' ||
        fieldName === 'Tỷ lệ nhân viên có doanh thu (%)'
      ) {
        // For percentage fields, keep as number with % suffix
        formattedValue = `${fieldValue.value.toFixed(0)}%`
      } else if (
        fieldName === 'employee_count' ||
        fieldName === 'total_sales_staff' ||
        fieldName === 'Nhân viên có doanh thu' ||
        fieldName === 'Tổng số nhân viên kinh doanh'
      ) {
        // For count fields, format as integer
        formattedValue = Math.round(fieldValue.value).toString()
      } else {
        // For revenue fields, format with thousand separators
        formattedValue = formatCurrencyVND(fieldValue.value)
      }

      row[monthLabel] = formattedValue
    })
  })

  // Convert map to array and maintain field order
  const orderedFields = [
    'target',
    'total_revenue',
    'employee_count',
    'total_sales_staff',
    'revenue_achievement_rate',
    'employee_participation_rate',
    'avg_revenue_per_employee',
    // Vietnamese field names
    'Chỉ tiêu KPI',
    'Tổng doanh thu',
    'Nhân viên có doanh thu',
    'Tổng số nhân viên kinh doanh',
    'Doanh thu so với chỉ tiêu (%)',
    'Tỷ lệ nhân viên có doanh thu (%)',
    'Doanh thu trung bình mỗi nhân viên',
  ]

  return orderedFields.filter((field) => fieldMap.has(field)).map((field) => fieldMap.get(field)!)
}

const SalesRevenueTable = ({ data = [], isLoading }: SalesRevenueTableProps) => {
  // Transform data
  const tableData = useMemo(() => {
    return transformSalesRevenueData(data)
  }, [data])

  // Get month labels
  const monthLabels = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((item) => `Tháng ${item.label}`)
  }, [data])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!data || data.length === 0 || tableData.length === 0) {
    return (
      <div className="border-border-1 bg-content-light-1 flex h-64 items-center justify-center border">
        <p className="text-content-dark-3">Không có dữ liệu</p>
      </div>
    )
  }

  return (
    <div className="border-border-1 bg-content-light-1 overflow-x-auto border">
      <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-sm">
        <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
          <TableComponents.Table.Row>
            <TableComponents.Table.ColumnHeaderCell
              className={cn(
                'text-content-dark-2 typo-body-base-semibold !shadow-none',
                'px-3 py-[10px]',
                'border-border-1 border-r',
                'text-left'
              )}
              style={{ width: '280px', minWidth: '280px' }}
            >
              Tiêu chí
            </TableComponents.Table.ColumnHeaderCell>
            {monthLabels.map((monthLabel, idx) => (
              <TableComponents.Table.ColumnHeaderCell
                key={idx}
                className={cn(
                  'text-content-dark-2 typo-body-base-semibold !shadow-none',
                  'px-3 py-[10px]',
                  'border-border-1',
                  idx < monthLabels.length - 1 ? 'border-r' : '',
                  'text-center'
                )}
                style={{ width: '150px', minWidth: '150px' }}
              >
                {monthLabel}
              </TableComponents.Table.ColumnHeaderCell>
            ))}
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>

        <TableComponents.Table.Body>
          {tableData.map((row, rowIdx) => (
            <TableComponents.Table.Row
              key={rowIdx}
              className={cn(
                'border-border-1 border-b transition-colors',
                'last:border-b-0',
                'hover:bg-data-light-grey-hover',
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-5'
              )}
            >
              <TableComponents.Table.Cell
                className={cn(
                  'border-border-1 border-r px-3 py-[10px]',
                  'text-content-dark-1 typo-body-base-medium',
                  'text-left'
                )}
              >
                {row.criteria}
              </TableComponents.Table.Cell>
              {monthLabels.map((monthLabel, idx) => (
                <TableComponents.Table.Cell
                  key={idx}
                  className={cn(
                    'border-border-1 px-3 py-[10px]',
                    idx < monthLabels.length - 1 ? 'border-r' : '',
                    'text-content-dark-1',
                    'text-right'
                  )}
                >
                  {row[monthLabel] ?? '-'}
                </TableComponents.Table.Cell>
              ))}
            </TableComponents.Table.Row>
          ))}
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}

export default SalesRevenueTable
