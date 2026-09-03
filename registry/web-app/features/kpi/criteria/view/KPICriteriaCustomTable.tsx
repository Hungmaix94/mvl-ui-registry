import * as TableComponents from '@radix-ui/themes'
import { type KPICriterion } from '@/features/kpi/services/kpi-criteria-service'
import { useMemo } from 'react'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type KPICriteriaCustomTableProps = {
  data: KPICriterion[]
  isLoading?: boolean
}

export const KPICriteriaCustomTable = ({ data }: KPICriteriaCustomTableProps) => {
  // Get evaluation type constants from API
  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.KPI_CRITERION_EVALUATION_TYPE_CHOICES],
  })

  const evaluationTypeMap = keysMap.get(
    APP_CONSTANT_KEY.PAYROLL.KPI_CRITERION_EVALUATION_TYPE_CHOICES
  ) as Record<string, string> | undefined

  // Calculate rowspan for each row
  const rowSpanData = useMemo(() => {
    const spans: Record<number, { evaluationType: number; criterion: number }> = {}

    data.forEach((row, index) => {
      // Check if this row should be hidden (part of a previous span)
      const shouldShowEvaluationType =
        index === 0 || data[index - 1].evaluation_type !== row.evaluation_type

      const shouldShowCriterion =
        index === 0 ||
        data[index - 1].evaluation_type !== row.evaluation_type ||
        data[index - 1].criterion !== row.criterion

      // Calculate spans
      let evaluationTypeSpan = 0
      let criterionSpan = 0

      if (shouldShowEvaluationType) {
        evaluationTypeSpan = 1
        for (let i = index + 1; i < data.length; i++) {
          if (data[i].evaluation_type === row.evaluation_type) {
            evaluationTypeSpan++
          } else {
            break
          }
        }
      }

      if (shouldShowCriterion) {
        criterionSpan = 1
        for (let i = index + 1; i < data.length; i++) {
          if (
            data[i].evaluation_type === row.evaluation_type &&
            data[i].criterion === row.criterion
          ) {
            criterionSpan++
          } else {
            break
          }
        }
      }

      spans[index] = {
        evaluationType: evaluationTypeSpan,
        criterion: criterionSpan,
      }
    })

    return spans
  }, [data])

  return (
    <div className="h-full px-0 pb-0">
      <TableComponents.Table.Root className="w-full border-collapse">
        <TableComponents.Table.Header className="bg-content-light-1 border-border-1 sticky top-0 z-10 border">
          <TableComponents.Table.Row>
            <TableComponents.Table.ColumnHeaderCell
              colSpan={3}
              className={cn(
                'text-content-dark-2 typo-body-base-medium !shadow-none',
                'px-3 py-[10px]',
                'border-border-1 border',
                '!bg-neutral-20',
                'text-center !align-middle font-semibold'
              )}
            >
              Tiêu chí
            </TableComponents.Table.ColumnHeaderCell>
            <TableComponents.Table.ColumnHeaderCell
              className={cn(
                'text-content-dark-2 typo-body-base-medium !shadow-none',
                'px-3 py-[10px]',
                '!border-border-1 !border',
                '!bg-neutral-20',
                'text-center !align-middle font-semibold'
              )}
            >
              <span>Tỉ trọng</span>
            </TableComponents.Table.ColumnHeaderCell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Header>

        <TableComponents.Table.Body>
          {data.map((row, index) => {
            const spans = rowSpanData[index]
            const showEvaluationType = spans.evaluationType > 0
            const showCriterion = spans.criterion > 0
            const isMergeSubCriterion = spans.criterion === 1 && !row.sub_criterion

            return (
              <TableComponents.Table.Row key={row.id || index}>
                {showEvaluationType && (
                  <TableComponents.Table.Cell
                    rowSpan={spans.evaluationType}
                    className={cn(
                      'px-3 py-2',
                      'border-border-1 border',
                      'text-center !align-middle font-semibold'
                    )}
                    style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
                  >
                    {evaluationTypeMap?.[row.evaluation_type]}
                  </TableComponents.Table.Cell>
                )}
                {showCriterion && (
                  <TableComponents.Table.Cell
                    rowSpan={spans.criterion}
                    colSpan={isMergeSubCriterion ? 2 : 1}
                    className={cn('px-3 py-2', 'border-border-1 border !align-middle')}
                    style={{
                      width: isMergeSubCriterion ? '750px' : '400px',
                      minWidth: isMergeSubCriterion ? '750px' : '400px',
                      maxWidth: isMergeSubCriterion ? '750px' : '400px',
                    }}
                  >
                    <p>{row.criterion}</p>
                  </TableComponents.Table.Cell>
                )}
                {!isMergeSubCriterion && (
                  <TableComponents.Table.Cell
                    className={cn(
                      'px-3 py-2',
                      'border-border-1 border',
                      '!align-middle',
                      'text-center'
                    )}
                    style={{ width: '450px', minWidth: '450px', maxWidth: '450px' }}
                  >
                    {row.sub_criterion && <p className="text-gray-600">{row.sub_criterion}</p>}
                  </TableComponents.Table.Cell>
                )}
                <TableComponents.Table.Cell
                  className={cn(
                    'px-3 py-2',
                    '!border-border-1 !border',
                    'overflow-hidden text-center !align-middle font-mono'
                  )}
                  style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                >
                  {row.component_total_score}%
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            )
          })}
        </TableComponents.Table.Body>

        <TableComponents.Table.Body>
          <TableComponents.Table.Row className="bg-neutral-20">
            <TableComponents.Table.Cell
              colSpan={3}
              className={cn(
                'px-3 py-6',
                'border-border-1 border',
                'text-center',
                '!h-14 !align-middle'
              )}
            >
              Kết quả đánh giá mức độ hoàn thành công việc (KPI)
            </TableComponents.Table.Cell>
            <TableComponents.Table.Cell
              className={cn('px-3 py-2', 'border-border-1 border', 'text-center align-middle')}
            >
              {data.reduce((sum, item) => sum + Number(item.component_total_score || 0), 0)}%
            </TableComponents.Table.Cell>
          </TableComponents.Table.Row>
        </TableComponents.Table.Body>
      </TableComponents.Table.Root>
    </div>
  )
}
