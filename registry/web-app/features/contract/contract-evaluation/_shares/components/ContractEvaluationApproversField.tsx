import { useMemo } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import type { components } from '@/api/schema'
import { Button } from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { formatDate } from '@/utils/date-utils'

import {
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationApproverRole,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'

import ContractEvaluationStatusBadge from './ContractEvaluationStatusBadge'

type ContractEvaluationApprover = components['schemas']['ContractEvaluationApprover']

export type ApproverFieldValue = {
  /** Picker leaves this undefined until the user selects an employee — the
   *  Zod schema enforces positive() at submit so empty rows can't slip through. */
  approver?: number
  order: number
  role: ContractEvaluationApproverRole
  approved_note?: string
}

type ContractEvaluationApproversFieldProps = {
  /**
   * Read-only data from the API. When provided, the component renders a
   * non-editable list. Use this for detail pages and Manager view.
   */
  readOnlyApprovers?: ContractEvaluationApprover[]
  /**
   * Role of the current viewer. Used purely for read-only display
   * (e.g. to surface the "your turn" hint). Edit-mode gating is driven by
   * the parent — pass readOnlyApprovers to render read-only.
   */
  mode: ContractEvaluationRole
  /**
   * Form-array field name when editing. Defaults to `approvers`. Only
   * consulted when readOnlyApprovers is undefined.
   */
  fieldName?: 'approvers'
}

/**
 * Renders the approver chain for a Contract Evaluation. Two modes:
 *  - Read-only: pass `readOnlyApprovers` from the API. Shows the chain state
 *    (role, status, decided-at, approval/reassign notes). The per-manager
 *    narrative + recommendation now live in `manager_decisions[]` and are
 *    rendered by ContractEvaluationManagerDecisions, not here.
 *  - Editable: omit `readOnlyApprovers` and use inside a parent RHF form that
 *    declares `approvers: ApproverFieldValue[]`. The HR composite form uses
 *    this path.
 */
const ContractEvaluationApproversField = ({
  readOnlyApprovers,
  mode,
  fieldName = 'approvers',
}: ContractEvaluationApproversFieldProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_ROLE],
  })

  const roleLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_ROLE) as
    | Record<string, string>
    | undefined

  if (readOnlyApprovers) {
    return <ReadOnlyApproverList approvers={readOnlyApprovers} />
  }

  // Editable mode — HR composite form. The parent must have called
  // useForm({ defaultValues: { approvers: [...] } }) so this hook can attach.
  return <EditableApproverList fieldName={fieldName} roleLabels={roleLabels} mode={mode} />
}

type ReadOnlyApproverListProps = {
  approvers: ContractEvaluationApprover[]
}

function ReadOnlyApproverList({ approvers }: ReadOnlyApproverListProps) {
  const sorted = useMemo(() => [...approvers].sort((a, b) => a.order - b.order), [approvers])

  if (sorted.length === 0) {
    return (
      <div className="bg-background-2 text-content-dark-3 rounded-md p-4">
        Chưa có người duyệt nào được phân công.
      </div>
    )
  }

  return (
    <ol className="flex flex-col">
      {sorted.map((approver, index) => (
        <li key={approver.id} className="relative flex gap-3 pb-5 last:pb-0">
          {/* Connector line between steps */}
          {index < sorted.length - 1 && (
            <span className="bg-border-1 absolute top-7 left-3 h-[calc(100%-1.25rem)] w-px" />
          )}
          {/* Order index */}
          <span className="bg-background-2 text-content-dark-2 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {approver.order}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="typo-body-base-semibold text-content-dark-1">
                {approver.approver?.fullname ?? `#${approver.approver?.id ?? '-'}`}
              </span>
              <ContractEvaluationStatusBadge
                coloredStatus={approver.colored_status}
                labelKey={APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_STATUS}
              />
            </div>
            <span className="text-content-dark-3 text-xs">
              {approver.approver?.position?.name ?? '-'}
              {approver.approved_at ? ` · ${formatDate(approver.approved_at)}` : ''}
            </span>

            {approver.approved_note && (
              <div className="text-content-dark-2 text-xs">
                <span className="text-content-dark-3">Ghi chú: </span>
                {approver.approved_note}
              </div>
            )}

            {approver.reassign_reason && (
              <div className="text-content-dark-2 text-xs">
                <span className="text-content-dark-3">Lý do chuyển: </span>
                {approver.reassign_reason}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

type EditableApproverListProps = {
  fieldName: 'approvers'
  roleLabels?: Record<string, string>
  mode: ContractEvaluationRole
}

const ROLE_ORDER = [
  ContractEvaluationApproverRole.department_leader,
  ContractEvaluationApproverRole.block_director,
  ContractEvaluationApproverRole.hr_leader,
] as const

function EditableApproverList({ fieldName, roleLabels, mode }: EditableApproverListProps) {
  // useFormContext is provided by the parent's <FormProvider>. The composite
  // form must wrap children with FormProvider for editable approver/items.
  const formContext = useFormContext<{ approvers: ApproverFieldValue[] }>()
  const { fields, append, remove } = useFieldArray({
    control: formContext.control,
    name: fieldName,
  })

  const isHrMode = mode === CONTRACT_EVALUATION_ROLE.HR
  const usedRoles = new Set(fields.map((f) => f.role))
  const availableRoles = ROLE_ORDER.filter((r) => !usedRoles.has(r))

  const addRole = (role: ContractEvaluationApproverRole) => {
    append({
      approver: undefined,
      order: fields.length + 1,
      role,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <div className="bg-background-2 text-content-dark-3 rounded-md p-4">
          Chưa có người duyệt nào.{' '}
          {isHrMode ? 'Bấm thêm cấp duyệt bên dưới.' : 'Chờ HR phân công cấp duyệt.'}
        </div>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border-border-1 bg-background-1 flex flex-wrap items-end gap-3 rounded-md border p-4"
        >
          <div className="text-content-dark-2 typo-body-base-semibold min-w-[120px]">
            {roleLabels?.[field.role] ?? field.role}
          </div>

          <div className="min-w-[260px] flex-1">
            <EmployeeSelectWithDialog
              label="Người duyệt"
              required
              value={formContext.watch(`${fieldName}.${index}.approver`) ?? null}
              onChange={(v) =>
                formContext.setValue(`${fieldName}.${index}.approver`, v ?? undefined, {
                  shouldValidate: true,
                })
              }
              disabled={!isHrMode}
            />
          </div>

          {isHrMode && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => remove(index)}
              className="border-action-primary-red-default text-action-primary-red-default hover:bg-action-primary-red-disabled"
            >
              Xoá
            </Button>
          )}
        </div>
      ))}

      {isHrMode && availableRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => (
            <Button key={role} type="button" variant="secondary" onClick={() => addRole(role)}>
              Thêm {roleLabels?.[role] ?? role}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ContractEvaluationApproversField
