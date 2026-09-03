import type { ProposalJobTransferLineInputRequest } from '@/features/decision-and-proposal/services/proposal-misc-service'

/** Structural subset of the API's `ProposalJobTransferLine` this module actually reads — real
 * `ProposalJobTransferLine[]` values (with many more readonly fields) satisfy this structurally,
 * and tests can pass a plain literal without needing the full API shape. */
export type ProposalJobTransferLineLike = {
  employee: { id: number; code: string; fullname: string }
  new_branch?: { id: number; name?: string } | null
  new_block?: { id: number; name?: string } | null
  new_department: { id: number; name: string }
  new_position: { id: number; name: string }
}

/** Structural subset of `Employee` the wizard actually needs — keeps tests free of a full Employee fixture. */
export type SelectableEmployee = {
  id: number
  code: string
  fullname: string
  position: { id: number; name: string }
}

export type ResultCardDestination = {
  branchId: number
  branchName: string
  blockId: number
  blockName: string
  departmentId: number
  departmentName: string
}

export type ResultCardLine = {
  employeeId: number
  employeeCode: string
  employeeName: string
  positionId: number
  /** Undefined right after the user picks a new position from the dropdown — the Select's
   * onChange only reports the id, not the label. Callers needing the label re-resolve it via
   * `usePositionSelect().loadInitialPositionOptions` in that case. */
  positionName: string | undefined
}

export type ResultCard = {
  destination: ResultCardDestination
  lines: ResultCardLine[]
}

/** Per-employee submit error surfaced inline on that employee's row (see AssignStep). */
export type LineConflict = {
  /** Verbatim BE detail message — never reworded/translated (project convention). */
  message: string
  proposalId: number
}

type ConflictErrorPayload = {
  errors?: Array<{ detail?: string }>
  extra?: { conflicts?: unknown }
}

/** Extracts a per-employee conflict map from the BE's `active_transfer_conflict` validation
 * error (`{ errors: [{ detail }], extra: { conflicts: [{ employee_id, proposal_id }] } }`), so
 * the offending row can be flagged inline instead of only a single generic toast. Returns {}
 * for any other error shape.
 *
 * `base-service.ts` throws `response.error`, which is the API's full envelope
 * (`{ success, data, error: { type, errors, extra } }`), not the inner validation object
 * directly — so the payload has to be unwrapped the same way `error-utils.ts`'s
 * `handleApiError` does (`.error`, then `.server` for the `extractApiData` path, falling back
 * to the value itself in case a caller ever passes the already-unwrapped shape). */
export function buildLineConflictsFromError(error: unknown): Record<number, LineConflict> {
  const err = error as
    | (ConflictErrorPayload & { error?: ConflictErrorPayload; server?: ConflictErrorPayload })
    | null
    | undefined
  const payload = err?.error ?? err?.server ?? err

  const detail = payload?.errors?.[0]?.detail
  const conflicts = payload?.extra?.conflicts

  if (typeof detail !== 'string' || !Array.isArray(conflicts)) {
    return {}
  }

  return conflicts.reduce(
    (acc, conflict) => {
      const employeeId = (conflict as { employee_id?: unknown })?.employee_id
      const proposalId = (conflict as { proposal_id?: unknown })?.proposal_id
      if (typeof employeeId === 'number' && typeof proposalId === 'number') {
        acc[employeeId] = { message: detail, proposalId }
      }
      return acc
    },
    {} as Record<number, LineConflict>
  )
}

export function employeeToResultCardLine(employee: SelectableEmployee): ResultCardLine {
  return {
    employeeId: employee.id,
    employeeCode: employee.code,
    employeeName: employee.fullname,
    positionId: employee.position.id,
    positionName: employee.position.name,
  }
}

/** Adds employees to the card for `destination`, merging into an existing card for the same
 * department if one exists, and skipping employees already present in that card. */
export function assignEmployeesToCards(
  cards: ResultCard[],
  destination: ResultCardDestination,
  employees: SelectableEmployee[]
): ResultCard[] {
  const newLines = employees.map(employeeToResultCardLine)
  const existingIndex = cards.findIndex(
    (card) => card.destination.departmentId === destination.departmentId
  )

  if (existingIndex === -1) {
    return [...cards, { destination, lines: newLines }]
  }

  const existing = cards[existingIndex]
  const existingIds = new Set(existing.lines.map((line) => line.employeeId))
  const mergedLines = [
    ...existing.lines,
    ...newLines.filter((line) => !existingIds.has(line.employeeId)),
  ]
  const updated: ResultCard = { ...existing, lines: mergedLines }

  return cards.map((card, index) => (index === existingIndex ? updated : card))
}

/** Removes one employee's line from the card for `departmentId`; drops the whole card once empty. */
export function removeLineFromCards(
  cards: ResultCard[],
  departmentId: number,
  employeeId: number
): ResultCard[] {
  return cards
    .map((card) =>
      card.destination.departmentId === departmentId
        ? { ...card, lines: card.lines.filter((line) => line.employeeId !== employeeId) }
        : card
    )
    .filter((card) => card.lines.length > 0)
}

export function updateLinePosition(
  cards: ResultCard[],
  departmentId: number,
  employeeId: number,
  positionId: number,
  positionName?: string
): ResultCard[] {
  return cards.map((card) =>
    card.destination.departmentId === departmentId
      ? {
          ...card,
          lines: card.lines.map((line) =>
            line.employeeId === employeeId ? { ...line, positionId, positionName } : line
          ),
        }
      : card
  )
}

function getAssignedEmployeeIds(cards: ResultCard[]): Set<number> {
  const ids = new Set<number>()
  cards.forEach((card) => card.lines.forEach((line) => ids.add(line.employeeId)))
  return ids
}

/** Table B's content: every fetched employee not already committed to a result card. */
export function filterAvailableEmployees<T extends SelectableEmployee>(
  allEmployees: T[],
  cards: ResultCard[]
): T[] {
  const assignedIds = getAssignedEmployeeIds(cards)
  return allEmployees.filter((employee) => !assignedIds.has(employee.id))
}

export function buildLinesPayload(cards: ResultCard[]): ProposalJobTransferLineInputRequest[] {
  return cards.flatMap((card) =>
    card.lines.map((line) => ({
      employee_id: line.employeeId,
      new_department_id: card.destination.departmentId,
      new_position_id: line.positionId,
      reason: undefined,
    }))
  )
}

/** Edit-mode prefill: groups an existing proposal's lines into result cards by destination department. */
export function buildInitialCardsFromLines(lines: ProposalJobTransferLineLike[]): ResultCard[] {
  const cardsByDepartment = new Map<number, ResultCard>()

  lines.forEach((line) => {
    if (!line.employee || !line.new_department || !line.new_position) {
      return
    }

    const departmentId = line.new_department.id
    const resultLine: ResultCardLine = {
      employeeId: line.employee.id,
      employeeCode: line.employee.code,
      employeeName: line.employee.fullname,
      positionId: line.new_position.id,
      positionName: line.new_position.name,
    }

    const existing = cardsByDepartment.get(departmentId)
    if (existing) {
      existing.lines.push(resultLine)
      return
    }

    cardsByDepartment.set(departmentId, {
      destination: {
        branchId: line.new_branch?.id ?? 0,
        branchName: line.new_branch?.name ?? '',
        blockId: line.new_block?.id ?? 0,
        blockName: line.new_block?.name ?? '',
        departmentId,
        departmentName: line.new_department.name,
      },
      lines: [resultLine],
    })
  })

  return Array.from(cardsByDepartment.values())
}
