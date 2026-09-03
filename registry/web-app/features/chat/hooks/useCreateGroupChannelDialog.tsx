import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog'
import { CreateGroupChannelForm } from '../components/CreateGroupChannelForm'

export function useCreateGroupChannelDialog() {
  const { displayFormContent, displayClose } = useDialog()

  const openCreateDialog = useCallback(() => {
    displayFormContent({
      title: 'Tạo nhóm chat mới',
      content: <CreateGroupChannelForm onSuccess={displayClose} />,
      hideFooter: true,
      dialogContentClassName: 'p-0',
    })
  }, [displayFormContent, displayClose])

  return { openCreateDialog }
}
