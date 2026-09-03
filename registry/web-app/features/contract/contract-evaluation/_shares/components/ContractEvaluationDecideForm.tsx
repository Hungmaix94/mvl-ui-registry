import { useCallback, useMemo } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { components } from '@/api/schema'
import {
  Button,
  Checkbox,
  CurrencyInput,
  Form,
  FormController,
  RadioGroup,
  TextArea,
} from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { handleApiError } from '@/utils/error-utils'

import {
  ContractEvaluationDecision,
  ContractEvaluationFormType,
  type ContractEvaluationFormType as ContractEvaluationFormTypeValue,
  ContractEvaluationHrContractTerm,
  ContractEvaluationRecommendation,
} from '../constants/contract-evaluation-constants'
import {
  type HrDecisionFormValues,
  hrDecisionSchema,
  type ManagerDecisionFormValues,
  managerDecisionSchema,
} from '../schemas/contract-evaluation-schema'
import {
  buildChildItemsByParent,
  getParentItemIds,
  type GroupedEvaluationItems,
  groupEvaluationItems,
  isRateableItem,
} from '../utils/contract-evaluation-items'

type ContractEvaluationItem = components['schemas']['ContractEvaluationItem']

// ===== MANAGER DECIDE (approve) — general assessment + recommendation + per-item ratings =====
type ManagerDecideFormProps = {
  items: ContractEvaluationItem[]
  onSubmit: (values: ManagerDecisionFormValues) => Promise<void>
  onCancel: () => void
}

export const ManagerDecideForm = ({ items, onSubmit, onCancel }: ManagerDecideFormProps) => {
  // Parent criteria (those that own sub-items) are headers, not scored. Only leaf criteria
  // — sub-items + top-level criteria without children — are rateable. See the screenshot
  // bug: the old flat list let managers score the parent "Chất lượng thực hiện công việc".
  const parentIds = useMemo(() => getParentItemIds(items), [items])
  const grouped = useMemo<GroupedEvaluationItems[]>(() => groupEvaluationItems(items), [items])
  const childItemsByParent = useMemo(() => buildChildItemsByParent(items), [items])

  const rateableItems = useMemo(
    () =>
      [...items]
        .filter((item) => isRateableItem(item, parentIds))
        .sort((a, b) => a.order - b.order),
    [items, parentIds]
  )

  // Maps an item id → its index in `manager_ratings`, so the grouped layout can wire each
  // leaf row to the right field-array slot (field-array order ≠ display order).
  const ratingIndexByItemId = useMemo(() => {
    const map = new Map<number, number>()
    rateableItems.forEach((item, index) => map.set(item.id, index))
    return map
  }, [rateableItems])

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ManagerDecisionFormValues>({
    resolver: zodResolver(managerDecisionSchema),
    defaultValues: {
      decision: ContractEvaluationDecision.approve,
      recommendation: ContractEvaluationRecommendation.continue,
      general_assessment: '',
      manager_ratings: rateableItems.map((item) => ({ item_id: item.id, rating: null })),
    },
  })

  // Registers `manager_ratings` as a field array so each `item_id` persists to submit.
  useFieldArray({ control, name: 'manager_ratings' })

  const { keysMap, keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_RECOMMENDATION,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_ITEM_RATING,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SECTION_CHOICES,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SUB_SECTION_CHOICES,
    ],
  })

  const recommendationOptions = useMemo(
    () =>
      keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_RECOMMENDATION) ?? [],
    [keysMapOptions]
  )
  const ratingOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_ITEM_RATING) ?? [],
    [keysMapOptions]
  )
  const sectionLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SECTION_CHOICES
  ) as Record<string, string> | undefined
  const subSectionLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CRITERION_SUB_SECTION_CHOICES
  ) as Record<string, string> | undefined

  const handleFormSubmit = useCallback(
    async (values: ManagerDecisionFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  const renderRatingField = useCallback(
    (item: ContractEvaluationItem) => {
      const index = ratingIndexByItemId.get(item.id)
      if (index == null) return null
      return (
        <FormController
          control={control}
          register={register}
          name={`manager_ratings.${index}.rating`}
          Field={RadioGroup}
          fieldProps={{
            id: `manager_ratings_${index}`,
            label: item.name,
            options: ratingOptions,
            orientation: 'horizontal',
          }}
        />
      )
    },
    [control, register, ratingOptions, ratingIndexByItemId]
  )

  const showRatings = rateableItems.length > 0 && ratingOptions.length > 0

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={handleFormSubmit}
      loading={isSubmitting}
      className="flex flex-col gap-4"
    >
      <FormController
        control={control}
        register={register}
        name="recommendation"
        Field={RadioGroup}
        fieldProps={{
          id: 'recommendation',
          label: 'Khuyến nghị',
          options: recommendationOptions,
          orientation: 'horizontal',
          required: true,
        }}
      />

      <FormController
        control={control}
        register={register}
        name="general_assessment"
        Field={TextArea}
        fieldProps={{
          label: 'Nhận xét chung',
          placeholder: 'Nhập nhận xét tổng quan về nhân viên',
          rows: 4,
          required: true,
        }}
      />

      {showRatings && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="typo-body-base-semibold text-content-dark-2">Chấm điểm tiêu chí</span>
          </div>

          {grouped.map((group) => (
            <section key={group.section} className="flex flex-col gap-3">
              <h4 className="text-content-dark-2 typo-body-base-semibold flex items-center gap-2">
                <span className="bg-action-primary-red-default inline-block h-3.5 w-1 rounded-full" />
                {sectionLabels?.[group.section] ?? group.section}
              </h4>

              {group.subSections.map(({ subSection, items: groupItems }) => (
                <div key={subSection ?? '__flat__'} className="flex flex-col gap-1.5">
                  {subSection && (
                    <h5 className="text-content-dark-3 pl-3 text-xs font-medium tracking-wide uppercase">
                      {subSectionLabels?.[subSection] ?? subSection}
                    </h5>
                  )}
                  <ul className="border-border-1 bg-background-1 divide-action-outline-default flex flex-col divide-y overflow-hidden rounded-lg border">
                    {groupItems.map((item) => {
                      const children = childItemsByParent.get(item.id) ?? []
                      const isParent = children.length > 0

                      // Parent criterion: header strip + nested rateable sub-items.
                      if (isParent) {
                        return (
                          <li key={item.id} className="flex flex-col gap-3 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-content-dark-1 text-sm font-semibold">
                                {item.name}
                              </span>
                            </div>
                            <ul className="border-border-1 ml-1 flex flex-col gap-4 border-l-2 pl-4">
                              {children.map((child) => (
                                <li key={child.id}>{renderRatingField(child)}</li>
                              ))}
                            </ul>
                          </li>
                        )
                      }

                      // Leaf criterion: rateable directly.
                      return (
                        <li
                          key={item.id}
                          className="hover:bg-background-2 px-4 py-3 transition-colors"
                        >
                          {renderRatingField(item)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Phê duyệt
        </Button>
      </div>
    </Form>
  )
}

// ===== HR DECIDE (approve) — final HR decision (Part V/VI). INTERN-only HR fields. =====
type HrDecideFormProps = {
  formType: ContractEvaluationFormTypeValue
  onSubmit: (values: HrDecisionFormValues) => Promise<void>
  onCancel: () => void
}

export const HrDecideForm = ({ formType, onSubmit, onCancel }: HrDecideFormProps) => {
  const isIntern = formType === ContractEvaluationFormType.intern

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<HrDecisionFormValues>({
    resolver: zodResolver(hrDecisionSchema),
    defaultValues: {
      decision: ContractEvaluationDecision.approve,
      hr_accepted: undefined,
      hr_contract_term: ContractEvaluationHrContractTerm.probation,
      hr_probation: false,
      hr_proposed_salary: null,
      hr_approved_note: '',
    },
  })

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM],
  })

  const contractTermOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM) ?? [],
    [keysMapOptions]
  )

  const handleFormSubmit = useCallback(
    async (values: HrDecisionFormValues) => {
      // Part V (contract term / salary) is mandatory only for INTERN forms.
      if (isIntern && values.hr_accepted === undefined) {
        setError('hr_accepted', { message: 'Vui lòng chọn tiếp nhận hoặc không tiếp nhận' })
        return
      }
      if (isIntern && !values.hr_contract_term) {
        setError('hr_contract_term', { message: 'Vui lòng chọn loại hợp đồng đề xuất' })
        return
      }
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [isIntern, onSubmit, setError]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={handleFormSubmit}
      loading={isSubmitting}
      className="flex flex-col gap-4"
    >
      {isIntern && (
        <>
          <Controller
            control={control}
            name="hr_accepted"
            render={({ field }) => (
              <RadioGroup
                id="hr_accepted"
                label="Tiếp nhận chính thức"
                required
                disabled={isSubmitting}
                options={[
                  { value: 'true', label: 'Tiếp nhận chính thức' },
                  { value: 'false', label: 'Không tiếp nhận chính thức' },
                ]}
                value={field.value === true ? 'true' : field.value === false ? 'false' : ''}
                onChange={(val) => field.onChange(val === 'true')}
                error={errors.hr_accepted?.message}
              />
            )}
          />
          <FormController
            control={control}
            register={register}
            name="hr_contract_term"
            Field={RadioGroup}
            fieldProps={{
              id: 'hr_contract_term',
              label: 'Loại hợp đồng đề xuất',
              options: contractTermOptions,
              orientation: 'horizontal',
              required: true,
            }}
          />
          <FormController
            control={control}
            register={register}
            name="hr_proposed_salary"
            Field={CurrencyInput}
            fieldProps={{
              label: 'Mức lương đề xuất',
              placeholder: 'Nhập mức lương đề xuất',
            }}
          />
          <Controller
            control={control}
            name="hr_probation"
            render={({ field }) => (
              <Checkbox
                label="Có thử việc thêm"
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
        </>
      )}

      <FormController
        control={control}
        register={register}
        name="hr_approved_note"
        Field={TextArea}
        fieldProps={{
          label: 'Ghi chú phê duyệt',
          placeholder: 'Nhập ghi chú phê duyệt (không bắt buộc)',
          rows: 3,
        }}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Phê duyệt
        </Button>
      </div>
    </Form>
  )
}
