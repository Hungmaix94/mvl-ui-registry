import { useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants'
import {
  getAdminDashboardService,
  type GetAdminDashboardTransactionsByProjectParams,
} from '@/features/sales/admin-dashboard/services/admin-dashboard-service'

/** Chặn vòng lặp chạy hoang nếu BE đổi phân trang. 30 trang ≫ quy mô hiện tại (38 dự án). */
const MAX_PAGES = 30

type ProjectRow = {
  project?: { id?: number; name?: string } | null
  deal_count?: number
  revenue_amount?: string | null
}

/**
 * Gom ĐỦ mọi trang "giao dịch theo dự án".
 *
 * Bắt buộc với biểu đồ Pareto: "% lũy kế" và câu "Top 3 chiếm 78% doanh thu" phải tính trên TỔNG
 * toàn kỳ. Tính trên một trang thì mẫu số nhỏ đi, mọi tỷ lệ phồng lên, mà biểu đồ vẫn vẽ ra bình
 * thường — đúng loại sai im lặng mà commit lollipop của `PerformanceByOrgChart` đã cảnh báo khi nó
 * phải ghi rõ phạm vi "trang này".
 *
 * Endpoint không nhận `page_size` (server tự quyết), nên chỉ còn cách lật trang.
 */
export function useAllTransactionsByProject(params?: GetAdminDashboardTransactionsByProjectParams) {
  return useApiQuery(
    QUERY_KEYS.SALES.ADMIN_DASHBOARD.TRANSACTIONS_BY_PROJECT({ ...(params ?? {}), __all: true }),
    async () => {
      const service = getAdminDashboardService()
      const rows: ProjectRow[] = []
      let page = 1
      let count = 0

      while (page <= MAX_PAGES) {
        const res = await service.getTransactionsByProject({ ...params, page })
        count = res?.count ?? 0
        const batch = (res?.results ?? []) as ProjectRow[]
        rows.push(...batch)
        if (rows.length >= count || batch.length === 0) break
        page += 1
      }

      return { rows, count, isPartial: rows.length < count }
    },
    { staleTime: 1000 * 60 * 5 }
  )
}
