import type { AttendanceProjectReportAggregration } from '@/features/report/services/attendance-report-service'

/**
 * Column header labels shared between the on-screen table and the Excel export
 * so the two surfaces never drift apart.
 */
export const ATTENDANCE_PROJECT_REPORT_HEADERS = {
  STT: 'STT',
  PROJECT: 'Dự án',
  // Nhãn cột "lượt check-in" thứ nhất đổi theo khoảng lọc:
  // - Lọc đúng 1 ngày → chỉ 1 cột, số là thực tế của ngày đó → SINGLE_DAY_CHECKIN.
  // - Lọc nhiều ngày → 2 cột, cột này là trung bình/ngày → AVG_CHECKIN.
  SINGLE_DAY_CHECKIN: 'Số lượt check-in',
  AVG_CHECKIN: 'Số lượt check-in trung bình/ngày',
  TOTAL_CHECKIN: 'Tổng số lượt check-in',
} as const

export type AttendanceProjectReportRowKind = 'project' | 'average' | 'total'

export type AttendanceProjectReportRow = {
  id: string
  kind: AttendanceProjectReportRowKind
  stt: number | string
  /** Full display label for non-link contexts (export, plain fallback). */
  label: string
  /** Raw project id — present for every project row (used for detail link + drill-down). */
  projectId?: number
  /** Project code — the clickable portion; present only when the row also has a name. */
  projectCode?: string
  /** Project name portion rendered after the code link. */
  projectName?: string
  count: number
  totalCount: number
}

/**
 * Builds the human-readable project label, preserving the legacy behaviour where
 * the code is only shown alongside a name (name-less rows collapse to "-").
 */
function formatProjectLabel(code?: string | null, name?: string | null): string {
  if (!name) return '-'
  return code ? `${code} - ${name}` : name
}

/**
 * Maps the by-project attendance report aggregate into flat display rows:
 * one row per project, then an "Trung bình" (average) row, then a "Tổng" (total)
 * row. All numeric values are mapped straight from the API (no client-side
 * recomputation). Consumed by both the table view and the Excel export.
 */
export function buildAttendanceProjectReportRows(
  report: AttendanceProjectReportAggregration | undefined
): AttendanceProjectReportRow[] {
  const items = report?.projects ?? []

  const projectRows: AttendanceProjectReportRow[] = items.map((item, index) => {
    const projectId = item.project?.id
    const code = item.project?.code
    const name = item.project?.name
    const hasName = Boolean(name)

    return {
      id: `project-${projectId ?? index}`,
      kind: 'project',
      stt: index + 1,
      label: formatProjectLabel(code, name),
      projectId: projectId ?? undefined,
      projectCode: hasName && code ? code : undefined,
      projectName: hasName ? (name ?? undefined) : undefined,
      count: item.count ?? 0,
      totalCount: item.total_count ?? 0,
    }
  })

  // Dòng "Trung bình" nằm ngay phía trên dòng "Tổng"; map trực tiếp từ API
  // (avg_total = TB cột trung bình, avg_total_count = tổng check-in / số dự án).
  const averageRow: AttendanceProjectReportRow = {
    id: 'average',
    kind: 'average',
    stt: '',
    label: 'Trung bình',
    count: report?.avg_total ?? 0,
    totalCount: report?.avg_total_count ?? 0,
  }

  const totalRow: AttendanceProjectReportRow = {
    id: 'total',
    kind: 'total',
    stt: '',
    label: 'Tổng',
    count: report?.total ?? 0,
    totalCount: report?.total_count ?? 0,
  }

  return [...projectRows, averageRow, totalRow]
}
