import romansLib from 'romans'
import type { TreeColumn } from '@/components/ui/table-tree/TableTree'

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
  stt?: string | number
  statistics: number[]
}

export function buildColumns(sources: string[]): TreeColumn<TreeRow>[] {
  const cols: TreeColumn<TreeRow>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: (row) => (row.level === 1 ? '' : (row.stt ?? '')),
      meta: { frozen: true, width: 'w-16', align: 'center' },
    },
    {
      id: 'name',
      header: 'Danh sách phòng ban',
      cell: (row) => row.name,
      meta: { frozen: true, width: 'w-80', align: 'left' },
    },
  ]

  sources.forEach((s, i) => {
    cols.push({
      id: `src_${i}`,
      header: s,
      cell: (row) => row.statistics?.[i] ?? 0,
      meta: { width: 'w-32', align: 'right' },
    })
  })

  return cols
}

export function flattenTree(sources: string[], nodes: NodeItem[]): TreeRow[] {
  const rows: TreeRow[] = []

  const isAllZero = (stats: number[] = []) => stats.every((item) => item === 0)

  nodes.forEach((branchNode, branchIdx) => {
    const branchId = `b-${branchIdx}`
    const branchStats = branchNode.statistics || new Array(sources.length).fill(0)
    if (!isAllZero(branchStats)) {
      rows.push({
        id: branchId,
        level: 1,
        type: 'branch',
        name: branchNode.name,
        stt: '',
        statistics: branchStats,
      })
    }

    let blockCounter = 0
    branchNode.children?.forEach((blockNode, blockIdx) => {
      blockCounter += 1
      const roman = (romansLib as any)?.romanize
        ? (romansLib as any).romanize(blockCounter) + '.'
        : String(blockCounter)

      const blockStats = blockNode.statistics || new Array(sources.length).fill(0)
      if (!isAllZero(blockStats)) {
        const blockId = `${branchId}-bl-${blockIdx}`
        rows.push({
          id: blockId,
          level: 2,
          type: 'block',
          name: blockNode.name,
          stt: roman,
          statistics: blockStats,
        })

        let deptCounter = 0
        blockNode.children?.forEach((deptNode, deptIdx) => {
          deptCounter += 1
          const deptStats = deptNode.statistics || new Array(sources.length).fill(0)
          if (!isAllZero(deptStats)) {
            rows.push({
              id: `${blockId}-dp-${deptIdx}`,
              level: 3,
              type: 'department',
              name: deptNode.name,
              stt: deptCounter,
              statistics: deptStats,
            })
          }
        })
      }
    })
  })

  return rows
}
