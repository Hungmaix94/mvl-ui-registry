import type { ContractEvaluation } from '@/features/contract/services/contract-evaluation-hr-service'

import type {
  ContractEvaluationApproverStatus,
  ContractEvaluationItemRating,
  ContractEvaluationRecommendation,
} from '../constants/contract-evaluation-constants'

/**
 * Per-manager assessment row surfaced by the v2 read model.
 *
 * BE GAP: `ContractEvaluation.manager_decisions` is typed `string` in the generated
 * schema (an un-annotated `SerializerMethodField`) but is delivered as a JSON array.
 * Parse it through {@link readManagerDecisions} — never read the field directly.
 *
 * Shape confirmed from FSD §3.3 decision response:
 *   { manager, order, status, recommendation, general_assessment, manager_ratings[] }
 */
export type ManagerItemRating = {
  item_id: number
  rating: ContractEvaluationItemRating | null
}

export type ManagerDecision = {
  manager: { id: number; fullname: string }
  order: number
  status: ContractEvaluationApproverStatus
  recommendation: ContractEvaluationRecommendation | null
  general_assessment: string
  manager_ratings: ManagerItemRating[]
}

/**
 * Safely read `manager_decisions` off an evaluation. Handles array (typed-correctly
 * by a future BE fix), JSON string (current `string` typing), and null/malformed.
 */
export function readManagerDecisions(
  evaluation: Pick<ContractEvaluation, 'manager_decisions'> | null | undefined
): ManagerDecision[] {
  const raw = evaluation?.manager_decisions as unknown
  if (Array.isArray(raw)) return raw as ManagerDecision[]
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ManagerDecision[]) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Index per-item manager ratings by `item_id` for O(1) lookup while rendering the
 * criterion list. Skips ratings that were left unset.
 */
export function ratingsByItemId(
  decisions: ManagerDecision[]
): Map<number, { order: number; rating: ContractEvaluationItemRating }[]> {
  const map = new Map<number, { order: number; rating: ContractEvaluationItemRating }[]>()
  for (const decision of decisions) {
    for (const rating of decision.manager_ratings ?? []) {
      if (!rating.rating) continue
      const existing = map.get(rating.item_id) ?? []
      existing.push({ order: decision.order, rating: rating.rating })
      map.set(rating.item_id, existing)
    }
  }
  return map
}
