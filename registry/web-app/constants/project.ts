import { TObjectValues } from '@/types'

export const PROJECT_DETAIL_TAB = {
  OVERVIEW: 'overview',
  DOCUMENTS: 'documents',
  COMMISSION: 'commission',
} as const

export type ProjectDetailTab = TObjectValues<typeof PROJECT_DETAIL_TAB>

export const PROJECT_DETAIL_TABS: readonly ProjectDetailTab[] = [
  PROJECT_DETAIL_TAB.OVERVIEW,
  PROJECT_DETAIL_TAB.DOCUMENTS,
  PROJECT_DETAIL_TAB.COMMISSION,
]
