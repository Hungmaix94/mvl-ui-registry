import { useCallback, useEffect, useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Flex, Table as RT } from '@radix-ui/themes'
import { z } from 'zod'
import { FullScreenLoading, Select } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'

import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { IconPlus, IconTrash, IconInfo } from '@/assets/icons'
import {
  managerKpiRuleService,
  useManagerKpiRules,
  type KpiCommissionRule,
} from '@/features/accounting/manager-kpis/services/manager-kpi-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { APP_PATH } from '@/routes/AppRoute.constant.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'

const bulkRuleSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Bắt buộc nhập diễn giải'),
  completion_pct: z.string().min(1, 'Bắt buộc nhập % chỉ tiêu'),
  operator: z.string().optional(),
  pct_for_leader: z.string().optional(),
  pct_for_director: z.string().optional(),
  pct_for_ceo: z.string().optional(),
  pct_for_sale_admin_lead: z.string().optional(),
  note: z.string().optional(),
})

const bulkFormSchema = z.object({
  rules: z.array(bulkRuleSchema).min(1, 'Cần ít nhất 1 quy định'),
})

type BulkFormValues = z.infer<typeof bulkFormSchema>

export default function ManagerKpiRuleBulkForm() {
  const navigate = useNavigate()
  const isInitialized = useRef(false)
  const invalidateQueries = useInvalidateQueries()

  const { data: listResponse, isLoading } = useManagerKpiRules({
    page: 1,
    page_size: 1000,
  })

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkFormSchema),
    mode: 'onTouched',
    defaultValues: {
      rules: [],
    },
  })

  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rules',
  })

  useEffect(() => {
    if (listResponse?.results && !isInitialized.current) {
      const initialRules: Partial<KpiCommissionRule>[] =
        listResponse.results.length > 0
          ? listResponse.results
          : [
              {
                name: '',
                completion_pct: '0',
                pct_for_leader: '0',
                pct_for_director: '0',
                pct_for_ceo: '0',
                pct_for_sale_admin_lead: '0',
                operator: 'GTE' as any,
                note: '',
              },
            ]

      reset({
        rules: initialRules.map((r) => ({
          id: r.id,
          name: r.name || '',
          completion_pct: r.completion_pct || '0',
          operator: r.operator,
          pct_for_leader: r.pct_for_leader || '0',
          pct_for_director: r.pct_for_director || '0',
          pct_for_ceo: r.pct_for_ceo || '0',
          pct_for_sale_admin_lead: r.pct_for_sale_admin_lead || '0',
          note: r.note || '',
        })),
      })
      isInitialized.current = true
    }
  }, [listResponse, reset])

  const onSubmit = useCallback(
    async (values: BulkFormValues) => {
      try {
        const initialRules = listResponse?.results || []
        const currentRules = values.rules

        const toCreate = currentRules.filter((r) => !r.id)
        const toUpdate = currentRules.filter(
          (r) => r.id && initialRules.some((init) => init.id === r.id)
        )
        const toDelete = initialRules.filter((init) => !currentRules.some((r) => r.id === init.id))

        const promises: Promise<any>[] = []

        // Delete missing
        for (const rule of toDelete) {
          promises.push(managerKpiRuleService.deleteRule(rule.id))
        }

        // Create new
        for (const rule of toCreate) {
          promises.push(
            managerKpiRuleService.createRule({
              name: rule.name,
              completion_pct: rule.completion_pct,
              operator: (rule.operator || 'GTE') as any,
              pct_for_leader: rule.pct_for_leader || '0',
              pct_for_director: rule.pct_for_director || '0',
              pct_for_ceo: rule.pct_for_ceo || '0',
              pct_for_sale_admin_lead: rule.pct_for_sale_admin_lead || '0',
              note: rule.note || '',
            })
          )
        }

        // Update existing
        for (const rule of toUpdate) {
          const init = initialRules.find((i) => i.id === rule.id)
          if (init) {
            // Only update if changed
            if (
              init.name !== rule.name ||
              init.completion_pct !== rule.completion_pct ||
              init.operator !== rule.operator ||
              init.pct_for_leader !== rule.pct_for_leader ||
              init.pct_for_director !== rule.pct_for_director ||
              init.pct_for_ceo !== rule.pct_for_ceo ||
              init.pct_for_sale_admin_lead !== rule.pct_for_sale_admin_lead ||
              init.note !== rule.note
            ) {
              promises.push(
                managerKpiRuleService.updateRule(rule.id!, {
                  name: rule.name,
                  completion_pct: rule.completion_pct,
                  operator: (rule.operator || 'GTE') as any,
                  pct_for_leader: rule.pct_for_leader || '0',
                  pct_for_director: rule.pct_for_director || '0',
                  pct_for_ceo: rule.pct_for_ceo || '0',
                  pct_for_sale_admin_lead: rule.pct_for_sale_admin_lead || '0',
                  note: rule.note || '',
                })
              )
            }
          }
        }

        await Promise.all(promises)

        toastService.success('Đã lưu quy định hoa hồng')
        await invalidateQueries.invalidateByPrefix('accounting/kpi-commission-rules')
        navigate(APP_PATH.KPI_COMMISSION_RULE)
      } catch (error: unknown) {
        handleApiError(error, setError as any)
      }
    },
    [listResponse, invalidateQueries, navigate, setError]
  )

  if (isLoading) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  return (
    <Form
      id="manager-kpi-bulk-form"
      handleSubmit={handleSubmit as any}
      onSubmit={onSubmit}
      loading={isSubmitting}
    >
      <Flex direction="column" gap="5" className="w-full pb-10">
        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <IconInfo className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-blue-900">Cách áp dụng:</span>
            <span>
              Tỷ lệ HH = % thưởng x doanh thu thực hiện (hoặc thực thu) phần vượt qua chỉ tiêu.
            </span>
            <span>
              Tỷ lệ hoàn thành % (Cột chỉ tiêu) dùng để check điều kiện, mốc dưới là mức bắt đầu đạt
              % hoàn thành, nếu vượt sẽ ăn tiếp các mốc trên.
            </span>
          </div>
        </div>

        <div className="border-border-1 overflow-x-auto rounded-md border">
          <RT.Root>
            <RT.Header>
              <RT.Row className="bg-neutral-30">
                <RT.ColumnHeaderCell
                  className="border-border-1 w-[60px] border-r border-b px-3 py-3 text-center align-middle"
                  rowSpan={2}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">STT</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 min-w-[250px] border-r border-b px-3 py-3 align-middle"
                  rowSpan={2}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">Diễn giải</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 w-[100px] border-r border-b px-3 py-3 text-center align-middle"
                  rowSpan={2}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">Điều kiện</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 w-[140px] border-r border-b px-3 py-3 text-right align-middle"
                  rowSpan={2}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">Chỉ tiêu (% DT)</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 border-r border-b px-3 py-2 text-center"
                  colSpan={4}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">
                    Tỷ lệ thưởng theo cấp
                  </span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 w-[250px] border-r border-b px-3 py-3 align-middle"
                  rowSpan={2}
                >
                  <span className="typo-body-base-medium text-[#4B4B4B]">Ghi chú</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell
                  className="border-border-1 w-[60px] border-b px-3 py-3"
                  rowSpan={2}
                />
              </RT.Row>
              <RT.Row className="bg-neutral-30">
                <RT.ColumnHeaderCell className="border-border-1 w-[140px] border-r border-b px-3 py-2 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">Trưởng phòng</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 w-[130px] border-r border-b px-3 py-2 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">Giám đốc</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 w-[140px] border-r border-b px-3 py-2 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">Tổng giám đốc</span>
                </RT.ColumnHeaderCell>
                <RT.ColumnHeaderCell className="border-border-1 w-[160px] border-r border-b px-3 py-2 text-right">
                  <span className="typo-body-base-medium text-[#4B4B4B]">Trưởng phòng TKKD</span>
                </RT.ColumnHeaderCell>
              </RT.Row>
            </RT.Header>
            <RT.Body>
              {fields.map((fieldItem, index) => (
                <RT.Row key={fieldItem.id} className="hover:bg-neutral-10">
                  <RT.Cell className="border-border-1 w-[60px] border-r border-b px-3 py-2 text-center align-middle">
                    <span className="typo-body-sm-medium text-content-dark-3">{index + 1}</span>
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.name`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div className="group/edit hover:bg-action-primary-red-default/5 relative h-full min-h-[44px] transition-colors focus-within:bg-[#FFF6F2]">
                          <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                          <input
                            className={`relative z-10 h-full min-h-[44px] w-full bg-transparent px-3 outline-none ${error ? 'ring-data-red-default ring-1' : ''}`}
                            value={lineField.value}
                            onChange={(e: any) => lineField.onChange(e.target.value)}
                            placeholder="Nhập diễn giải..."
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.operator`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`relative h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <Select
                            className="h-full min-h-[44px] w-full rounded-none border-none bg-transparent shadow-none focus:ring-0"
                            value={lineField.value || 'GTE'}
                            onChange={(val) => lineField.onChange(val)}
                            options={[
                              { label: '>', value: 'GT' },
                              { label: '>=', value: 'GTE' },
                            ]}
                            clearable={false}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.completion_pct`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                            suffix="%"
                            // Tỷ lệ hoàn thành KPI được phép vượt 100% (vd: mốc 171%)
                            allowPercentOverHundred
                            value={lineField.value}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.pct_for_leader`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                            suffix="%"
                            value={lineField.value || ''}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.pct_for_director`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                            suffix="%"
                            value={lineField.value || ''}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.pct_for_ceo`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                            suffix="%"
                            value={lineField.value || ''}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.pct_for_sale_admin_lead`}
                      control={control}
                      render={({ field: lineField, fieldState: { error } }) => (
                        <div
                          className={`h-full min-h-[44px] ${error ? 'ring-data-red-default z-10 ring-1' : ''}`}
                        >
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white"
                            suffix="%"
                            value={lineField.value || ''}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        </div>
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 h-[1px] border-r border-b bg-white !p-0 align-top">
                    <Controller
                      name={`rules.${index}.note`}
                      control={control}
                      render={({ field: lineField }) => (
                        <input
                          className="h-full min-h-[44px] w-full bg-transparent px-3 outline-none ring-inset focus-within:bg-white"
                          value={lineField.value || ''}
                          onChange={(e: any) => lineField.onChange(e.target.value)}
                          placeholder="Nhập ghi chú..."
                        />
                      )}
                    />
                  </RT.Cell>

                  <RT.Cell className="border-border-1 w-[60px] border-r-0 border-b border-l-0 bg-white px-3 py-2 text-center align-middle !shadow-none">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-data-red-default hover:text-data-red-hover flex h-full min-h-[44px] w-full items-center justify-center transition-colors"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </RT.Cell>
                </RT.Row>
              ))}
            </RT.Body>
          </RT.Root>
          <div className="bg-white p-3">
            <button
              type="button"
              onClick={() =>
                append({
                  name: '',
                  completion_pct: '0',
                  operator: 'GTE',
                  pct_for_leader: '0',
                  pct_for_director: '0',
                  pct_for_ceo: '0',
                  pct_for_sale_admin_lead: '0',
                  note: '',
                })
              }
              className="border-action-primary-blue-default bg-neutral-10 text-action-primary-blue-default hover:bg-neutral-20 hover:text-action-primary-blue-hover flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2.5 text-sm font-medium transition-colors"
            >
              <IconPlus className="h-4 w-4" />
              Thêm mức KPI
            </button>
          </div>
        </div>
      </Flex>
    </Form>
  )
}
