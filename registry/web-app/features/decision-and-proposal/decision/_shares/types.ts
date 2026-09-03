import {
  type Decision,
  type DecisionRequest,
} from '@/features/decision-and-proposal/services/decision-service'

import { DateRange } from 'react-day-picker'

export type DecisionFilterFormValues = {
  effective_date_range?: DateRange | null
}

export type DecisionFormValues = {
  decision_number: string
  name: string
  signing_date: string
  signer_id: number | null
  effective_date: string
  reason?: string | null
  content?: string | null
  note?: string | null
  signing_status: string
  attachment_ids: number[]
}

export type { Decision, DecisionRequest }
