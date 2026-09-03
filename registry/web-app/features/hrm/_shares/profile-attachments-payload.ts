import type { components } from '@/api/schema'

type FileModel = components['schemas']['File']

/** Values from FileUpload `multiTrackExistingIds` mode: existing server IDs + new file tokens. */
export function splitProfileAttachmentValues(values: (string | number)[] | undefined): {
  keptIds: number[]
  newTokens: string[]
} {
  const list = values ?? []
  const keptIds: number[] = []
  const newTokens: string[] = []
  for (const v of list) {
    if (typeof v === 'number' && Number.isFinite(v)) keptIds.push(v)
    else if (typeof v === 'string' && v !== '') newTokens.push(v)
  }
  return { keptIds, newTokens }
}

export function initialProfileAttachmentFieldValue(
  attachments: FileModel[] | undefined | null
): (string | number)[] {
  if (!attachments?.length) return []
  return attachments.map((f) => f.id)
}

/** Build `files` / `existing_files` fragments for profile attachments (tokens vs kept ids). */
export function buildProfileAttachmentsWriteParts(
  currentMixed: (string | number)[] | undefined,
  isEdit: boolean,
  initialAttachmentIds?: number[]
): {
  files?: { attachments: string[] }
  existing_files?: { attachments: number[] }
} {
  const { keptIds, newTokens } = splitProfileAttachmentValues(currentMixed)
  const out: {
    files?: { attachments: string[] }
    existing_files?: { attachments: number[] }
  } = {}
  if (newTokens.length > 0) {
    out.files = { attachments: newTokens }
  }

  if (!isEdit) {
    return out
  }

  const initialSorted = [...(initialAttachmentIds ?? [])].sort((a, b) => a - b)
  const keptSorted = [...keptIds].sort((a, b) => a - b)
  const sameAsInitial =
    initialSorted.length === keptSorted.length &&
    initialSorted.every((id, i) => id === keptSorted[i])

  if (newTokens.length > 0 || !sameAsInitial) {
    out.existing_files = { attachments: keptIds }
  }

  return out
}
