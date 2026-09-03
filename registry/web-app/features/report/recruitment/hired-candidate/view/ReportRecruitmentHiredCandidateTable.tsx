import { useMemo, type RefObject } from 'react'
import { TableTree, GroupedHeader } from '@/components/ui/table-tree/TableTree'
import type { HiredCandidateReportAggregated } from '@/features/report/services/hrm-report-service'
import romansLib from 'romans'

type HiredRow = {
  id: string
  level: 1 | 2
  stt?: number | string
  source?: string
  [key: string]: any
}

type SourceTypeData = {
  type: string
  name: string
  statistics: number[]
  children: Array<{
    type: string
    name: string
    statistics: number[]
  }>
}

type ReportRecruitmentHiredCandidateTableProps = {
  data?: HiredCandidateReportAggregated
  isLoading: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

// Convert number to Roman numeral using romans library
function toRomanNumeral(num: number): string {
  const roman = (romansLib as any)?.romanize ? (romansLib as any).romanize(num) : String(num)
  return roman
}

function buildColumns(labels: string[]): any[] {
  const cols: any[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: (row: HiredRow) => {
        if (row.level === 1) return row.stt || ''
        return row.stt ?? ''
      },
      meta: { frozen: true, width: '60px', align: 'center' },
    },
    {
      id: 'source',
      header: 'Nguồn',
      cell: (row: HiredRow) => row.source || '',
      meta: { frozen: true, width: '200px', align: 'left' },
    },
  ]

  // Add dynamic period columns based on labels (excluding "Total")
  labels
    .filter((label) => label !== 'Tổng')
    .forEach((label) => {
      cols.push({
        id: label,
        header: label,
        cell: (row: HiredRow) => row[label] ?? '',
        meta: { width: '100px', align: 'center' },
      })
    })

  // Add "Total" column at the end
  cols.push({
    id: 'Tổng',
    header: 'Tổng',
    cell: (row: HiredRow) => row['Tổng'] ?? '',
    meta: {
      width: '100px',
      align: 'center',
      headerStyle: {
        backgroundColor: 'var(--color-background-6)',
        color: 'var(--color-content-dark-1)',
        fontWeight: 600,
      },
      cellStyle: {
        backgroundColor: 'var(--color-background-6)',
        color: 'var(--color-content-dark-1)',
        fontWeight: 600,
      },
    },
  })

  return cols
}

function buildHiredRows(data: SourceTypeData[], labels: string[]): HiredRow[] {
  const rows: HiredRow[] = []

  data.forEach((sourceType, index) => {
    // Add level 1 row (source type header)
    const level1Row: HiredRow = {
      id: `level1-${index}`,
      level: 1,
      stt: toRomanNumeral(index + 1),
      source: sourceType.name,
    }

    // Add statistics for each period
    sourceType.statistics.forEach((stat, statIndex) => {
      level1Row[labels[statIndex]] = stat
    })
    rows.push(level1Row)

    // Add level 2 rows (children/employees) only if they exist
    if (sourceType.children && sourceType.children.length > 0) {
      let groupStt = 1
      sourceType.children.forEach((child, childIndex) => {
        const level2Row: HiredRow = {
          id: `level2-${index}-${childIndex}`,
          level: 2,
          stt: groupStt++,
          source: child.name,
        }

        // Add statistics for each period
        child.statistics.forEach((stat, statIndex) => {
          level2Row[labels[statIndex]] = stat
        })
        rows.push(level2Row)
      })
    }
  })

  return rows
}

function buildGroupedHeaders(labels: string[]): GroupedHeader[] {
  // Filter labels to get only period labels (excluding Total)
  const periodLabels = labels.filter((label) => label !== 'Tổng')

  const headers: GroupedHeader[] = [
    {
      id: 'stt',
      title: 'STT',
      align: 'center',
    },
    {
      id: 'source',
      title: 'Nguồn',
      align: 'left',
    },
    {
      id: 'hired_candidates',
      title: 'Số ứng viên nhận việc',
      colSpan: periodLabels.length + 1, // +1 for Total column
      align: 'center',
      hasChildren: true,
      children: [
        ...periodLabels.map((label) => ({
          id: label,
          title: label,
          align: 'center' as const,
        })),
        {
          id: 'Tổng',
          title: 'Tổng',
          align: 'center' as const,
          headerStyle: {
            backgroundColor: 'var(--color-background-6)',
            color: 'var(--color-content-dark-1)',
            fontWeight: 600,
          },
        },
      ],
    },
  ]

  return headers
}

const ReportRecruitmentHiredCandidateTable = ({
  data,
  isLoading,
  scrollContainerRef,
}: ReportRecruitmentHiredCandidateTableProps) => {
  const sourceTypes = useMemo(() => (data?.data || []) as SourceTypeData[], [data?.data])
  const labels = useMemo(() => data?.labels || [], [data?.labels])

  const columns = useMemo(() => buildColumns(labels), [labels])
  const rows = useMemo(() => buildHiredRows(sourceTypes, labels), [sourceTypes, labels])
  const groupedHeaders = useMemo(() => buildGroupedHeaders(labels), [labels])

  return (
    <TableTree
      data={rows}
      columns={columns}
      groupedHeaders={groupedHeaders}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel1RowClassName="typo-body-base-semibold"
      className={'p-0'}
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default ReportRecruitmentHiredCandidateTable
