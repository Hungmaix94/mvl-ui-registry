// WS2 per-payee hold: parse mot identityKey cua RecipientPayoutTable
// ("employee-<id>" | "collaborator-<id>" | "exchange-<id>") thanh payee ref
// cho payload hold-share / release-share-hold. Key "name-..." (khong co id,
// khong the target) tra null.
export type SharePayeeRef = {
  employee_id?: number
  collaborator_id?: number
  exchange_id?: number
}

export function payeeRefFromIdentityKey(key: string | null | undefined): SharePayeeRef | null {
  if (!key) return null
  const match = key.match(/^(employee|collaborator|exchange)-(\d+)$/)
  if (!match) return null
  const id = Number(match[2])
  if (match[1] === 'employee') return { employee_id: id }
  if (match[1] === 'collaborator') return { collaborator_id: id }
  return { exchange_id: id }
}
