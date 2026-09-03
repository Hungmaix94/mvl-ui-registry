import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { components } from '@/api/schema'
import { Button, Form, FormController, Select, TextArea } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { handleApiError } from '@/utils/error-utils'

import { ContractEvaluationApproverStatus } from '../constants/contract-evaluation-constants'
import {
  type EvaluationReassignFormValues,
  evaluationReassignSchema,
} from '../schemas/contract-evaluation-schema'

type ContractEvaluationApprover = components['schemas']['ContractEvaluationApprover']

type ContractEvaluationReassignFormProps = {
  approvers: ContractEvaluationApprover[]
  onSubmit: (values: EvaluationReassignFormValues) => Promise<void>
  onCancel: () => void
}

/**
 * HR-only: pick a new approver and provide a reassign reason.
 *
 * This form renders inside the global (single-instance) dialog, so it uses the
 * searchable async `Select` rather than `EmployeeSelectWithDialog` — the latter opens
 * its own "Tìm nhân viên" dialog which would replace this one and break the flow. The
 * Select's built-in search by name/code is enough to pick a single new approver.
 */
const ContractEvaluationReassignForm = ({
  approvers,
  onSubmit,
  onCancel,
}: ContractEvaluationReassignFormProps) => {
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
    fields: ['code', 'id', 'fullname', 'branch', 'block', 'department'],
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<EvaluationReassignFormValues>({
    resolver: zodResolver(evaluationReassignSchema),
  })

  const filterApprovers = useMemo(() => {
    return (approvers ?? []).filter(
      (a) =>
        a.status === ContractEvaluationApproverStatus.pending ||
        a.status === ContractEvaluationApproverStatus.skipped
    )
  }, [approvers])

  const approverOptions = useMemo(() => {
    return filterApprovers.map((a) => ({
      value: String(a.order),
      label: `${a.approver?.fullname ?? ''} (${a.order}) - ${
        a.status === ContractEvaluationApproverStatus.pending ? 'Đang chờ' : 'Bỏ qua'
      }`,
    }))
  }, [filterApprovers])

  const handleFormSubmit = useCallback(
    async (values: EvaluationReassignFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

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
        name="order"
        Field={Select}
        fieldProps={{
          label: 'Cấp duyệt cần chuyển',
          placeholder: 'Chọn cấp duyệt cần chuyển',
          options: approverOptions,
          required: true,
        }}
      />

      <FormController
        control={control}
        register={register}
        name="approver"
        Field={Select}
        fieldProps={{
          label: 'Người duyệt mới',
          placeholder: 'Nhập/chọn họ tên hoặc mã nhân viên',
          loadOptions: loadEmployeeOptions,
          loadInitialOptions: loadInitialEmployeeOptions,
          pageSize: PAGE_SIZE,
          searchPlaceholder: 'Tìm kiếm nhân viên...',
          enableSearch: true,
          isClearable: true,
          required: true,
        }}
      />

      <FormController
        control={control}
        register={register}
        name="reassign_reason"
        Field={TextArea}
        fieldProps={{
          label: 'Lý do chuyển',
          placeholder: 'Nhập lý do chuyển người duyệt',
          rows: 3,
          required: true,
        }}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Chuyển người duyệt
        </Button>
      </div>
    </Form>
  )
}

export default ContractEvaluationReassignForm
