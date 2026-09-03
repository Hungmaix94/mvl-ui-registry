import type { components } from '@/api/schema'

import type { FormValues } from '../components/commission-split-form.types'
import type { PatchedWorksheetSplitByRecipientRequestRequest } from '../services/commission-splits-service'

import { editableAmountOf, scaleAmountsToEditable } from './editable-grain'
import { redistributePercentages } from './split-helpers'

/**
 * Dựng payload `groups` cho PATCH `recipients` từ các dòng đang có trên form.
 *
 * Dùng chung cho Mục ④ (lưu chia thực nhận của một người đứng tên) và Mục ⑤⑥ (lưu HH
 * quản lý). BE chỉ đụng tới các nhóm CÓ trong payload, nên hai nơi gửi phần của mình là
 * đủ — không nhóm nào giẫm lên nhóm nào.
 *
 * `isMgmt` phải truyền vào chứ không tự suy: danh sách `pct_type` quản lý đến từ app
 * constant lúc chạy, không phải hằng số biên dịch.
 */
export function buildGroups(
  positions: FormValues['positions'],
  isMgmt: (type: string) => boolean
): PatchedWorksheetSplitByRecipientRequestRequest['groups'] {
  return positions
    .filter((p) => p.recipient_type && p.recipient_id)
    .map((p) => {
      const isPosMgmt = isMgmt(p.pct_type || '')
      const payable = scaleAmountsToEditable(
        p.recipients.map((r) => Number(r.amount || 0)),
        editableAmountOf(p)
      )
      const rawSplits = p.recipients.map((r, idx) => {
        const amountStr = payable[idx].toString()
        const base_amount = isPosMgmt ? '0' : amountStr
        const bonus_amount = isPosMgmt ? amountStr : '0'
        return {
          employee_id: r.employee_id ? Number(r.employee_id) : null,
          collaborator_id: r.collaborator_id ? Number(r.collaborator_id) : null,
          exchange_id: r.exchange_id ? Number(r.exchange_id) : null,
          amount: amountStr,
          base_amount,
          bonus_amount,
          pct_of_parent: '0.00',
          reason: r.reason || '',
        }
      })

      const recalculatedSplits = redistributePercentages(rawSplits)

      return {
        recipient_type:
          p.recipient_type as components['schemas']['RecipientGroupSplitByPctInputRequest']['recipient_type'],
        recipient_id: p.recipient_id!,
        pct_type:
          p.pct_type as components['schemas']['RecipientGroupSplitByPctInputRequest']['pct_type'],
        splits: recalculatedSplits,
      }
    })
}
