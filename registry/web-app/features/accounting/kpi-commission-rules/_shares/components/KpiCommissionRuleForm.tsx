import { useCallback, useEffect, useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Flex, Table as RT } from '@radix-ui/themes'
import { Button, FullScreenLoading, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { IconPlus, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import {
  useKpiCommissionRule,
  useCreateKpiCommissionRule,
  useUpdateKpiCommissionRule,
} from '@/features/accounting/kpi-commission-rules/services/kpi-commission-rule-service'
import {
  kpiCommissionRuleSchema,
  type KpiCommissionRuleFormValues,
  DEFAULT_KPI_COMMISSION_RULE_FORM_VALUES,
  type KpiCommissionStructureRequest,
  type KpiCommissionTier,
} from '@/features/accounting/kpi-commission-rules/types/kpi-commission-rule-types'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface KpiCommissionRuleFormProps {
  ruleId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export default function KpiCommissionRuleForm({
  ruleId,
  onSuccess,
  onCancel,
}: KpiCommissionRuleFormProps) {
  const navigate = useNavigate()
  const isEditMode = !!ruleId
  const isInitialized = useRef(false)

  const { data: rule, isLoading: isLoadingRule } = useKpiCommissionRule(ruleId ?? 0)
  const createMutation = useCreateKpiCommissionRule()
  const updateMutation = useUpdateKpiCommissionRule()
  const invalidateQueries = useInvalidateQueries()

  const { keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS,
      APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE,
    ],
  })

  const statusOptions = keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_STRUCTURE_STATUS) || []
  const roleOptions = keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.KPI_TARGET_ROLE) || []

  const form = useForm<KpiCommissionRuleFormValues>({
    resolver: zodResolver(kpiCommissionRuleSchema) as any,
    mode: 'onTouched',
    defaultValues: DEFAULT_KPI_COMMISSION_RULE_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tiers',
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && rule && !isInitialized.current) {
      reset({
        name: rule.name,
        target_role: rule.target_role,
        effective_from: rule.effective_from,
        effective_to: rule.effective_to || null,
        status: rule.status,
        note: rule.note || '',
        tiers: rule.tiers.map((t: KpiCommissionTier) => ({
          id: t.id,
          min_completion_pct: t.min_completion_pct,
          max_completion_pct: t.max_completion_pct || null,
          commission_pct: t.commission_pct,
          note: t.note || '',
        })),
      })
      isInitialized.current = true
    }
  }, [isEditMode, rule, reset])

  const onSubmit = useCallback(
    async (values: KpiCommissionRuleFormValues) => {
      try {
        const payload: KpiCommissionStructureRequest = {
          name: values.name,
          target_role: values.target_role,
          effective_from: values.effective_from,
          effective_to: values.effective_to,
          status: values.status,
          note: values.note || undefined,
          tiers: values.tiers.map((t) => ({
            min_completion_pct: t.min_completion_pct,
            max_completion_pct: t.max_completion_pct,
            commission_pct: t.commission_pct,
            note: t.note || undefined,
          })),
        }

        if (isEditMode && ruleId) {
          await updateMutation.mutateAsync({ id: ruleId, data: payload })
          toastService.success('Cập nhật quy tắc hoa hồng thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo quy tắc hoa hồng thành công')
        }

        await invalidateQueries.invalidateByPrefix('accounting/kpi-commission-structures')

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.KPI_COMMISSION_RULE)
        }
      } catch (error: unknown) {
        handleApiError(error, setError as any)
      }
    },
    [
      isEditMode,
      ruleId,
      updateMutation,
      createMutation,
      invalidateQueries,
      onSuccess,
      navigate,
      setError,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(withRememberedSearch(APP_PATH.KPI_COMMISSION_RULE))
    }
  }, [onCancel, navigate])

  if (isEditMode && isLoadingRule) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full">
        {/* Section 1: Thông tin chung */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</h2>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên quy tắc',
                required: true,
                placeholder: 'Nhập tên quy tắc',
                maxLength: 255,
              }}
            />
            <FormController
              register={register}
              name="target_role"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đối tượng áp dụng',
                required: true,
                placeholder: 'Chọn đối tượng',
                options: roleOptions,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="effective_from"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Hiệu lực từ',
                required: true,
                placeholder: 'DD/MM/YYYY',
                allowManualInput: true,
                clearable: true,
                value: parseDateFromApi(watch('effective_from')),
                onChange: (val: string | null | undefined) =>
                  setValue('effective_from', formatDateToApi(val ?? undefined), {
                    shouldValidate: true,
                  }),
              }}
            />
            <FormController
              register={register}
              name="effective_to"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Hiệu lực đến',
                placeholder: 'DD/MM/YYYY',
                allowManualInput: true,
                clearable: true,
                value: parseDateFromApi(watch('effective_to')),
                onChange: (val: string | null | undefined) =>
                  setValue('effective_to', formatDateToApi(val ?? undefined), {
                    shouldValidate: true,
                  }),
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái',
                options: statusOptions,
                placeholder: 'Chọn trạng thái',
                disabled: !isEditMode, // Default to DRAFT on create
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        {/* Section 2: Ngưỡng hoa hồng (Editable Table) */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="typo-body-xl-semibold text-content-dark-1">Cấu hình ngưỡng hoa hồng</h2>
          </div>

          <div className="border-border-1 overflow-x-auto rounded-md border">
            <RT.Root>
              <RT.Header>
                <RT.Row className="bg-neutral-30">
                  <RT.ColumnHeaderCell className="border-border-1 w-[50px] border-r px-3 py-3 text-center">
                    <span className="typo-body-base-medium text-[#4B4B4B]">#</span>
                  </RT.ColumnHeaderCell>
                  <RT.ColumnHeaderCell className="border-border-1 min-w-[180px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">% Hoàn thành từ</span>
                  </RT.ColumnHeaderCell>
                  <RT.ColumnHeaderCell className="border-border-1 min-w-[180px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">% Hoàn thành đến</span>
                  </RT.ColumnHeaderCell>
                  <RT.ColumnHeaderCell className="border-border-1 min-w-[150px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">% Hoa hồng</span>
                  </RT.ColumnHeaderCell>
                  <RT.ColumnHeaderCell className="border-border-1 min-w-[200px] border-r px-3 py-3">
                    <span className="typo-body-base-medium text-[#4B4B4B]">Ghi chú</span>
                  </RT.ColumnHeaderCell>
                  <RT.ColumnHeaderCell className="w-[60px] px-3 py-3" />
                </RT.Row>
              </RT.Header>
              <RT.Body>
                {fields.map((fieldItem, index) => (
                  <RT.Row key={fieldItem.id} className="hover:bg-neutral-10">
                    <RT.Cell className="border-border-1 w-[50px] border-r px-3 py-2 text-center align-middle">
                      <span className="typo-body-sm-medium text-content-dark-3">{index + 1}</span>
                    </RT.Cell>

                    <RT.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`tiers.${index}.min_completion_pct`}
                        control={control}
                        render={({ field: lineField }) => (
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                            suffix="%"
                            // Tỷ lệ hoàn thành KPI được phép vượt 100%
                            allowPercentOverHundred
                            value={lineField.value}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        )}
                      />
                    </RT.Cell>

                    <RT.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`tiers.${index}.max_completion_pct`}
                        control={control}
                        render={({ field: lineField }) => (
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                            suffix="%"
                            // Tỷ lệ hoàn thành KPI được phép vượt 100%
                            allowPercentOverHundred
                            value={lineField.value ?? ''}
                            onChange={(e) => lineField.onChange(e.target.value || null)}
                          />
                        )}
                      />
                    </RT.Cell>

                    <RT.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`tiers.${index}.commission_pct`}
                        control={control}
                        render={({ field: lineField }) => (
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full bg-transparent px-3 text-right outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                            suffix="%"
                            value={lineField.value}
                            onChange={(e) => lineField.onChange(e.target.value)}
                          />
                        )}
                      />
                    </RT.Cell>

                    <RT.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <input
                        {...register(`tiers.${index}.note`)}
                        placeholder="Nhập ghi chú..."
                        className="h-full min-h-[44px] w-full bg-transparent px-3 outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                      />
                    </RT.Cell>

                    <RT.Cell className="w-[60px] px-3 py-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        className="text-data-red-default hover:text-data-red-hover disabled:text-neutral-40 flex items-center justify-center transition-colors"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </RT.Cell>
                  </RT.Row>
                ))}
              </RT.Body>
            </RT.Root>
            <div className="border-border-1 border-t bg-white p-3">
              <button
                type="button"
                onClick={() =>
                  append({
                    min_completion_pct: '0',
                    max_completion_pct: null,
                    commission_pct: '0',
                    note: '',
                  })
                }
                className="border-action-primary-blue-default bg-neutral-10 text-action-primary-blue-default hover:bg-neutral-20 hover:text-action-primary-blue-hover flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2.5 text-sm font-medium transition-colors"
              >
                <IconPlus className="h-4 w-4" />
                Thêm ngưỡng mới
              </button>
            </div>
          </div>
        </div>

        <SeparatorHorizontal />

        {/* Section 3: Ghi chú */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Ghi chú</h2>
          <FormController
            register={register}
            name="note"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú chung',
              placeholder: 'Nhập ghi chú...',
              rows: 4,
              maxCharacters: 2000,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
