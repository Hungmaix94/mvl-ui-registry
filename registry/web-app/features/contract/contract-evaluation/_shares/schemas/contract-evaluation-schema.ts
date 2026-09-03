import { z } from 'zod'

import {
  ContractEvaluationDecision,
  ContractEvaluationHrContractTerm,
  ContractEvaluationItemRating,
  ContractEvaluationRecommendation,
} from '../constants/contract-evaluation-constants'

// ===== MANAGER DECISION (POST /manager/{id}/decision/) per FSD §3.3 =====
// Maps to `ManagerDecisionRequest`:
//   approve → { decision, general_assessment, recommendation, manager_ratings[] }
//   reject  → { decision, reject_reason }
// Flat object + `decision` discriminator + `.superRefine()` → friendlier with RHF
// than discriminatedUnion. `manager_ratings` items map to `_ManagerItemRatingRequest`.
export const managerRatingSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  // Optional per BE (`_ManagerItemRatingRequest.rating`): omit to leave unchanged.
  rating: z.nativeEnum(ContractEvaluationItemRating).nullish(),
})

export const managerDecisionSchema = z
  .object({
    decision: z.nativeEnum(ContractEvaluationDecision, {
      required_error: 'Vui lòng chọn hành động',
    }),
    // Approve fields (optional at schema level; superRefine validates when decision=approve)
    general_assessment: z.string().optional(),
    recommendation: z.nativeEnum(ContractEvaluationRecommendation).nullish(),
    manager_ratings: z.array(managerRatingSchema).optional(),
    // Reject field
    reject_reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === ContractEvaluationDecision.approve) {
      if (!data.general_assessment || data.general_assessment.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['general_assessment'],
          message: 'Vui lòng nhập nhận xét chung',
        })
      }
      if (!data.recommendation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recommendation'],
          message: 'Vui lòng chọn khuyến nghị',
        })
      }
    } else if (data.decision === ContractEvaluationDecision.reject) {
      if (!data.reject_reason || data.reject_reason.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reject_reason'],
          message: 'Vui lòng nhập lý do từ chối',
        })
      }
    }
  })

export type ManagerDecisionFormValues = z.infer<typeof managerDecisionSchema>

// ===== HR DECISION (POST /hr/{id}/decision/) per FSD §3.4 =====
// Maps to `HrDecisionRequest`. HR does NOT submit manager-style assessment/
// recommendation/ratings — those are manager-only (`manager_decisions[]`). HR fields:
//   - hr_accepted / hr_contract_term / hr_probation / hr_proposed_salary → INTERN only
//     (BRD Part V), gated at the component level (schema can't see form_type here).
//   - hr_approved_note → both form types.
export const hrDecisionSchema = z
  .object({
    decision: z.nativeEnum(ContractEvaluationDecision, {
      required_error: 'Vui lòng chọn hành động',
    }),
    hr_accepted: z.boolean().nullish(),
    hr_contract_term: z.nativeEnum(ContractEvaluationHrContractTerm).nullish(),
    hr_probation: z.boolean().nullish(),
    // CurrencyInput emits a `number`; the API serializes this decimal as a string.
    // Keep it a number in form state (no transform → no RHF resolver friction) and
    // convert to string at submit time.
    hr_proposed_salary: z.number().nullish(),
    hr_approved_note: z.string().optional(),
    // Reject
    reject_reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === ContractEvaluationDecision.reject) {
      if (!data.reject_reason || data.reject_reason.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reject_reason'],
          message: 'Vui lòng nhập lý do từ chối',
        })
      }
    }
  })

export type HrDecisionFormValues = z.infer<typeof hrDecisionSchema>

// ===== HR FORCE-CREATE (POST /hr/force-create/) =====
// Maps to `ForceCreateRequest`: BE only needs employee + contract; it auto-detects
// form_type and auto-populates approvers + items. Returns 200 (or 400 `existing_id`
// when an evaluation already exists for the contract — surfaced as a field error).
export const hrForceCreateSchema = z.object({
  employee_id: z.coerce.number({ required_error: 'Vui lòng chọn nhân viên' }).int().positive(),
  contract_id: z.coerce.number({ required_error: 'Vui lòng chọn hợp đồng' }).int().positive(),
})

export type HrForceCreateFormValues = z.infer<typeof hrForceCreateSchema>

// ===== EDIT (PATCH /{hr|manager}/{id}/) =====
// Maps to `PatchedContractEvaluationRequest`. Editable subset only — contract,
// department_snapshot and the approver chain are BE-managed and read-only.
// `hr_proposed_salary` stays a number in form state (CurrencyInput) → string at submit.
export const evaluationEditSchema = z.object({
  hr_contract_term: z.nativeEnum(ContractEvaluationHrContractTerm).nullish(),
  hr_probation: z.boolean().nullish(),
  hr_proposed_salary: z.number().nullish(),
  hr_approved_note: z.string().optional(),
  // DatePicker emits 'DD/MM/YYYY'; converted to the API format at submit time
  // (no z.preprocess → keeps form input/output types identical for the resolver).
  deadline: z.string().nullish(),
  note: z.string().optional(),
})

export type EvaluationEditFormValues = z.infer<typeof evaluationEditSchema>

// ===== REASSIGN APPROVER (HR-only, POST /hr/{id}/reassign-approver/) =====
// Form collects { order, approver, reassign_reason }; the hook maps to `ReassignApproverRequest`
// { order, new_approver_id, reason } — `order` is the pending/skipped approver row being replaced
// (derived from the evaluation's approver chain).
export const evaluationReassignSchema = z.object({
  order: z.coerce.number({ required_error: 'Vui lòng chọn cấp duyệt cần chuyển' }).int().positive(),
  approver: z.coerce.number({ required_error: 'Vui lòng chọn người duyệt mới' }).int().positive(),
  reassign_reason: z.string().min(1, 'Vui lòng nhập lý do chuyển'),
})

export type EvaluationReassignFormValues = z.infer<typeof evaluationReassignSchema>

// ===== REVOKE APPROVAL (HR-only, POST /hr/{id}/revoke-approval/) =====
// Maps to `HrRevokeRequest` { reject_reason } — flips COMPLETED → WAITING_HR.
// `reject_reason` is REQUIRED by BE, so the revoke flow collects a reason.
export const evaluationRevokeSchema = z.object({
  reject_reason: z.string().min(1, 'Vui lòng nhập lý do thu hồi'),
})

export type EvaluationRevokeFormValues = z.infer<typeof evaluationRevokeSchema>

// ===== REJECT (standalone reject form local validation) =====
// The reject hook sends `{ decision: 'reject', reject_reason }` to the shared
// `/decision/` endpoint (manager or HR scope).
export const evaluationRejectSchema = z.object({
  reject_reason: z.string().min(1, 'Vui lòng nhập lý do từ chối'),
})

export type EvaluationRejectFormValues = z.infer<typeof evaluationRejectSchema>
