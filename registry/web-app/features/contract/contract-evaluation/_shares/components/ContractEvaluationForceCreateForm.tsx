import { useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, Form, FormController, Select } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { useContractSelect } from '@/hooks/useContractSelect'
import { handleApiError } from '@/utils/error-utils'

import {
  type HrForceCreateFormValues,
  hrForceCreateSchema,
} from '../schemas/contract-evaluation-schema'

type ContractEvaluationForceCreateFormProps = {
  onSubmit: (values: HrForceCreateFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

// API error attr → form field mapping. Force-create returns 400 `existing_id`
// (an evaluation already exists for the contract) and may leak internal model
// field names — surface them on the matching picker.
const API_ERROR_FIELD_MAP: Record<string, string> = {
  employee_id: 'employee_id',
  contract_id: 'contract_id',
  existing_id: 'contract_id',
  contract: 'contract_id',
  employee: 'employee_id',
}

/**
 * HR-only force-create form. Maps to `ForceCreateRequest` { employee_id, contract_id };
 * the backend auto-detects form_type and auto-populates approvers + items.
 */
const ContractEvaluationForceCreateForm = ({
  onSubmit,
  onCancel,
  submitLabel,
}: ContractEvaluationForceCreateFormProps) => {
  const { loadContractOptions, loadInitialContractOptions } = useContractSelect({
    pageSize: PAGE_SIZE,
  })

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<HrForceCreateFormValues>({
    resolver: zodResolver(hrForceCreateSchema),
  })

  const handleFormSubmit = useCallback(
    async (values: HrForceCreateFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError, API_ERROR_FIELD_MAP)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={handleFormSubmit}
      loading={isSubmitting}
      className="flex flex-col gap-5"
    >
      <p className="text-content-dark-3 text-sm">
        Phiếu đánh giá thường được hệ thống tự tạo. Tạo thủ công khi cron bỏ sót hợp đồng đáo hạn —
        hệ thống sẽ tự xác định loại phiếu và sinh cấp duyệt + tiêu chí.
      </p>

      <Controller
        control={control}
        name="employee_id"
        render={({ field, fieldState }) => (
          <EmployeeSelectWithDialog
            label="Nhân viên"
            required
            value={field.value ?? null}
            onChange={(v) => field.onChange(v ?? undefined)}
            error={fieldState.error?.message}
          />
        )}
      />

      <FormController
        control={control}
        register={register}
        name="contract_id"
        Field={Select}
        fieldProps={{
          label: 'Hợp đồng',
          placeholder: 'Chọn hợp đồng đáo hạn',
          loadOptions: loadContractOptions,
          loadInitialOptions: loadInitialContractOptions,
          pageSize: PAGE_SIZE,
          searchPlaceholder: 'Tìm kiếm hợp đồng...',
          enableSearch: true,
          isClearable: true,
          required: true,
        }}
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Huỷ
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel ?? 'Tạo phiếu'}
        </Button>
      </div>
    </Form>
  )
}

export default ContractEvaluationForceCreateForm
