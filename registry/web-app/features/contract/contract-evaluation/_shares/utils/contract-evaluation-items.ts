import type { components } from '@/api/schema'

type ContractEvaluationItem = components['schemas']['ContractEvaluationItem']

/** Top-level criteria grouped by `(section, sub_section)`; sub-items nest under a parent. */
export type GroupedEvaluationItems = {
  section: string
  subSections: {
    subSection: string | null
    items: ContractEvaluationItem[]
  }[]
}

/**
 * IDs of criteria that have at least one sub-item — i.e. parent/header criteria.
 * A criterion is a parent when another item references it via `parent_item`.
 * NOTE: `allow_sub_items` does NOT signal this (sub-items carry it too); the only
 * reliable structural signal is the `parent_item` back-reference.
 */
export function getParentItemIds(items: ContractEvaluationItem[]): Set<number> {
  const ids = new Set<number>()
  for (const item of items) {
    if (item.parent_item != null) ids.add(item.parent_item)
  }
  return ids
}

/**
 * Only leaf criteria are rateable. A criterion that owns sub-items is a header — scoring
 * happens on each child. Top-level criteria without sub-items are leaves and rateable too.
 */
export function isRateableItem(item: ContractEvaluationItem, parentIds: Set<number>): boolean {
  return !parentIds.has(item.id)
}

/** Sub-items grouped under their `parent_item`, each list sorted by `order`. */
export function buildChildItemsByParent(
  items: ContractEvaluationItem[]
): Map<number, ContractEvaluationItem[]> {
  const map = new Map<number, ContractEvaluationItem[]>()
  for (const item of items) {
    if (item.parent_item != null) {
      if (!map.has(item.parent_item)) map.set(item.parent_item, [])
      map.get(item.parent_item)!.push(item)
    }
  }
  for (const [, list] of map) list.sort((a, b) => a.order - b.order)
  return map
}

/**
 * Top-level criteria (`parent_item == null`) grouped by `(section, sub_section)`,
 * sorted by `order`. Sub-items are intentionally excluded here — they are reached via
 * {@link buildChildItemsByParent} and rendered nested under their parent.
 */
export function groupEvaluationItems(items: ContractEvaluationItem[]): GroupedEvaluationItems[] {
  const bySection = new Map<string, Map<string | null, ContractEvaluationItem[]>>()

  const sorted = [...items].sort((a, b) => a.order - b.order)
  for (const item of sorted) {
    if (item.parent_item != null) continue
    const sectionKey = item.section
    const subSectionKey = item.sub_section ?? null

    if (!bySection.has(sectionKey)) bySection.set(sectionKey, new Map())
    const subSectionMap = bySection.get(sectionKey)!
    if (!subSectionMap.has(subSectionKey)) subSectionMap.set(subSectionKey, [])
    subSectionMap.get(subSectionKey)!.push(item)
  }

  return Array.from(bySection.entries()).map(([section, subSectionMap]) => ({
    section,
    subSections: Array.from(subSectionMap.entries()).map(([subSection, sectionItems]) => ({
      subSection,
      items: sectionItems,
    })),
  }))
}
