import {
  CONTRACT_EVALUATION_ROLE,
  type ContractEvaluationRole,
} from '../constants/contract-evaluation-constants'
import { APP_PATH } from '@/routes'

export type EvaluationRoutePaths = {
  /** List page for the given role. form_type là filter (URL query), không phải URL segment. */
  list: string
  /** HR force-create page. `undefined` cho Me/Manager — phiếu được auto-tạo. */
  create?: string
  /** Detail page (`:id` placeholder). */
  detail: string
  /** Edit page (`:id` placeholder). */
  edit: string
  /** History list (`:id` placeholder) — role-scoped per FSD §3.1. */
  history: string
  /** History detail (`:id` + `:log_id` placeholders) — role-scoped per FSD §3.1. */
  historyDetail: string
}

/**
 * Single source of truth for the Contract Evaluation route map.
 * BE endpoint split theo role (`/manager/`, `/hr/`); form_type là query param
 * (BRD §6 mockup). URL FE phản ánh đúng cấu trúc đó — 2 nhóm route, không có form_type segment.
 * NV (Me) scope do mobile xử lý — không khai báo route phía web.
 */
export function getEvaluationRoutePaths(role: ContractEvaluationRole): EvaluationRoutePaths {
  switch (role) {
    case CONTRACT_EVALUATION_ROLE.MANAGER:
      return {
        list: APP_PATH.CONTRACT_EVALUATION_MANAGER,
        detail: APP_PATH.CONTRACT_EVALUATION_MANAGER_DETAIL,
        edit: APP_PATH.CONTRACT_EVALUATION_MANAGER_EDIT,
        history: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY,
        historyDetail: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY_DETAIL,
      }
    case CONTRACT_EVALUATION_ROLE.HR:
      return {
        list: APP_PATH.CONTRACT_EVALUATION_HR,
        create: APP_PATH.CONTRACT_EVALUATION_HR_CREATE,
        detail: APP_PATH.CONTRACT_EVALUATION_HR_DETAIL,
        edit: APP_PATH.CONTRACT_EVALUATION_HR_EDIT,
        history: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY,
        historyDetail: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY_DETAIL,
      }
  }
}
