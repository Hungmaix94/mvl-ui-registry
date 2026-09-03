import { type ReactNode, useMemo } from 'react'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type { ContractEvaluation } from '@/features/contract/services/contract-evaluation-hr-service'
import useAppConstant from '@/hooks/useAppConstant'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'

import ContractEvaluationApproversField from '../_shares/components/ContractEvaluationApproversField'
import ContractEvaluationItemsField from '../_shares/components/ContractEvaluationItemsField'
import ContractEvaluationManagerDecisions from '../_shares/components/ContractEvaluationManagerDecisions'
import ContractEvaluationStatusBadge from '../_shares/components/ContractEvaluationStatusBadge'
import {
  type ContractEvaluationRole,
  ContractEvaluationStatus,
} from '../_shares/constants/contract-evaluation-constants'
import {
  ratingsByItemId,
  readManagerDecisions,
} from '../_shares/types/contract-evaluation-manager-decision'

type ContractEvaluationDetailProps = {
  evaluation: ContractEvaluation
  mode: ContractEvaluationRole
}

/** Compact label-above-value pair for definition grids — keeps the value next to
 *  its label instead of stretching a `flex-1` value across the whole viewport. */
const MetaField = ({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) => (
  <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
    <span className="text-content-dark-3 text-xs">{label}</span>
    <span className="text-content-dark-1 typo-body-base-medium break-words">{value || '-'}</span>
  </div>
)

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) => (
  <section className="border-border-1 bg-background-1 rounded-xl border p-5">
    <div className="mb-4 flex flex-col gap-0.5">
      <h3 className="text-content-dark-1 typo-body-lg-semibold">{title}</h3>
      {subtitle && <p className="text-content-dark-3 text-xs">{subtitle}</p>}
    </div>
    {children}
  </section>
)

/**
 * Read-only detail view of a Contract Evaluation (per SRS §6). Desktop layout is a
 * master/detail split: the evaluation substance (criteria, employee opinion, manager
 * assessments) fills the wide main column; the workflow (approver chain + HR decision)
 * sits in a sticky right rail. Action buttons live on the page's PageTitle, not here.
 */
const ContractEvaluationDetail = ({ evaluation, mode }: ContractEvaluationDetailProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM,
    ],
  })

  const formTypeLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE) as
    | Record<string, string>
    | undefined
  const contractTermLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_CONTRACT_TERM) as
    | Record<string, string>
    | undefined

  const managerDecisions = useMemo(() => readManagerDecisions(evaluation), [evaluation])
  const ratingsByItem = useMemo(() => ratingsByItemId(managerDecisions), [managerDecisions])

  // Map approver order → role so the item ratings can label each manager by their
  // actual role (Trưởng phòng / Giám đốc khối…) instead of a cryptic "Cấp N".
  const approverRoleByOrder = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of evaluation.approvers ?? []) map.set(a.order, a.role)
    return map
  }, [evaluation.approvers])

  const proposedSalary = useMemo(() => {
    if (evaluation.hr_proposed_salary == null) return '-'
    const n = Number(evaluation.hr_proposed_salary)
    return Number.isNaN(n) ? evaluation.hr_proposed_salary : n.toLocaleString('vi-VN')
  }, [evaluation.hr_proposed_salary])

  const showHrDecisionBlock = useMemo(() => {
    const s = evaluation.status
    return (
      s === ContractEvaluationStatus.waiting_hr ||
      s === ContractEvaluationStatus.completed ||
      s === ContractEvaluationStatus.rejected
    )
  }, [evaluation.status])

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      {/* Header — identity + status + compact metadata grid */}
      <header className="border-border-1 bg-background-1 rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-content-dark-3 text-xs">Mã phiếu</span>
            <span className="text-content-dark-1 text-2xl font-semibold">
              {evaluation.code || `#${evaluation.id}`}
            </span>
          </div>
          <ContractEvaluationStatusBadge
            coloredStatus={evaluation.colored_status}
            status={evaluation.display_status}
          />
        </div>

        <div className="border-border-1 mt-4 grid grid-cols-2 gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-4">
          <MetaField
            label="Loại phiếu"
            value={formTypeLabels?.[evaluation.form_type] ?? evaluation.form_type}
          />
          <MetaField label="Nhân viên" value={evaluation.employee?.fullname} />
          <MetaField label="Mã NV" value={evaluation.employee?.code} />
          <MetaField label="Hợp đồng" value={evaluation.contract?.code} />
          <MetaField label="Phòng ban" value={evaluation.department_snapshot?.name} />
          <MetaField label="Hạn hoàn thành" value={formatDate(evaluation.deadline)} />
          <MetaField label="Tạo lúc" value={formatDate(evaluation.created_at)} />
          <MetaField label="Cập nhật" value={formatDate(evaluation.updated_at)} />
          {evaluation.note && (
            <MetaField
              label="Ghi chú"
              value={evaluation.note}
              className="col-span-2 sm:col-span-3 lg:col-span-4"
            />
          )}
        </div>
      </header>

      {/* Master / detail grid */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Main column — evaluation substance */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionCard
            title="Phần I & II — Đánh giá theo tiêu chí"
            subtitle="Hiệu quả công việc và thái độ làm việc, kèm điểm của nhân viên và các cấp duyệt."
          >
            <ContractEvaluationItemsField
              items={evaluation.items ?? []}
              ratingsByItem={ratingsByItem}
              approverRoleByOrder={approverRoleByOrder}
            />
          </SectionCard>

          {evaluation.employee_opinions && (
            <SectionCard
              title="Phần III — Ý kiến của nhân viên"
              subtitle={
                evaluation.employee_submitted_at
                  ? `Gửi lúc: ${formatDate(evaluation.employee_submitted_at)}`
                  : undefined
              }
            >
              <blockquote className="bg-background-2 border-border-3 text-content-dark-2 rounded-md border-l-4 px-4 py-3 text-sm whitespace-pre-line">
                {evaluation.employee_opinions}
              </blockquote>
            </SectionCard>
          )}

          {managerDecisions.length > 0 && (
            <SectionCard title="Phần IV — Đánh giá của quản lý">
              <ContractEvaluationManagerDecisions decisions={managerDecisions} />
            </SectionCard>
          )}
        </div>

        {/* Sidebar — workflow + decision (sticky on desktop) */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-4 lg:self-start">
          <SectionCard title="Cấp phê duyệt">
            <ContractEvaluationApproversField
              mode={mode}
              readOnlyApprovers={evaluation.approvers ?? []}
            />
          </SectionCard>

          {showHrDecisionBlock && (
            <SectionCard title="Quyết định HR">
              <div className="flex flex-col gap-4">
                <MetaField
                  label="Loại hợp đồng đề xuất"
                  value={
                    evaluation.hr_contract_term
                      ? (contractTermLabels?.[evaluation.hr_contract_term] ??
                        evaluation.hr_contract_term)
                      : '-'
                  }
                />
                <MetaField
                  label="Thử việc"
                  value={
                    evaluation.hr_probation == null
                      ? '-'
                      : evaluation.hr_probation
                        ? 'Có thử việc'
                        : 'Không thử việc'
                  }
                />
                <MetaField label="Mức lương đề xuất" value={proposedSalary} />
                <MetaField
                  label="Phê duyệt cuối"
                  value={
                    evaluation.hr_is_approved == null
                      ? '-'
                      : evaluation.hr_is_approved
                        ? 'Đã duyệt'
                        : 'Từ chối'
                  }
                />
                {evaluation.hr_approved_at && (
                  <MetaField label="Duyệt lúc" value={formatDate(evaluation.hr_approved_at)} />
                )}
                {evaluation.hr_approved_note && (
                  <MetaField label="Ghi chú HR" value={evaluation.hr_approved_note} />
                )}
                {evaluation.reject_reason && (
                  <MetaField label="Lý do từ chối" value={evaluation.reject_reason} />
                )}
              </div>
            </SectionCard>
          )}
        </aside>
      </div>
    </div>
  )
}

export default ContractEvaluationDetail
