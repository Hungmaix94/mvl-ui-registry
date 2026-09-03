import { useMemo } from 'react'

import { ColoredValueVariant } from '@/api/schema'
import Chip from '@/components/ui/chip/Chip'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

import { ContractEvaluationRecommendation } from '../constants/contract-evaluation-constants'
import type { ManagerDecision } from '../types/contract-evaluation-manager-decision'

type ContractEvaluationManagerDecisionsProps = {
  decisions: ManagerDecision[]
}

// Recommendation → chip color. UI variant only (labels come from useAppConstant).
const RECOMMENDATION_VARIANT: Record<string, ColoredValueVariant> = {
  [ContractEvaluationRecommendation.continue]: ColoredValueVariant.GREEN,
  [ContractEvaluationRecommendation.discontinue]: ColoredValueVariant.RED,
}

/**
 * Per-manager assessments (Part IV) sourced from the v2 `manager_decisions[]`
 * read field — each manager's recommendation chip + narrative. Per-item ratings
 * are surfaced inline in ContractEvaluationItemsField instead.
 */
const ContractEvaluationManagerDecisions = ({
  decisions,
}: ContractEvaluationManagerDecisionsProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_RECOMMENDATION],
  })
  const recommendationLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_APPROVER_RECOMMENDATION
  ) as Record<string, string> | undefined

  const sorted = useMemo(() => [...decisions].sort((a, b) => a.order - b.order), [decisions])

  if (sorted.length === 0) {
    return (
      <div className="bg-background-2 text-content-dark-3 rounded-lg p-4 text-sm">
        Chưa có đánh giá của quản lý.
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {sorted.map((decision) => (
        <li
          key={decision.order}
          className="border-border-1 bg-background-1 flex flex-col gap-2 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-background-2 text-content-dark-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {decision.order}
              </span>
              <span className="typo-body-base-semibold text-content-dark-1">
                {decision.manager?.fullname ?? `Cấp ${decision.order}`}
              </span>
            </div>
            {decision.recommendation && (
              <Chip
                size="small"
                variant={
                  RECOMMENDATION_VARIANT[decision.recommendation] ?? ColoredValueVariant.GREY
                }
                label={recommendationLabels?.[decision.recommendation] ?? decision.recommendation}
              />
            )}
          </div>
          {decision.general_assessment && (
            <p className="text-content-dark-2 pl-8 text-sm whitespace-pre-line">
              {decision.general_assessment}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

export default ContractEvaluationManagerDecisions
