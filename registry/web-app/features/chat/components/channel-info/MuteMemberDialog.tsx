import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { MuteDuration } from '../../types/channel'
import { Select } from '@/components/ui/select'

interface MuteMemberDialogProps {
  open: boolean
  onClose: () => void
  targetUser: { user_id: number; display_name: string }
  onConfirm: (duration: MuteDuration) => Promise<void> | void
  loading?: boolean
}

const MUTE_OPTIONS = [
  { value: '5_minutes', label: '5 phút' },
  { value: '1_hour', label: '1 giờ' },
  { value: '1_day', label: '1 ngày' },
  { value: 'permanent', label: 'Vĩnh viễn' },
]

export const MuteMemberDialog = ({
  open,
  onClose,
  targetUser,
  onConfirm,
  loading,
}: MuteMemberDialogProps) => {
  const [duration, setDuration] = useState<MuteDuration>('1_hour')

  const handleConfirm = async () => {
    await onConfirm(duration)
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      size="sm"
      open={open}
      onOpenChange={onClose}
      onCancel={onClose}
      onConfirm={handleConfirm}
      loading={loading}
      title={`Mute ${targetUser.display_name} trong channel`}
      content={
        <div className="flex flex-col gap-4 px-6 py-4">
          <label className="typo-body-base-medium text-content-dark-1">Thời gian Mute</label>
          <Select
            value={duration}
            options={MUTE_OPTIONS}
            onChange={(val) => setDuration(val as MuteDuration)}
            placeholder="Chọn thời gian"
          />
        </div>
      }
      confirmText="Xác nhận"
      cancelText="Hủy"
    />
  )
}
