import { useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { Select } from '@/components/ui/select'
import { PAGE_SIZE } from '@/constants/table'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import { useAuth } from '@/store/auth-store'
import { useEmployeeMonthlyKpis } from '@/features/accounting/employee-monthly-kpi/services/employee-monthly-kpi-service'
import ProgressRowList, { type ProgressRow } from './ProgressRowList'

/**
 * "KPI từng nhân viên" — khối riêng của trưởng phòng kinh doanh.
 *
 * Vì sao cần khối riêng: các khối tổ chức khác dừng ở cấp PHÒNG BAN (`ORG_GROUP_OPTIONS` chỉ có
 * chi nhánh / khối / phòng ban). Trưởng phòng quản đúng một phòng, nên "phòng của tôi đạt 80%"
 * không đủ — họ cần biết ai đang kéo con số đó lên và ai đang kéo xuống.
 *
 * Mặc định chọn PHÒNG CỦA CHÍNH NGƯỜI ĐĂNG NHẬP, vẫn cho đổi sang phòng khác.
 *
 * ⚠️ Phải ép kiểu để lấy id: `schema.ts` khai `EmployeeSummary.department` là `string`, nhưng
 * `/api/me/` thật trả về object `{id, name, code}` (đo trên backend local 25/08/2026). Schema
 * đang lệch BE, nên đọc `.id` qua cast hẹp tại chỗ dùng thay vì tin kiểu sinh ra.
 * TODO(schema): bỏ cast sau khi `yarn api:update` sửa `EmployeeSummary.department`.
 *
 * ⚠️ Chưa xác định được phòng thì KHÔNG gọi API và KHÔNG lấy tất: BE chưa gắn data-scope cho
 * endpoint dashboard (plan BE Bước 2), nên "lấy tất" nghĩa là một trưởng phòng thấy KPI TOÀN
 * CÔNG TY. Thà bắt chọn tay còn hơn lộ số.
 */

/** Nhiều phòng có vài chục người; vẽ hết thì khối cao vống. Số còn lại nói ở dòng mô tả. */
const TOP_N = 12

type RawEmployeeKpi = {
  employee_detail?: { fullname?: string | null } | null
  business_target_amount?: string | null
  actual_revenue?: string | null
}

/**
 * `business_completion_pct` của BE bị chặn trần ở 99999.99 và làm tròn sẵn. Tính lại từ
 * target/actual để không thừa hưởng cái trần đó, và để hai cột số với thanh luôn khớp nhau.
 */
export function buildEmployeeKpiRows(rows: readonly RawEmployeeKpi[]): ProgressRow[] {
  return rows
    .map((r) => {
      const target = Number(r.business_target_amount) || 0
      const actual = Number(r.actual_revenue) || 0
      return {
        name: r.employee_detail?.fullname?.trim() || '(không tên)',
        target,
        actual,
        completionPct: target > 0 ? (actual / target) * 100 : null,
      }
    })
    .sort((a, b) => (b.completionPct ?? -1) - (a.completionPct ?? -1))
}

function EmployeeKpiBlock() {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { user } = useAuth()
  /** Xem cảnh báo TODO(schema) ở đầu file: kiểu sinh ra nói `string`, API thật trả object. */
  const ownDepartmentId =
    (user?.employee as unknown as { department?: { id?: number } } | null | undefined)?.department
      ?.id ?? null
  const [departmentId, setDepartmentId] = useState<number | null>(ownDepartmentId)

  const { loadDepartmentOptions, loadInitialDepartmentOptions } = useDepartmentSelect({
    pageSize: PAGE_SIZE,
  })

  const { data, isLoading } = useEmployeeMonthlyKpis(
    departmentId ? { year, month, department: departmentId, page_size: 100 } : undefined,
    { enabled: !!departmentId }
  )

  const allRows = useMemo(
    () => buildEmployeeKpiRows((data?.results ?? []) as RawEmployeeKpi[]),
    [data]
  )
  const rows = allRows.slice(0, TOP_N)
  const hiddenCount = allRows.length - rows.length

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear()
    return Array.from({ length: Math.max(1, currentYear - 2025 + 1) }, (_, i) => ({
      value: String(currentYear - i),
      label: `Năm ${currentYear - i}`,
    }))
  }, [now])

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` })),
    []
  )

  return (
    <div className="border-border-1 bg-background-1 flex h-full flex-col gap-3 rounded-lg border p-4">
      <Flex direction="column" align="start" gap="2">
        <Flex align="start" justify="between" gap="2" className="w-full">
          <Flex direction="column" align="start" gap="1">
            <h2 className="typo-body-lg-semibold text-content-dark-1">KPI từng nhân viên</h2>
            <p className="typo-body-sm text-content-dark-3">
              Doanh số thực tế so với chỉ tiêu cá nhân trong kỳ
              {hiddenCount > 0 && ` · hiện ${rows.length}/${allRows.length} người đạt cao nhất`}
            </p>
          </Flex>
          <Flex gap="2">
            <Select
              options={monthOptions}
              value={String(month)}
              onChange={(value) => setMonth(Number(value))}
              className="w-[124px]"
            />
            <Select
              options={yearOptions}
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
              className="w-[124px]"
            />
          </Flex>
        </Flex>
        <Select
          placeholder="Chọn phòng ban"
          enableSearch
          searchPlaceholder="Tìm kiếm phòng ban..."
          loadOptions={loadDepartmentOptions}
          loadInitialOptions={loadInitialDepartmentOptions}
          pageSize={PAGE_SIZE}
          value={departmentId ? String(departmentId) : ''}
          onChange={(next) => setDepartmentId(next ? Number(next) : null)}
          className="w-full"
        />
      </Flex>

      {!departmentId ? (
        <div className="text-content-dark-3 typo-body-sm flex h-[220px] items-center justify-center text-center">
          Chọn phòng ban để xem KPI từng nhân viên
        </div>
      ) : (
        <LoadingWrapper isLoading={isLoading}>
          {rows.length === 0 ? (
            <div className="text-content-dark-3 typo-body-sm flex h-[220px] items-center justify-center">
              Phòng này chưa có dữ liệu KPI cho kỳ đã chọn
            </div>
          ) : (
            <ProgressRowList rows={rows} />
          )}
        </LoadingWrapper>
      )}
    </div>
  )
}

export default EmployeeKpiBlock
