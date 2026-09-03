import { EmployeeEthnicity } from '@/api/schema'
import type { SelectOption } from '@/components/ui/select/Select'

/**
 * Build select options from EmployeeEthnicity enum (schema).
 * Kinh is always first; rest follow enum order.
 */
export function getEthnicitySelectOptions(): SelectOption[] {
  const values = Object.values(EmployeeEthnicity) as string[]
  const kinh = EmployeeEthnicity.Kinh
  const rest = values.filter((v) => v !== kinh)
  const ordered = [kinh, ...rest]
  return ordered.map((value) => ({ label: value, value }))
}
