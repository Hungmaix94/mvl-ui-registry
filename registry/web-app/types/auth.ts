import type { TObjectValues } from './common'
import type { USER_ROLES } from '@/constants'

/**
 * Authentication related types using TObjectValues
 */

export type TUserRole = TObjectValues<typeof USER_ROLES>
