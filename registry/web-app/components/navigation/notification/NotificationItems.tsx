import Avatar from '@/components/ui/avatar/Avatar.tsx'
import { Navigation } from '@/components/navigation/Navigation.tsx'
import Notification from '@/components/navigation/notification/Notification.tsx'
import NotificationBell from '@/components/navigation/notification/NotificationBell.tsx'
import UserMenu from '@/components/navigation/UserMenu.tsx'

const NotificationItems = () => {
  return (
    <>
      <div className="relative flex shrink-0 content-stretch items-center justify-end gap-3">
        <Navigation
          items={[
            {
              trigger: <Avatar size={40} />,
              content: <UserMenu />,
            },
            {
              trigger: <NotificationBell />,
              content: <Notification />,
            },
          ]}
        />
      </div>
    </>
  )
}

export default NotificationItems
