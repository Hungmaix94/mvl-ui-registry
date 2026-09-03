import * as TableComponents from '@radix-ui/themes'
import { type EmployeeKPIItem } from '@/features/kpi/services/kpi-assessment-service'
import { useMemo, useEffect } from 'react'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { Text } from '@radix-ui/themes'
import { useFormContext, Controller, useWatch } from 'react-hook-form'

import { AssessmentFormValues } from '../schema.ts'

export type KPIAssessmentTableProps = {
  data: EmployeeKPIItem[]
  isLoading?: boolean
  isReadOnly?: boolean
}

export const KPIAssessmentTable = ({ data, isReadOnly = true }: KPIAssessmentTableProps) => {
  const { control, setValue } = useFormContext<AssessmentFormValues>()
  const watchedItems = useWatch({ control, name: 'items' })

  // Sync total score when items change
  useEffect(() => {
    if (watchedItems && !isReadOnly) {
      const sum = watchedItems.reduce((acc, item) => acc + (Number(item.manager_score) || 0), 0)
      setValue('total_manager_score', sum)
    }
  }, [watchedItems, setValue, isReadOnly])

  const { keysMap } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.KPI_CRITERION_EVALUATION_TYPE_CHOICES],
  })

  const evaluationTypeMap = keysMap.get(
    APP_CONSTANT_KEY.PAYROLL.KPI_CRITERION_EVALUATION_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const rowSpanData = useMemo(() => {
    const spans: Record<number, { evaluationType: number; criterion: number }> = {}

    data.forEach((row, index) => {
      const shouldShowEvaluationType =
        index === 0 || data[index - 1].evaluation_type !== row.evaluation_type

      const shouldShowCriterion =
        index === 0 ||
        data[index - 1].evaluation_type !== row.evaluation_type ||
        data[index - 1].criterion !== row.criterion

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
    <div className="flex flex-col gap-4">
      <Text className="text-content-dark-1 typo-body-xl-semibold">
        Đánh giá mức độ hoàn thành công việc
      </Text>

      <div className="border-border-1 overflow-hidden rounded-sm border">
        <TableComponents.Table.Root className="w-full border-collapse">
          <TableComponents.Table.Header className="bg-neutral-20 border-border-1 border-b">
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                rowSpan={2}
                className="border-border-1 typo-body-base-semibold border-r px-3 py-3 text-center align-middle"
                style={{ width: '150px' }}
              >
                Loại đánh giá
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                colSpan={2}
                rowSpan={2}
                className="border-border-1 typo-body-base-semibold border-r px-3 py-3 text-center align-middle"
                style={{ width: '550px' }}
              >
                Tiêu chí
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                rowSpan={2}
                className="border-border-1 typo-body-base-semibold border-r px-3 py-3 text-center align-middle"
                style={{ width: '150px' }}
              >
                Tỉ trọng điểm (%)
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                colSpan={2}
                className="border-border-1 typo-body-base-semibold border-r px-3 py-3 text-center align-middle"
                style={{ width: '300px' }}
              >
                Kết quả đánh giá (%)
              </TableComponents.Table.ColumnHeaderCell>
            </TableComponents.Table.Row>
            <TableComponents.Table.Row>
              <TableComponents.Table.ColumnHeaderCell
                className="border-border-1 typo-body-base-semibold border-r px-3 py-3 text-center align-middle"
                style={{ width: '150px' }}
              >
                Tự đánh giá
              </TableComponents.Table.ColumnHeaderCell>
              <TableComponents.Table.ColumnHeaderCell
                className="typo-body-base-semibold px-3 py-3 text-center align-middle"
                style={{ width: '150px' }}
              >
                Cấp trên đánh giá
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
                <TableComponents.Table.Row
                  key={row.id || index}
                  className="border-border-1 border-b last:border-b-0"
                >
                  {showEvaluationType && (
                    <TableComponents.Table.Cell
                      rowSpan={spans.evaluationType}
                      className={cn(
                        'px-3 py-2',
                        'border-border-1 border-r',
                        'typo-body-base-semibold text-center align-middle',
                        'bg-neutral-20'
                      )}
                      style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
                    >
                      {evaluationTypeMap?.[row.evaluation_type] || row.evaluation_type}
                    </TableComponents.Table.Cell>
                  )}

                  {showCriterion && (
                    <TableComponents.Table.Cell
                      rowSpan={spans.criterion}
                      colSpan={isMergeSubCriterion ? 2 : 1}
                      className={cn(
                        'px-3 py-2',
                        'border-border-1 border-r',
                        'typo-body-base-regular align-middle'
                      )}
                      style={{
                        width: isMergeSubCriterion ? '550px' : '300px',
                        minWidth: isMergeSubCriterion ? '550px' : '300px',
                        maxWidth: isMergeSubCriterion ? '550px' : '300px',
                      }}
                    >
                      {row.criterion}
                    </TableComponents.Table.Cell>
                  )}

                  {!isMergeSubCriterion && (
                    <TableComponents.Table.Cell
                      className={cn(
                        'px-3 py-2',
                        'border-border-1 border-r',
                        'typo-body-base-regular text-content-dark-2 align-middle'
                      )}
                      style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
                    >
                      {row.sub_criterion && <p>{row.sub_criterion}</p>}
                    </TableComponents.Table.Cell>
                  )}

                  <TableComponents.Table.Cell className="border-border-1 typo-body-base-regular border-r text-center align-middle">
                    {row.component_total_score}%
                  </TableComponents.Table.Cell>

                  <TableComponents.Table.Cell className="border-border-1 typo-body-base-regular border-r text-center align-middle">
                    {row.employee_score || '-'}
                  </TableComponents.Table.Cell>

                  <TableComponents.Table.Cell className="typo-body-base-regular border-border-1 !p-0 text-center align-middle font-semibold">
                    {isReadOnly ? (
                      <div className="flex h-full w-full items-center justify-center py-2">
                        {row.manager_score || '-'}
                      </div>
                    ) : (
                      <Controller
                        control={control}
                        name={`items.${index}.manager_score`}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={0}
                            className="hover:ring-neutral-80 h-full w-full [appearance:textfield] border-none bg-transparent p-0 text-center outline-none ring-inset hover:ring-1 focus:ring-1 focus:ring-neutral-100 [&::-webkit-inner-spin-button]:appearance-none"
                            // placeholder="Nhập..."
                            value={
                              field.value !== null && field.value !== undefined
                                ? String(field.value)
                                : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value
                              if (!val) {
                                field.onChange(null)
                                return
                              }
                              const numVal = Number(val)
                              const maxVal = Number(row.component_total_score || 100)
                              if (numVal > maxVal) {
                                field.onChange(maxVal)
                              } else {
                                field.onChange(numVal >= 0 ? numVal : 0)
                              }
                            }}
                          />
                        )}
                      />
                    )}
                  </TableComponents.Table.Cell>
                </TableComponents.Table.Row>
              )
            })}
          </TableComponents.Table.Body>

          {/* Footer - Total KPI Score */}
          <TableComponents.Table.Body className="bg-neutral-20">
            <TableComponents.Table.Row>
              <TableComponents.Table.Cell
                className="border-border-1 typo-body-base-semibold border-r px-3 py-4 text-center align-middle"
                colSpan={3}
              >
                Kết quả đánh giá mức độ hoàn thành công việc (KPI)
              </TableComponents.Table.Cell>

              <TableComponents.Table.Cell className="border-border-1 typo-body-base-semibold border-r text-center align-middle">
                {data.reduce((sum, item) => sum + Number(item.component_total_score || 0), 0)}%
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="border-border-1 typo-body-base-regular border-r text-center align-middle">
                {data.reduce((sum, item) => sum + Number(item.employee_score || 0), 0)}
              </TableComponents.Table.Cell>
              <TableComponents.Table.Cell className="typo-body-base-semibold border-border-1 !p-0 text-center align-middle">
                <div className="flex h-full w-full items-center justify-center py-2">
                  <Controller
                    control={control}
                    name="total_manager_score"
                    render={({ field }) => {
                      return (
                        <span>
                          {field.value !== null && field.value !== undefined ? field.value : 0}
                        </span>
                      )
                    }}
                  />
                </div>
              </TableComponents.Table.Cell>
            </TableComponents.Table.Row>
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}
