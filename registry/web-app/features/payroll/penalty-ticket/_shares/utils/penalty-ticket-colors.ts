import {
  PatchedPenaltyTicketUpdateRequestViolation_type,
  ColoredValueVariant,
} from '@/api/schema.ts'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'

export function getStatusVariant(status?: PenaltyTicketStatus) {
  switch (status) {
    case PenaltyTicketStatus.PAID:
      return ColoredValueVariant.GREEN
    case PenaltyTicketStatus.UNPAID:
      return ColoredValueVariant.ORANGE
    default:
      return ColoredValueVariant.GREY
  }
}

export function getViolationTypeVariant(type?: PatchedPenaltyTicketUpdateRequestViolation_type) {
  switch (type) {
    case PatchedPenaltyTicketUpdateRequestViolation_type.UNIFORM_ERROR:
      return ColoredValueVariant.PURPLE
    case PatchedPenaltyTicketUpdateRequestViolation_type.UNDER_10_MINUTES:
      return ColoredValueVariant.BLUE
    case PatchedPenaltyTicketUpdateRequestViolation_type.OVER_10_MINUTES:
      return ColoredValueVariant.ORANGE
    case PatchedPenaltyTicketUpdateRequestViolation_type.ABSENT_WITHOUT_REASON:
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}
