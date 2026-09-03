import { useMemo } from 'react'

import type { components } from '@/api/schema'
import { useAbility } from '@/lib/ability'
import { useUserInfo } from '@/store/auth-store'

import { DOCUMENT_PERMISSION_ACTION, DOCUMENT_PERMISSION_RESOURCE } from '../constants/permissions'

export type LibraryShareRead = components['schemas']['LibraryShareRead']

export type ShareRecordPermissions = {
  /** Quyền xoá 1 share record cụ thể — chỉ `shared_by === currentUser.id`. */
  canUnshare: boolean
  /** Echo lại flag owner để UI dễ tham chiếu. */
  isSharedBy: boolean
}

/**
 * Quyền cho từng share record (xem implementation-plan.md §13.3):
 * `canUnshare = share.shared_by === currentUser.id && ability.can('destroy', 'elibrary_share')`.
 *
 * Endpoint thực thi: `DELETE /api/elibrary/shares/{share_id}/` (dùng chung cho cả 2 module).
 */
export function useShareRecordPermissions(
  share: LibraryShareRead | null | undefined
): ShareRecordPermissions {
  const ability = useAbility()
  const currentUser = useUserInfo()

  return useMemo(() => {
    if (!share || currentUser?.id == null) {
      return { canUnshare: false, isSharedBy: false }
    }

    const isSharedBy = share.shared_by === currentUser.id
    const canUnshare =
      isSharedBy &&
      ability.can(DOCUMENT_PERMISSION_ACTION.DESTROY, DOCUMENT_PERMISSION_RESOURCE.ELIBRARY_SHARE)

    return { canUnshare, isSharedBy }
  }, [ability, currentUser?.id, share])
}
