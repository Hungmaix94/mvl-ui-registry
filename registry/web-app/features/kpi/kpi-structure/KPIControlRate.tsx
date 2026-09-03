import { usePayrollKPIConfigCurrent } from '@/features/kpi/services/kpi-criteria-service'
import { FullScreenLoading } from '@/components/Loading'
import { formatNumber } from '@/utils/common'

export function KPIControlRate() {
  const { data: kpiConfig, isLoading } = usePayrollKPIConfigCurrent()

  if (isLoading) {
    return <FullScreenLoading />
  }

  const unitControl = kpiConfig?.config?.unit_control
  const threshold = unitControl?.small_department_threshold ?? 10

  const formatRate = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) {
      return { text: 'Không bắt buộc', optional: true }
    }
    return {
      text: `${formatNumber(value * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      optional: false,
    }
  }

  const formatSmallDepartmentRule = (
    rule: { order: string[]; description?: string } | undefined
  ) => {
    if (!rule || !rule.order || rule.order.length === 0) {
      return 'Không bắt buộc'
    }
    if (rule.description) {
      return rule.description
    }
    // Format order as ratio constraints: A <= B <= C
    return rule.order.join(' ≤ ')
  }

  const gradeDescriptions: Record<string, string> = {
    A: 'KPI A: Lấy Điểm cao nhất từ trên xuống ở mức xuất sắc',
    B: 'KPI B: Lấy Điểm từ cao xuống thấp ở mức xuất sắc, tốt',
    C: 'KPI C: Điểm từ cao xuống thấp ở mức khá hoặc trung bình',
    D: 'KPI D: Lấy Điểm cao nhất từ trên xuống ở mức trung bình hoặc yếu',
  }

  // Department grades (A, B, C, D)
  const departmentGrades = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-1 overflow-hidden rounded-md border">
        <table className="w-full border-collapse">
          <thead className="bg-neutral-20">
            <tr className="border-border-1 border-b">
              <th
                className="border-border-1 typo-body-base text-content-dark-2 w-[80px] border-r px-3 py-[10px] text-center"
                rowSpan={2}
              >
                STT
              </th>
              <th
                className="border-border-1 typo-body-base text-content-dark-2 border-r px-3 py-[10px] text-center"
                rowSpan={2}
              >
                KPI đơn vị
              </th>
              <th
                className="border-border-1 typo-body-base text-content-dark-2 border-r px-3 py-[10px] text-center"
                rowSpan={2}
              >
                Xếp loại
              </th>
              <th
                className="border-border-1 typo-body-base text-content-dark-2 border-r px-3 py-[10px] text-center"
                colSpan={2}
              >
                Tỉ lệ khống chế theo Tổng số lượng nhân sự (TNS)
              </th>
            </tr>
            <tr className="border-border-1 border-b">
              <th className="border-border-1 typo-body-base text-content-dark-2 w-1/4 border-r px-3 py-[10px] text-center">
                Tổng nhân sự đơn vị &gt;= {threshold} người
              </th>
              <th className="typo-body-base text-content-dark-2 w-1/4 px-3 py-[10px] text-center">
                Tổng nhân sự đơn vị &lt; {threshold} người
              </th>
            </tr>
          </thead>
          <tbody>
            {departmentGrades.map((deptGrade, index) => {
              const constraints = unitControl?.[deptGrade]
              const smallDeptRule = unitControl?.small_department_rules?.[deptGrade]

              const employeeGrades = [
                { label: 'A', maxRate: constraints?.A?.max, minRate: constraints?.A?.min },
                { label: 'B', maxRate: constraints?.B?.max, minRate: constraints?.B?.min },
                { label: 'C', targetRate: constraints?.C?.target },
                { label: 'D', minRate: constraints?.D?.min },
              ]

              return employeeGrades.map((grade, gradeIndex) => {
                const isFirstGradeRow = gradeIndex === 0
                const rowSpan = employeeGrades.length

                let displayText = 'Không bắt buộc'
                let displaySuffix = ''

                if (grade.label === 'C') {
                  const { text, optional } = formatRate(grade.targetRate)
                  if (optional) {
                    displayText = text
                  } else {
                    displayText = `≈ ${text}`
                    displaySuffix = ' tổng nhân sự'
                  }
                } else if (grade.maxRate !== null && grade.maxRate !== undefined) {
                  const { text, optional } = formatRate(grade.maxRate)
                  if (optional) {
                    displayText = text
                  } else {
                    displayText = `≤ ${text}`
                    displaySuffix = ' tổng nhân sự'
                  }
                } else if (grade.minRate !== null && grade.minRate !== undefined) {
                  const { text, optional } = formatRate(grade.minRate)
                  if (optional) {
                    displayText = text
                  } else {
                    displayText = `≥ ${text}`
                    displaySuffix = ' tổng nhân sự'
                  }
                }

                return (
                  <tr
                    key={`${deptGrade}-${grade.label}`}
                    className="border-border-1 border-b last:border-b-0"
                  >
                    {isFirstGradeRow && (
                      <>
                        <td
                          className="border-border-1 typo-body-base border-r px-3 py-3 text-center"
                          rowSpan={rowSpan}
                        >
                          {index + 1}
                        </td>
                        <td
                          className="border-border-1 typo-body-base border-r px-3 py-3 text-center"
                          rowSpan={rowSpan}
                        >
                          {deptGrade}
                        </td>
                      </>
                    )}
                    <td className="border-border-1 typo-body-base border-r px-3 py-3 text-center">
                      {gradeDescriptions[grade.label]}
                    </td>
                    <td className="border-border-1 typo-body-base border-r px-3 py-3 text-center">
                      {displayText}
                      {displaySuffix}
                    </td>
                    {isFirstGradeRow && (
                      <td className="typo-body-base px-3 py-3 text-center" rowSpan={rowSpan}>
                        {formatSmallDepartmentRule(smallDeptRule)}
                      </td>
                    )}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
