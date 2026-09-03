/**
 * Resolves the org fields of a commission recipient before sending to the API.
 *
 * API constraints:
 * - Exactly one of: employee | department | branch | block | position
 * - Position-based: position + at most ONE scope (department > block > branch)
 * - Employee-based: only employee (no other scope fields)
 *
 * The CascadeSelect stores all parent fields in the form (branch, block, department, position)
 * because the cascade fills them automatically. This function picks only what the API accepts.
 */
export function resolveRecipientOrgFields(r: {
  employee?: number | null
  department?: number | null
  branch?: number | null
  block?: number | null
  position?: number | null
  [key: string]: unknown
}): {
  employee?: number | null
  department?: number | null
  branch?: number | null
  block?: number | null
  position?: number | null
} {
  // Employee-only recipient
  if (r.employee != null) {
    return { employee: r.employee }
  }

  // Position + at most one parent scope (most-specific wins: department > block > branch)
  if (r.position != null) {
    if (r.department != null) return { position: r.position, department: r.department }
    if (r.block != null) return { position: r.position, block: r.block }
    if (r.branch != null) return { position: r.position, branch: r.branch }
    return { position: r.position }
  }

  // Scope-only recipient: pick most-specific single field
  if (r.department != null) return { department: r.department }
  if (r.block != null) return { block: r.block }
  if (r.branch != null) return { branch: r.branch }

  return {}
}
