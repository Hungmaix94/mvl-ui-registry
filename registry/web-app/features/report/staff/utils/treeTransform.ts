import type { TreeColumn } from '@/components/ui/table-tree/TableTree.tsx'

type NodeItem = {
  type: 'branch' | 'block' | 'department' | string
  name: string
  statistics: number[]
  children?: NodeItem[]
}

export type TreeRow = {
  id: string
  level: 1 | 2 | 3
  type: 'branch' | 'block' | 'department'
  name: string
  statistics: number[]
  isSummary?: boolean
}

export function buildColumns(
  timeHeaders: string[],
  orgLevel?: 'branch' | 'block' | 'department',
  nameHeader?: string
): TreeColumn<TreeRow>[] {
  const cols: TreeColumn<TreeRow>[] = [
    {
      id: 'name',
      header: nameHeader || 'Chi nhánh - Khối - Phòng ban',
      cell: (row) => row.name,
      meta: {
        frozen: true,
        width: 'w-80',
        align: 'left',
        // Override text color for summary row when orgLevel is 'branch'
        cellClassName: orgLevel === 'branch' ? '' : undefined,
        cellStyle: (row: TreeRow) => {
          if (row.isSummary && orgLevel === 'branch') {
            return { color: 'var(--color-content-dark-primary, #000000)' }
          }
          return {}
        },
      },
    },
  ]

  timeHeaders.forEach((header, i) => {
    cols.push({
      id: `time_${i}`,
      header: header,
      cell: (row) => row.statistics?.[i] ?? 0,
      meta: {
        width: 'w-32',
        align: 'right',
        // Override text color for summary row when orgLevel is 'branch'
        cellStyle: (row: TreeRow) => {
          if (row.isSummary && orgLevel === 'branch') {
            return { color: 'var(--color-content-dark-primary, #000000)' }
          }
          return {}
        },
      },
    })
  })

  return cols
}

export function flattenTree(timeHeaders: string[], nodes: NodeItem[]): TreeRow[] {
  const rows: TreeRow[] = []

  nodes.forEach((branchNode, branchIdx) => {
    const branchId = `b-${branchIdx}`
    rows.push({
      id: branchId,
      level: 1,
      type: 'branch',
      name: branchNode.name,
      statistics: branchNode.statistics || new Array(timeHeaders.length).fill(0),
    })

    branchNode.children?.forEach((blockNode, blockIdx) => {
      const blockId = `${branchId}-bl-${blockIdx}`
      rows.push({
        id: blockId,
        level: 2,
        type: 'block',
        name: blockNode.name,
        statistics: blockNode.statistics || new Array(timeHeaders.length).fill(0),
      })

      blockNode.children?.forEach((deptNode, deptIdx) => {
        rows.push({
          id: `${blockId}-dp-${deptIdx}`,
          level: 3,
          type: 'department',
          name: deptNode.name,
          statistics: deptNode.statistics || new Array(timeHeaders.length).fill(0),
        })
      })
    })
  })

  return rows
}
