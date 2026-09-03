import { useCallback, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Grid } from '@radix-ui/themes'

import DetailRow from '@/components/commons/DetailRow'
import {
  Button,
  Checkbox,
  CurrencyInput,
  Form,
  FormController,
  RadioGroup,
  TextArea,
} from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type {
  ContractEvaluation,
  PatchedContractEvaluationRequest,
} from '@/features/contract/services/contract-evaluation-hr-service'
import useAppConstant from '@/hooks/useAppConstant'
import { formatDateToApi } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'

import {
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationFormType,
  type ContractEvaluationFormType as ContractEvaluationFormTypeValue,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'
import {
  type EvaluationEditFormValues,
  evaluationEditSchema,
} from '../schemas/contract-evaluation-schema'
import {
  ratingsByItemId,
  readManagerDecisions,
} from '../types/contract-evaluation-manager-decision'

import ContractEvaluationItemsField from './ContractEvaluationItemsField'

type ContractEvaluationFormProps = {
  mode: ContractEvaluationRole
  /** Persisted form type — drives whether INTERN-only HR fields render. */
  formType: ContractEvaluationFormTypeValue
  initialData: ContractEvaluation
  onSubmit: (data: PatchedContractEvaluationRequest) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const API_ERROR_FIELD_MAP: Record<string, string> = {
  hr_accepted: 'hr_accepted',
  hr_contract_term: 'hr_contract_term',
  hr_probation: 'hr_probation',
  hr_proposed_salary: 'hr_proposed_salary',
  hr_approved_note: 'hr_approved_note',
  deadline: 'deadline',
  note: 'note',
}

/**
 * Edit (partial-update) form for a Contract Evaluation — maps to
 * `PatchedContractEvaluationRequest`. Contract, department and the approver chain
 * are BE-managed and shown read-only. Editable: deadline + internal note, plus the
 * HR decision fields (INTERN-only: contract term / probation / proposed salary).
 */
const ContractEvaluationForm = ({
  mode,
  formType,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: ContractEvaluationFormProps) => {
  const isHr = mode === CONTRACT_EVALUATION_ROLE.HR
  const isIntern = formType === ContractEvaluationFormType.intern

  const { keysMap, keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE,
    ],
  })

  const contractTermOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM) ?? [],
    [keysMapOptions]
  )
  const formTypeLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE) as
    | Record<string, string>
    | undefined

  const ratingsByItem = useMemo(
    () => ratingsByItemId(readManagerDecisions(initialData)),
    [initialData]
  )

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<EvaluationEditFormValues>({
    resolver: zodResolver(evaluationEditSchema),
    defaultValues: {
      hr_contract_term: initialData.hr_contract_term ?? null,
      hr_probation: initialData.hr_probation ?? null,
      hr_proposed_salary:
        initialData.hr_proposed_salary != null ? Number(initialData.hr_proposed_salary) : null,
      hr_approved_note: initialData.hr_approved_note ?? '',
      // Edit page passes the API date string directly — no `new Date(...)` wrapping.
      deadline: initialData.deadline ?? null,
      note: initialData.note ?? '',
    },
  })

  const handleFormSubmit = useCallback(
    async (values: EvaluationEditFormValues) => {
      try {
        const data: PatchedContractEvaluationRequest = {
          deadline: values.deadline ? formatDateToApi(values.deadline) : undefined,
          note: values.note || undefined,
          ...(isHr
            ? {
                hr_approved_note: values.hr_approved_note || undefined,
                ...(isIntern
                  ? {
                      hr_contract_term: values.hr_contract_term ?? undefined,
                      hr_probation: values.hr_probation ?? undefined,
                      // CurrencyInput → number; API expects a decimal string.
                      hr_proposed_salary:
                        values.hr_proposed_salary != null
                          ? String(values.hr_proposed_salary)
                          : undefined,
                    }
                  : {}),
              }
            : {}),
        }
        await onSubmit(data)
      } catch (error) {
        handleApiError(error, setError, API_ERROR_FIELD_MAP)
      }
    },
    [isHr, isIntern, onSubmit, setError]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={handleFormSubmit}
      loading={isSubmitting}
      className="flex flex-col gap-8"
    >
      {/* Read-only subject context (contract / department / approver chain are BE-managed). */}
      <section className="border-border-1 bg-background-1 rounded-md border p-4">
        <h3 className="text-content-dark-1 typo-body-base-semibold mb-2">Đối tượng đánh giá</h3>
        <DetailRow
          label="Loại phiếu"
          value={formTypeLabels?.[initialData.form_type] ?? initialData.form_type}
        />
        <DetailRow label="Nhân viên" value={initialData.employee?.fullname ?? '-'} />
        <DetailRow label="Hợp đồng" value={initialData.contract?.code ?? '-'} />
        <DetailRow label="Phòng ban" value={initialData.department_snapshot?.name ?? '-'} />
      </section>

      {/* Editable metadata */}
      <section className="flex flex-col gap-5">
        <Grid columns={'2'} gap={'5'}>
          <FormController
            control={control}
            register={register}
            name="deadline"
            Field={DatePicker}
            fieldProps={{ label: 'Hạn hoàn thành', placeholder: 'Chọn hạn' }}
          />
          <div />
        </Grid>
        <FormController
          control={control}
          register={register}
          name="note"
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú nội bộ',
            placeholder: 'Ghi chú nội bộ (không bắt buộc)',
            rows: 2,
          }}
        />
      </section>

      {/* Employee voice (read-only quote). */}
      {initialData.employee_opinions && (
        <section className="flex flex-col gap-2">
          <h3 className="text-content-dark-1 typo-body-lg-semibold">Ý kiến nhân viên</h3>
          <blockquote className="bg-background-2 border-border-3 text-content-dark-2 rounded-md border-l-4 px-4 py-3 text-sm whitespace-pre-line italic">
            {initialData.employee_opinions}
          </blockquote>
        </section>
      )}

      {/* HR decision fields (HR mode). INTERN-only: contract term / probation / salary. */}
      {isHr && (
        <section className="border-action-primary-red-default bg-background-2 flex flex-col gap-5 rounded-md border-l-4 px-5 py-5">
          <header className="flex flex-col gap-1">
            <h3 className="text-content-dark-1 typo-body-lg-semibold">Quyết định HR</h3>
            <p className="text-content-dark-3 text-sm">
              Điều khoản hợp đồng và mức lương đề xuất sau khi HR đánh giá xong.
            </p>
          </header>

          {isIntern && contractTermOptions.length > 0 && (
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
              }}
            />
          )}

          {isIntern && (
            <>
              <Grid columns={'2'} gap={'5'}>
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
                <div />
              </Grid>
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
              label: 'Ghi chú phê duyệt HR',
              placeholder: 'Ghi chú khi phê duyệt cuối',
              rows: 3,
            }}
          />
        </section>
      )}

      {/* Criteria items (read-only). */}
      {initialData.items && initialData.items.length > 0 && (
        <section className="flex flex-col gap-3">
          <header className="border-border-1 flex flex-col gap-1 border-b pb-2">
            <h3 className="text-content-dark-1 typo-body-lg-semibold">Tiêu chí đánh giá</h3>
            <p className="text-content-dark-3 text-sm">
              Bộ tiêu chí được sinh tự động khi tạo phiếu. Chỉ đọc.
            </p>
          </header>
          <ContractEvaluationItemsField items={initialData.items} ratingsByItem={ratingsByItem} />
        </section>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Huỷ
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel ?? 'Lưu thay đổi'}
        </Button>
      </div>
    </Form>
  )
}

export default ContractEvaluationForm
