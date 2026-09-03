import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type Me = components['schemas']['Me']
export type MePermissions = components['schemas']['MePermissions']
export type Permissions = components['schemas']['PermissionDetail'][]

// Request parameter types
export type GetMePermissionsParams = paths['/api/me/permissions/']['get']['parameters']['query']
export type UpdateMyAvatarRequest = paths['/api/me/update-avatar/']['post']['requestBody'] extends {
  content: { 'application/json': infer T }
}
  ? T
  : never

/**
 * User service extending the base API service
 * Provides user profile and permissions operations
 */
export class UserService extends BaseApiService {
  /**
   * Get current user profile
   */
  async getMe() {
    return await this.get(ApiPaths.me_retrieve)
  }

  /**
   * Get current user permissions
   */
  async getMePermissions(params?: GetMePermissionsParams) {
    return await this.get(ApiPaths.me_permissions_retrieve, {
      query: params,
    })
  }

  /**
   * Update current user's avatar
   */
  async updateMyAvatar(data: UpdateMyAvatarRequest) {
    return await this.post(ApiPaths.me_update_avatar_create, data)
  }
}

// Create service instance via factory (lazy construction)
let _userService: UserService | null = null

export function getUserService(): UserService {
  if (!_userService) {
    _userService = new UserService()
  }
  return _userService
}

// For backward compatibility, export a getter
export const userService = {
  get instance() {
    return getUserService()
  },
}

// React Query hooks for user operations
export function useMe({ options }: { options?: { enabled?: boolean } }) {
  return useApiQuery(QUERY_KEYS.USER.ME(), () => getUserService().getMe(), {
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useMePermissions({
  params,
  options,
}: {
  params?: GetMePermissionsParams
  options?: { enabled?: boolean }
}) {
  return useApiQuery(
    QUERY_KEYS.USER.PERMISSIONS(params || {}),
    () => getUserService().getMePermissions(params),
    {
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

export function useUpdateMyAvatar() {
  return useApiMutation((data: UpdateMyAvatarRequest) => getUserService().updateMyAvatar(data))
}
