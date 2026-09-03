import { useMemo, type RefObject } from 'react'
import { TableTree } from '@/components/ui/table-tree/TableTree'
import type { ReferralCostReportAggregated } from '@/features/report/services/hrm-report-service'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'
import { formatCurrencyVND } from '@/utils/common'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatDate } from '@/utils/date-utils'

type ReferralRow = {
  id: string
  level: 1 | 2
  stt?: number
  employeeCode?: string
  employeeName?: string
  startDate?: string
  status?: string
  resignationDate?: string
  position?: string
  branch?: string
  block?: string
  department?: string
  employeeType?: string
  contactCode?: string
  contactName?: string
  contactDepartment?: string
  source?: string
  channel?: string
  experience?: string
  bonus?: string
  groupName?: string
  isSummary?: boolean
}

type ReportRecruitmentReferralTableProps = {
  data?: ReferralCostReportAggregated
  isLoading: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function buildColumns(
  employeeTypeMapping: Record<string, string>,
  employeeStatusMapping: Record<string, string>,
  employeesExperienceMapping: Record<string, string>
) {
  const cols: any[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.stt ?? '-'
      },
      meta: { frozen: true, width: '80px', align: 'center' },
    },
    {
      id: 'employeeCode',
      header: 'Mã nhân viên',
      cell: (row: ReferralRow) => (row.level === 1 ? row.groupName : (row.employeeCode ?? '-')),
      meta: {
        frozen: true,
        width: '150px',
        align: 'left',
        colspanWidth: 'fit-content',
      },
    },
    {
      id: 'employeeName',
      header: 'Tên nhân viên',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.employeeName ?? '-'
      },
      meta: { frozen: true, width: '250px', align: 'left' },
    },
    {
      id: 'startDate',
      header: 'Ngày vào làm',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.startDate ? format(new Date(row.startDate), DATE_FORMAT) : '-'
      },
      meta: { width: '150px', align: 'center' },
    },
    {
      id: 'status',
      header: 'Tình trạng',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return employeeStatusMapping[row.status || ''] ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'resignationDate',
      header: 'Ngày nghỉ việc',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.resignationDate ? formatDate(row.resignationDate) : '-'
      },
      meta: { width: '150px', align: 'center' },
    },
    {
      id: 'position',
      header: 'Chức vụ',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.position ?? '-'
      },
      meta: { width: '200px', align: 'left' },
    },
    {
      id: 'branch',
      header: 'Chi nhánh',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.branch ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'block',
      header: 'Khối',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.block ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'department',
      header: 'Phòng ban',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.department ?? '-'
      },
      meta: { width: '200px', align: 'left' },
    },
    {
      id: 'employeeType',
      header: 'Loại nhân viên',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return employeeTypeMapping[row?.employeeType || ''] ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'contactCode',
      header: 'Mã nhân viên người liên hệ',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.contactCode ?? '-'
      },
      meta: { width: '200px', align: 'left' },
    },
    {
      id: 'contactName',
      header: 'Người liên hệ',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.contactName ?? '-'
      },
      meta: { width: '200px', align: 'left' },
    },
    {
      id: 'contactDepartment',
      header: 'Phòng ban người liên hệ',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.contactDepartment ?? '-'
      },
      meta: { width: '200px', align: 'left' },
    },
    {
      id: 'source',
      header: 'Nguồn tuyển dụng',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.source ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'channel',
      header: 'Kênh tuyển dụng',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return row.channel ?? '-'
      },
      meta: { width: '150px', align: 'left' },
    },
    {
      id: 'experience',
      header: 'Kinh nghiệm',
      cell: (row: ReferralRow) => {
        if (row.level === 1) return ''
        if ((row as any).isSummary) return ''
        return employeesExperienceMapping[row.experience || ''] ?? '-'
      },
      meta: { width: '120px', align: 'left' },
    },
    {
      id: 'bonus',
      header: 'Tiền thưởng',
      cell: (row: ReferralRow) => (row.level === 1 ? '' : formatCurrencyVND(row.bonus ?? '')),
      meta: { width: '200px', align: 'right' },
    },
  ]

  return cols
}

function buildReferralRows(
  data: ReferralCostReportAggregated['data'],
  summaryTotal: string
): ReferralRow[] {
  const rows: ReferralRow[] = []

  // Iterate through each department
  data.forEach((dept) => {
    // Add group header row (level 1)
    rows.push({
      id: `group-${dept.name}`,
      level: 1,
      groupName: dept.name,
      stt: undefined,
      employeeCode: undefined,
      employeeName: undefined,
      startDate: undefined,
      status: undefined,
      resignationDate: undefined,
      position: undefined,
      branch: undefined,
      block: undefined,
      department: undefined,
      employeeType: undefined,
      contactCode: undefined,
      contactName: undefined,
      contactDepartment: undefined,
      source: undefined,
      channel: undefined,
      experience: undefined,
      bonus: undefined,
    })

    // Add data rows for this department - reset STT for each group
    let groupStt = 1
    dept.items.forEach((item) => {
      rows.push({
        id: `item-${item.id}`,
        level: 2,
        stt: groupStt++,
        employeeCode: item.referee.code,
        employeeName: item.referee.fullname,
        startDate: item.referee.start_date,
        status: item.referee.colored_status?.value,
        resignationDate: item.referee.resignation_start_date || undefined,
        position: item.referee.position?.name,
        branch: item.referee.branch?.name,
        block: item.referee.block?.name,
        department: item.referee.department?.name,
        employeeType: item.referee.employee_type || undefined,
        contactCode: item.referrer.code,
        contactName: item.referrer.fullname,
        contactDepartment: item.referrer.department?.name,
        source: item.recruitment_source.name,
        channel: item.recruitment_channel.name,
        experience: item.referee?.recruitment_candidate?.years_of_experience || '',
        bonus: item.total_cost,
      })
    })
  })

  // Add summary row at the end
  rows.push({
    id: 'summary',
    level: 2,
    isSummary: true,
    stt: undefined,
    employeeCode: 'Tổng',
    employeeName: undefined,
    startDate: undefined,
    status: undefined,
    resignationDate: undefined,
    position: undefined,
    branch: undefined,
    block: undefined,
    department: undefined,
    employeeType: undefined,
    contactCode: undefined,
    contactName: undefined,
    contactDepartment: undefined,
    source: undefined,
    channel: undefined,
    experience: undefined,
    bonus: summaryTotal,
  })

  return rows
}

const ReportRecruitmentReferralTable = ({
  data,
  isLoading,
  scrollContainerRef,
}: ReportRecruitmentReferralTableProps) => {
  // Map source_type -> label via constants (hrm module)
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE,
      APP_CONSTANT_KEY.EMPLOYEE.STATUS,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE,
    ],
  })

  const employeeTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE) as Record<string, string> | null) || {}
      : {}
  }, [keysMap])
  const employeeStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.EMPLOYEE.STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) as Record<string, string> | null) || {}
      : {}
  }, [keysMap])
  const employeesExperienceMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE) || {}
      : {}
  }, [keysMap])

  const departments = useMemo(() => data?.data || [], [data?.data])
  const summaryTotal = useMemo(() => data?.summary_total || '0', [data?.summary_total])

  const columns = useMemo(
    () => buildColumns(employeeTypeMapping, employeeStatusMapping, employeesExperienceMapping),
    [employeeTypeMapping, employeeStatusMapping, employeesExperienceMapping]
  )
  const rows = useMemo(
    () => buildReferralRows(departments, summaryTotal),
    [departments, summaryTotal]
  )

  const getCellColSpan = useMemo(
    () => (row: ReferralRow, colIdx: number) => {
      if (row.level === 1 && colIdx === 1) return columns.length - 1
      return undefined
    },
    [columns.length]
  )

  return (
    <TableTree
      data={rows}
      columns={columns}
      getCellColSpan={getCellColSpan}
      isLoading={isLoading}
      density="comfortable"
      customLevel2RowClassName="bg-white text-content-dark-1"
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default ReportRecruitmentReferralTable
