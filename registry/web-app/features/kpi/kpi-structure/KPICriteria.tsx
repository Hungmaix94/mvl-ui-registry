import { usePayrollKPIConfigCurrent } from '@/features/kpi/services/kpi-criteria-service'
import { FullScreenLoading } from '@/components/Loading'

export function KPICriteria() {
  const { data: kpiConfig, isLoading } = usePayrollKPIConfigCurrent()

  if (isLoading) {
    return <FullScreenLoading />
  }

  const gradeThresholds = kpiConfig?.config?.grade_thresholds || []

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-1 overflow-hidden rounded-md border">
        <table className="w-full border-collapse">
          <thead className="bg-neutral-20">
            <tr className="border-border-1 border-b">
              <th className="border-border-1 typo-body-base text-content-dark-2 w-[80px] border-r p-3 text-center">
                STT
              </th>
              <th className="border-border-1 typo-body-base text-content-dark-2 border-r p-3 text-left">
                Mức độ hoàn thành nhiệm vụ/công việc
              </th>
              <th className="border-border-1 typo-body-base text-content-dark-2 border-r p-3 text-center">
                Điểm đánh giá tháng Đ<sub>thang</sub> (%)
              </th>
              <th className="typo-body-base text-content-dark-2 p-3 text-center">
                Trích từ lương người lao động
              </th>
            </tr>
          </thead>
          <tbody>
            {gradeThresholds.map((threshold, index) => (
              <tr key={index} className="border-border-1 border-b last:border-b-0">
                <td className="border-border-1 typo-body-base border-r px-3 py-[10px] text-center">
                  {index + 1}
                </td>
                <td className="border-border-1 typo-body-base border-r px-3 py-[10px]">
                  {threshold.label || threshold.default_code || threshold.possible_codes.join(', ')}
                </td>
                <td className="border-border-1 typo-body-base border-r px-3 py-[10px] text-center">
                  {threshold.min !== undefined && threshold.max !== undefined ? (
                    <>
                      {threshold.min === 0 ? '' : `${threshold.min}% <`} Đ<sub>thang</sub> (%){' '}
                      {`< ${threshold.max}%`}
                    </>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="typo-body-base px-3 py-[10px] text-center">
                  {threshold.possible_codes.length > 0
                    ? `Xếp loại ${threshold.possible_codes.join(' hoặc ')}`
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
