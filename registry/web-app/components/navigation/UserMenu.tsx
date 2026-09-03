import { Flex, Text } from '@radix-ui/themes'
import { useAuth } from '@/store'
import { IconLock, IconSignout } from '@/assets/icons'
import { cn } from '@/utils'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useAuthOperations } from '@/hooks/useAuth.ts'

function getUserPositionLabel(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return ''
  const position = user.employee?.position
  if (typeof position === 'string' && position.trim()) return position
  if (position && typeof position === 'object' && 'name' in position) {
    const name = (position as { name?: string }).name
    if (name?.trim()) return name
  }
  return user.role?.name?.trim() ?? ''
}

const UserMenu = () => {
  const { user } = useAuth()
  const { logout } = useAuthOperations()
  const positionLabel = getUserPositionLabel(user)

  return (
    <>
      <Flex direction={'column'} minWidth={'300px'} align={'center'}>
        <Flex
          direction={'column'}
          wrap={'nowrap'}
          p={'4'}
          className={'hover:bg-data-light-grey-hover w-full'}
        >
          <Text className={'typo-body-lg-semibold text-nowrap'}>{user?.full_name}</Text>
          <Text className={'typo-body-sm'}>{positionLabel || '-'}</Text>
        </Flex>

        <hr className={'border-border-1 w-[90%]'} />

        <Flex
          justify={'start'}
          gap={'4'}
          p={'4'}
          className={'hover:bg-data-light-grey-hover w-full'}
        >
          <IconLock />
          <Link
            to={APP_PATH.CHANGE_PASSWORD}
            className={'typo-body-base-medium text-content-dark-2'}
          >
            Đổi mật khẩu
          </Link>
        </Flex>

        <hr className={'border-border-1 w-[90%]'} />

        <Flex
          justify={'start'}
          gap={'4'}
          p={'4'}
          className={cn(
            'w-full',
            'text-action-primary-red-default',
            'hover:text-content-light-1 hover:bg-data-red-hover',
            'cursor-pointer'
          )}
          onClick={logout}
        >
          <IconSignout />
          <Text className={'typo-body-base-medium'}>Đăng xuất</Text>
        </Flex>
      </Flex>
    </>
  )
}

export default UserMenu
