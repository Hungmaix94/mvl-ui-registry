import { useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants'
import { getDepartmentMonthlyKpiService } from '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service'
import type {
  DepartmentMonthlyKpi,
  GetDepartmentMonthlyKpisParams,
} from '@/features/accounting/department-monthly-kpi/types/department-monthly-kpi-types'

/** BE ép trần `page_size` = 100 dù client xin nhiều hơn — đo thật 24/08/2026: xin 200, trả 100. */
const SERVER_PAGE_CAP = 100

/**
 * Chặn vòng lặp chạy hoang nếu BE đổi cách phân trang. 20 trang = 2.000 phòng ban, gấp hơn 10 lần
 * quy mô hiện tại (169), nên chạm trần này nghĩa là có gì đó sai chứ không phải dữ liệu tăng.
 */
const MAX_PAGES = 20

/**
 * Lấy ĐỦ mọi trang KPI phòng ban của một kỳ.
 *
 * Vì sao không dùng thẳng `useDepartmentMonthlyKpis`: khối "Đạt chỉ tiêu" gộp phòng → khối, mà gộp
 * trên MỘT trang là ra số thấp hơn sự thật một cách im lặng — kỳ 08/2026 có 169 phòng, trang đầu
 * chỉ 100, và biểu đồ vẫn vẽ ra trông như đủ. Số thiếu ở dashboard điều hành thì không ai đối chiếu
 * được, nên thà tốn thêm một request còn hơn hiển thị sai.
 */
export function useAllDepartmentMonthlyKpis(params: GetDepartmentMonthlyKpisParams) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_MONTHLY_KPI.LIST({ ...params, __all: true }),
    async () => {
      const service = getDepartmentMonthlyKpiService()
      const rows: DepartmentMonthlyKpi[] = []
      let page = 1
      let count = 0

      while (page <= MAX_PAGES) {
        const res = await service.getDepartmentMonthlyKpis({
          ...params,
          page,
          page_size: SERVER_PAGE_CAP,
        })
        count = res?.count ?? 0
        rows.push(...((res?.results ?? []) as DepartmentMonthlyKpi[]))
        if (rows.length >= count || (res?.results ?? []).length === 0) break
        page += 1
      }

      // `isPartial` để khối tự thú nhận khi chưa gom đủ, thay vì vẽ ra một con số trông như tổng.
      return { rows, count, isPartial: rows.length < count }
    },
    { staleTime: 1000 * 60 * 5 }
  )
}
