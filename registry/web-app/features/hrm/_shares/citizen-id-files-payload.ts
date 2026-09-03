import type { components } from '@/api/schema'

type FileModel = components['schemas']['File']

/** Số ảnh CMND/CCCD tối đa cho mỗi nhân viên/ứng viên (mặt trước + mặt sau). */
export const MAX_CITIZEN_ID_FILES = 2

/** Form values for citizen_id_files: mix of existing server IDs and new file tokens. */
export function splitCitizenIdFilesValues(values: (string | number)[] | undefined): {
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

export function initialCitizenIdFilesFieldValue(
  files: FileModel[] | undefined | null
): (string | number)[] {
  if (!files?.length) return []
  return files.map((f) => f.id)
}

/**
 * Build write parts for citizen_id_files.
 *
 * - CREATE: tokens → `files.citizen_id_files`; keptIds → `citizen_id_files_ids` (e.g. copied from candidate).
 * - EDIT: tokens → `files.citizen_id_files`; keptIds → `existing_files.citizen_id_files` to track deletions.
 */
export function buildCitizenIdFilesWriteParts(
  currentMixed: (string | number)[] | undefined,
  isEdit: boolean,
  initialFileIds?: number[]
): {
  files?: { citizen_id_files: string[] }
  existing_files?: { citizen_id_files: number[] }
  citizen_id_files_ids?: number[]
} {
  const { keptIds, newTokens } = splitCitizenIdFilesValues(currentMixed)
  const out: {
    files?: { citizen_id_files: string[] }
    existing_files?: { citizen_id_files: number[] }
    citizen_id_files_ids?: number[]
  } = {}

  if (newTokens.length > 0) {
    out.files = { citizen_id_files: newTokens }
  }

  if (!isEdit) {
    if (keptIds.length > 0) {
      out.citizen_id_files_ids = keptIds
    }
    return out
  }

  const initialSorted = [...(initialFileIds ?? [])].sort((a, b) => a - b)
  const keptSorted = [...keptIds].sort((a, b) => a - b)
  const sameAsInitial =
    initialSorted.length === keptSorted.length &&
    initialSorted.every((id, i) => id === keptSorted[i])

  if (newTokens.length > 0 || !sameAsInitial) {
    out.existing_files = { citizen_id_files: keptIds }
  }

  return out
}
