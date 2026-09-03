import { useAuth } from '@/store'
import { useMemo } from 'react'
import { Avatar as RadixAvatar } from '@radix-ui/themes'
import { cn } from '@/utils'
import { TObjectValues } from '@/types'

const SIZE = {
  '1': 24,
  '2': 32,
  '3': 40,
  '4': 48,
  '5': 64,
  '6': 80,
  '7': 96,
  '8': 128,
} as const
const RECORD_SIZE_VALUE_KEY = {
  24: '1',
  32: '2',
  40: '3',
  48: '4',
  64: '5',
  80: '6',
  96: '7',
  128: '8',
} as const

interface AvatarProps {
  size?: TObjectValues<typeof SIZE>
  className?: string
  name?: string
  src?: string
}

const Avatar = ({ size = SIZE['3'], className = '', name, src: propSrc }: AvatarProps) => {
  const { user } = useAuth()

  const src = useMemo(
    () => propSrc || user?.employee?.avatar?.view_url,
    [propSrc, user?.employee?.avatar?.view_url]
  )

  const alt = useMemo(
    () => name || `${user?.username || user?.full_name}`.trim() || 'User avatar',
    [name, user?.username, user?.full_name]
  )

  const initials = useMemo(
    () =>
      alt
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    [alt]
  )

  return (
    <>
      <RadixAvatar
        size={RECORD_SIZE_VALUE_KEY[size]}
        src={src}
        fallback={initials || 'U'}
        radius={'full'}
        color={'crimson'}
        variant={'soft'}
        className={cn('bg-background-1', className)}
      />
    </>
  )
}

export default Avatar
