import type { Notification } from '@/services/notification-service'
import { parsePermissionCode, type AppAbility } from '@/lib/ability'
import {
  getProposalDetailPathBuilder,
  getProposalResourceName,
  urlParamToProposalType,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
  type ContractEvaluationRole,
} from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'
import { getEvaluationRoutePaths } from '@/features/contract/contract-evaluation/_shares/utils/contract-evaluation-route-utils'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table.ts'
import { ProposalVerifierStatus } from '@/constants/api-schema-aliases'

const PROPOSAL_TARGET_TYPE = 'hrm.proposal'
const CONTRACT_EVALUATION_TARGET_TYPE = 'hrm.contractevaluation'

// E-Library access request notification verbs (backend `NOTIFY_VERB_ACCESS_REQUEST*`).
const ACCESS_REQUEST_VERB = 'ELIBRARY_ACCESS_REQUEST'
const ACCESS_REQUEST_RESPONSE_VERB = 'ELIBRARY_ACCESS_REQUEST_RESPONSE'
const ACCESS_REQUEST_ABILITY = { action: 'list', subject: 'elibrary_access_request' }

type NotificationProposalType = ReturnType<typeof urlParamToProposalType>
type NotificationExtraData = {
  proposal_type?: string
  screen?: string
  recipient_role?: string
}

type NotificationRoute = {
  path: string
  ability: { action: string; subject: string }
}

type ScreenRoute = NotificationRoute

const CONTRACT_EVALUATION_RETRIEVE_PERMISSION: Record<ContractEvaluationRole, string> = {
  [CONTRACT_EVALUATION_ROLE.HR]: CONTRACT_EVALUATION_PERMISSIONS.HR.RETRIEVE,
  [CONTRACT_EVALUATION_ROLE.MANAGER]: CONTRACT_EVALUATION_PERMISSIONS.MANAGER.RETRIEVE,
}

/**
 * Map từ `extra_data.screen` → đích điều hướng + permission yêu cầu.
 * Khi BE gửi notification có `screen` khớp một entry ở đây, FE sẽ điều hướng tới `path`
 * (sau khi check ability tương ứng).
 */
const SCREEN_TO_ROUTE: Record<string, ScreenRoute> = {
  pending_proposals: {
    path: `${APP_PATH.PROPOSAL_MANAGE}?page=1&page_size=${PAGE_SIZE}&verifier_status=${ProposalVerifierStatus.pending}`,
    ability: { action: 'mine', subject: 'proposal_verifier' },
  },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getNotificationExtraData(extraData: unknown): NotificationExtraData | null {
  if (!isObject(extraData)) {
    return null
  }
  return extraData
}

function getNotificationScreenRoute(notification: Notification): ScreenRoute | null {
  const extraData = getNotificationExtraData(notification.extra_data)
  const screen = extraData?.screen
  if (!screen || typeof screen !== 'string') {
    return null
  }
  return SCREEN_TO_ROUTE[screen] ?? null
}

function getNotificationProposalType(notification: Notification): NotificationProposalType {
  if (notification.target_type !== PROPOSAL_TARGET_TYPE) {
    return null
  }

  const extraData = getNotificationExtraData(notification.extra_data)
  const proposalType = extraData?.proposal_type
  if (!proposalType || typeof proposalType !== 'string') {
    return null
  }

  return urlParamToProposalType(proposalType)
}

function getNotificationTargetId(targetId: string | null | undefined): number | null {
  const parsedId = Number(targetId)
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null
  }
  return parsedId
}

function normalizeContractEvaluationRecipientRole(value: unknown): ContractEvaluationRole | null {
  if (value === CONTRACT_EVALUATION_ROLE.HR) {
    return CONTRACT_EVALUATION_ROLE.HR
  }
  if (value === CONTRACT_EVALUATION_ROLE.MANAGER) {
    return CONTRACT_EVALUATION_ROLE.MANAGER
  }
  return null
}

function buildContractEvaluationRoute(
  role: ContractEvaluationRole,
  targetId: number
): NotificationRoute | null {
  const permissionCode = CONTRACT_EVALUATION_RETRIEVE_PERMISSION[role]
  const parsedAbility = parsePermissionCode(permissionCode)
  if (!parsedAbility) {
    return null
  }

  const routePaths = getEvaluationRoutePaths(role)
  return {
    path: routePaths.detail.replace(':id', String(targetId)),
    ability: parsedAbility,
  }
}

function getContractEvaluationRoleCandidates(notification: Notification): ContractEvaluationRole[] {
  const extraData = getNotificationExtraData(notification.extra_data)
  const preferredRole = normalizeContractEvaluationRecipientRole(extraData?.recipient_role)
  if (preferredRole) {
    return [preferredRole]
  }
  return [CONTRACT_EVALUATION_ROLE.HR, CONTRACT_EVALUATION_ROLE.MANAGER]
}

function getContractEvaluationRoutes(notification: Notification): NotificationRoute[] {
  if (notification.target_type !== CONTRACT_EVALUATION_TARGET_TYPE) {
    return []
  }

  const targetId = getNotificationTargetId(notification.target_id)
  if (!targetId) {
    return []
  }

  return getContractEvaluationRoleCandidates(notification)
    .map((role) => buildContractEvaluationRoute(role, targetId))
    .filter((route): route is NotificationRoute => route != null)
}

function getContractEvaluationRoute(notification: Notification): NotificationRoute | null {
  return getContractEvaluationRoutes(notification)[0] ?? null
}

function getAccessRequestRoute(notification: Notification): NotificationRoute | null {
  if (notification.verb === ACCESS_REQUEST_VERB) {
    // Owner được báo có yêu cầu mới → mở màn duyệt của đúng tài liệu.
    // Backend set target=item nên target_id chính là item id.
    const itemId = getNotificationTargetId(notification.target_id)
    const path = itemId
      ? APP_PATH.ELIBRARY_ITEM_ACCESS_REQUESTS.replace(':itemId', String(itemId))
      : APP_PATH.ELIBRARY_ACCESS_REQUESTS
    return { path, ability: ACCESS_REQUEST_ABILITY }
  }

  if (notification.verb === ACCESS_REQUEST_RESPONSE_VERB) {
    // Requester được phản hồi → mở tab "Tôi gửi".
    return {
      path: `${APP_PATH.ELIBRARY_ACCESS_REQUESTS}?role=requester`,
      ability: ACCESS_REQUEST_ABILITY,
    }
  }

  return null
}

function getProposalRoute(notification: Notification): NotificationRoute | null {
  const proposalType = getNotificationProposalType(notification)
  const targetId = getNotificationTargetId(notification.target_id)

  if (!proposalType || !targetId) {
    return null
  }

  return {
    path: getProposalDetailPathBuilder(proposalType)(targetId),
    ability: { action: 'retrieve', subject: getProposalResourceName(proposalType) },
  }
}

function getNotificationRoute(notification: Notification): NotificationRoute | null {
  const screenRoute = getNotificationScreenRoute(notification)
  if (screenRoute) {
    return screenRoute
  }

  const contractEvaluationRoute = getContractEvaluationRoute(notification)
  if (contractEvaluationRoute) {
    return contractEvaluationRoute
  }

  const accessRequestRoute = getAccessRequestRoute(notification)
  if (accessRequestRoute) {
    return accessRequestRoute
  }

  return getProposalRoute(notification)
}

function getAllowedNotificationRoute(
  notification: Notification,
  ability: AppAbility
): NotificationRoute | null {
  const screenRoute = getNotificationScreenRoute(notification)
  if (screenRoute && ability.can(screenRoute.ability.action, screenRoute.ability.subject)) {
    return screenRoute
  }

  const contractEvaluationRoutes = getContractEvaluationRoutes(notification)
  const allowedContractRoute = contractEvaluationRoutes.find((route) =>
    ability.can(route.ability.action, route.ability.subject)
  )
  if (allowedContractRoute) {
    return allowedContractRoute
  }

  const accessRequestRoute = getAccessRequestRoute(notification)
  if (
    accessRequestRoute &&
    ability.can(accessRequestRoute.ability.action, accessRequestRoute.ability.subject)
  ) {
    return accessRequestRoute
  }

  const proposalRoute = getProposalRoute(notification)
  if (proposalRoute && ability.can(proposalRoute.ability.action, proposalRoute.ability.subject)) {
    return proposalRoute
  }

  return null
}

export function getNotificationRedirectPath(notification: Notification): string | null {
  return getNotificationRoute(notification)?.path ?? null
}

export function canNavigateNotification(notification: Notification, ability: AppAbility): boolean {
  return getAllowedNotificationRoute(notification, ability) != null
}

/** Route đích sau khi đã check quyền — dùng cho click handler để path khớp scope user. */
export function getNotificationNavigationTarget(
  notification: Notification,
  ability: AppAbility
): NotificationRoute | null {
  return getAllowedNotificationRoute(notification, ability)
}
