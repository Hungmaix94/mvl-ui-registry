import {
  ContractEvaluationApproverRole as ContractEvaluationApproverRoleSchema,
  ContractEvaluationApproverStatus as ContractEvaluationApproverStatusSchema,
  ContractEvaluationCriterionSection as ContractEvaluationCriterionSectionSchema,
  ContractEvaluationCriterionSub_section as ContractEvaluationCriterionSubSectionSchema,
  ContractEvaluationHr_contract_term as ContractEvaluationHrContractTermSchema,
  ContractEvaluationItemEmployee_rating as ContractEvaluationItemRatingSchema,
  HrDecisionRequestDecision as ContractEvaluationDecisionSchema,
  ManagerDecisionRequestRecommendation as ContractEvaluationRecommendationSchema,
} from '@/api/schema'
import {
  ContractEvaluationFormType as ContractEvaluationFormTypeSchema,
  ContractEvaluationStatus as ContractEvaluationStatusSchema,
  ContractEvaluationDisplayStatus as ContractEvaluationDisplayStatusSchema,
} from '@/constants/api-schema-aliases'
// ===== ENUM ALIASES =====
// Short local names for the auto-generated schema enums so call-sites read cleanly.
// All consumers MUST import from this file — never alias inline at the call-site.
export const ContractEvaluationFormType = ContractEvaluationFormTypeSchema
export type ContractEvaluationFormType =
  (typeof ContractEvaluationFormTypeSchema)[keyof typeof ContractEvaluationFormTypeSchema]

export const ContractEvaluationStatus = ContractEvaluationStatusSchema
export type ContractEvaluationStatus =
  (typeof ContractEvaluationStatusSchema)[keyof typeof ContractEvaluationStatusSchema]

// Granular workflow status shown on the badge (`display_status`). Unlike the coarse
// `status` enum, this distinguishes `waiting_block_director` from `waiting_manager`.
export const ContractEvaluationDisplayStatus = ContractEvaluationDisplayStatusSchema
export type ContractEvaluationDisplayStatus =
  (typeof ContractEvaluationDisplayStatusSchema)[keyof typeof ContractEvaluationDisplayStatusSchema]

export const ContractEvaluationApproverRole = ContractEvaluationApproverRoleSchema
export type ContractEvaluationApproverRole =
  (typeof ContractEvaluationApproverRoleSchema)[keyof typeof ContractEvaluationApproverRoleSchema]

export const ContractEvaluationApproverStatus = ContractEvaluationApproverStatusSchema
export type ContractEvaluationApproverStatus =
  (typeof ContractEvaluationApproverStatusSchema)[keyof typeof ContractEvaluationApproverStatusSchema]

// Manager/HR "khuyến nghị" (continue/discontinue). Sourced from the BE
// `ManagerDecisionRequestRecommendation` enum; named domain-neutral here.
export const ContractEvaluationRecommendation = ContractEvaluationRecommendationSchema
export type ContractEvaluationRecommendation =
  (typeof ContractEvaluationRecommendationSchema)[keyof typeof ContractEvaluationRecommendationSchema]

// Decision discriminator (approve/reject) shared by manager + HR decision payloads.
// Sourced from the BE `HrDecisionRequestDecision` enum (both request types reuse it).
export const ContractEvaluationDecision = ContractEvaluationDecisionSchema
export type ContractEvaluationDecision =
  (typeof ContractEvaluationDecisionSchema)[keyof typeof ContractEvaluationDecisionSchema]

export const ContractEvaluationHrContractTerm = ContractEvaluationHrContractTermSchema
export type ContractEvaluationHrContractTerm =
  (typeof ContractEvaluationHrContractTermSchema)[keyof typeof ContractEvaluationHrContractTermSchema]

export const ContractEvaluationItemRating = ContractEvaluationItemRatingSchema
export type ContractEvaluationItemRating =
  (typeof ContractEvaluationItemRatingSchema)[keyof typeof ContractEvaluationItemRatingSchema]

export const ContractEvaluationCriterionSection = ContractEvaluationCriterionSectionSchema
export type ContractEvaluationCriterionSection =
  (typeof ContractEvaluationCriterionSectionSchema)[keyof typeof ContractEvaluationCriterionSectionSchema]

export const ContractEvaluationCriterionSubSection = ContractEvaluationCriterionSubSectionSchema
export type ContractEvaluationCriterionSubSection =
  (typeof ContractEvaluationCriterionSubSectionSchema)[keyof typeof ContractEvaluationCriterionSubSectionSchema]

// ===== PERMISSION CODES =====
// Source of truth: `**Require permission:** \`xxx\`` JSDoc lines in src/api/schema.ts.
// Per SRS docs/srs/srs/docs/features/hrm/contract_evalution §4.1. Never hardcode any of
// these strings at a call-site — always import from here.
// NOTE: phiếu được hệ thống auto-tạo (Celery 06:00) + 1 escape hatch HR force_create.
// Không còn endpoint create/update/destroy top-level — không khai báo các permission đó.
// NV (Me) scope do mobile xử lý — web không expose self-service screens.
export const CONTRACT_EVALUATION_PERMISSIONS = {
  CRITERIA: {
    LIST: 'contract_evaluation_criterion.list',
    RETRIEVE: 'contract_evaluation_criterion.retrieve',
    DROPDOWN: 'contract_evaluation_criterion.dropdown',
    HISTORIES: 'contract_evaluation_criterion.histories',
    HISTORY_DETAIL: 'contract_evaluation_criterion.history_detail',
  },
  HR: {
    LIST: 'contract_evaluation_hr.list',
    RETRIEVE: 'contract_evaluation_hr.retrieve',
    PARTIAL_UPDATE: 'contract_evaluation_hr.partial_update',
    DECISION: 'contract_evaluation_hr.decision',
    REASSIGN_APPROVER: 'contract_evaluation_hr.reassign_approver',
    REVOKE_APPROVAL: 'contract_evaluation_hr.revoke_approval',
    DROPDOWN: 'contract_evaluation_hr.dropdown',
    FORCE_CREATE: 'contract_evaluation_hr.force_create',
    HISTORIES: 'contract_evaluation_hr.histories',
    HISTORY_DETAIL: 'contract_evaluation_hr.history_detail',
  },
  MANAGER: {
    LIST: 'contract_evaluation_manager.list',
    RETRIEVE: 'contract_evaluation_manager.retrieve',
    PARTIAL_UPDATE: 'contract_evaluation_manager.partial_update',
    DECISION: 'contract_evaluation_manager.decision',
    HISTORIES: 'contract_evaluation_manager.histories',
    HISTORY_DETAIL: 'contract_evaluation_manager.history_detail',
  },
} as const

// ===== ROLE MODE =====
// Web FE drives 2 scopes: HR + Manager. NV (Me) self-service do mobile xử lý — web
// không có route, menu, hoặc page nào trỏ tới `/contract/evaluation/me/...`.
export const CONTRACT_EVALUATION_ROLE = {
  HR: 'hr',
  MANAGER: 'manager',
} as const

export type ContractEvaluationRole =
  (typeof CONTRACT_EVALUATION_ROLE)[keyof typeof CONTRACT_EVALUATION_ROLE]
