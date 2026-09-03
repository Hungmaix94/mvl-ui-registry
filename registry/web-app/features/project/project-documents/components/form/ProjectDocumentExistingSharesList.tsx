import type { components } from '@/api/schema'
import { IconBuildings, IconStack, IconTrash, IconUser, IconUsersthree } from '@/assets/icons'
import { Button } from '@/components/ui'
import { useUserInfo } from '@/store/auth-store'
import { formatDate } from '@/utils/date-utils'

const SHARE_DATE_FORMAT = 'dd/MM/yyyy HH:mm'

export type LibraryShareRead = components['schemas']['LibraryShareRead']

type Props = {
  shares: LibraryShareRead[]
  isLoading: boolean
  onUnshare: (shareId: number) => void
  /** Khi true → disable nút xoá (đang gọi API). */
  isUnsharing?: boolean
}

const SHARE_TARGET_ICON = {
  branch: IconBuildings,
  block: IconStack,
  department: IconUsersthree,
  employee: IconUser,
} as const

const SHARE_TARGET_LABEL: Record<string, string> = {
  branch: 'Chi nhánh',
  block: 'Khối',
  department: 'Phòng ban',
  employee: 'Nhân viên',
}

export default function ProjectDocumentExistingSharesList({
  shares,
  isLoading,
  onUnshare,
  isUnsharing,
}: Props) {
  const currentUser = useUserInfo()

  if (isLoading) {
    return (
      <div className="text-content-dark-3 typo-body-sm-regular px-3 py-2">
        Đang tải danh sách đã chia sẻ…
      </div>
    )
  }

  if (!shares.length) return null

  return (
    <div className="space-y-2">
      <p className="typo-body-sm-medium text-content-dark-1">Đã chia sẻ với</p>
      <div className="bg-background-2 border-border-1 rounded-sm border p-3">
        <ul className="max-h-[200px] space-y-1 overflow-auto">
          {shares.map((share) => {
            const targetType = share.share_target_type
            const Icon = SHARE_TARGET_ICON[targetType] ?? IconUser
            const targetLabel = SHARE_TARGET_LABEL[targetType] ?? targetType
            const canUnshare = currentUser?.id != null && share.shared_by === currentUser.id
            return (
              <li
                key={share.id}
                className="bg-background-1 border-border-1 flex items-center justify-between gap-3 rounded-sm border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon size={20} className="text-content-dark-3 shrink-0" />
                  <div className="min-w-0">
                    <p className="typo-body-sm-medium text-content-dark-1 truncate">
                      [{targetLabel}] {share.target_name ?? '—'}
                    </p>
                    <p className="typo-body-xs-regular text-content-dark-3">
                      bởi {share.shared_by_username} ·{' '}
                      {formatDate(share.created_at, SHARE_DATE_FORMAT)}
                    </p>
                  </div>
                </div>
                {canUnshare && (
                  <Button
                    variant="text"
                    size="small"
                    iconOnly
                    title="Huỷ chia sẻ"
                    disabled={isUnsharing}
                    leftIcon={<IconTrash size={16} />}
                    className="text-action-primary-red-default hover:text-action-primary-red-hover"
                    onClick={() => onUnshare(share.id)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
