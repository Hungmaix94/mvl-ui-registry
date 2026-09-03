import { describe, it, expect } from 'vitest'
import { canShowConfirmMonthlyButton, hasAdvanceDeductionAction } from './comm-confirm-button'
import { getCommSaleMonthlyActions } from '../components/CommSaleMonthlyTable'
import { getCommCtvMonthlyActions } from '../components/CommCtvMonthlyTable'
import { getCommMgrMonthlyActions } from '../components/CommMgrMonthlyTable'
import { ADVANCE_REQUEST_ACTION_LABEL } from '../components/CommMonthlySummaryAdvanceDialog'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import { defineAbilitiesFor } from '@/lib/ability'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

/**
 * Các test dưới đây kiểm NHÃN và ĐÍCH của action, không kiểm phân quyền — nên dùng ability toàn
 * quyền để mọi mục đều hiện. Phần gate bằng quyền có bộ test riêng:
 * `commission-row-action-permissions.guard.test.ts`.
 */
const allowAll = defineAbilitiesFor([], true)

describe('Task 86eygz8fc: Confirm button display conditions and Action items', () => {
  describe('canShowConfirmMonthlyButton', () => {
    it('returns true when status is DRAFT', () => {
      expect(canShowConfirmMonthlyButton(MonthlyStatus.DRAFT)).toBe(true)
      expect(canShowConfirmMonthlyButton('DRAFT')).toBe(true)
    })

    it('returns false when status is CONFIRMED, PAID, APPROVED, or CANCELLED', () => {
      expect(canShowConfirmMonthlyButton(MonthlyStatus.CONFIRMED)).toBe(false)
      expect(canShowConfirmMonthlyButton(MonthlyStatus.PAID)).toBe(false)
      expect(canShowConfirmMonthlyButton('APPROVED')).toBe(false)
      expect(canShowConfirmMonthlyButton('CANCELLED')).toBe(false)
      expect(canShowConfirmMonthlyButton(null)).toBe(false)
      expect(canShowConfirmMonthlyButton(undefined)).toBe(false)
    })
  })

  describe('Table row action items', () => {
    it('ensures "Trừ hoàn ứng" action item is removed from Sale/CTV monthly table actions', () => {
      const dummyHandlers = {
        navigate: () => {},
        ability: allowAll,
        handleConfirm: () => {},
        handleCreatePaymentVoucher: () => {},
        openEmailDialog: () => {},
        setHoldRecord: () => {},
      }
      const realSaleActions = getCommSaleMonthlyActions(dummyHandlers)
      const realCtvActions = getCommCtvMonthlyActions(dummyHandlers)

      expect(hasAdvanceDeductionAction(realSaleActions)).toBe(false)
      expect(hasAdvanceDeductionAction(realCtvActions)).toBe(false)
    })
  })

  describe('Bug 86eynz1a2: the manager list must not call the advance request a deduction', () => {
    const mgrActions = () =>
      getCommMgrMonthlyActions({
        navigate: () => {},
        ability: allowAll,
        handleConfirm: () => {},
        openEmailDialog: () => {},
        setHoldRecord: () => {},
        setAdvanceRecord: () => {},
      })

    it('names the action after what confirming it actually does', () => {
      // Spelled out rather than read from the module: comparing the constant to itself would
      // still pass if someone set it back to "Trừ hoàn ứng".
      expect(ADVANCE_REQUEST_ACTION_LABEL).toBe('Đề xuất tạm ứng hoa hồng')
    })

    it('labels the advance entry with the dialog it opens', () => {
      // Presence is asserted BEFORE the absence check on purpose: "no action named X" also passes
      // on an empty list or a changed factory shape, so absence is only evidence once we know the
      // entry is still there under its new name.
      const labels = mgrActions().map((a) => a.label)
      expect(labels).toContain(ADVANCE_REQUEST_ACTION_LABEL)
      expect(hasAdvanceDeductionAction(mgrActions())).toBe(false)
    })

    it('routes that entry to the advance dialog, not to the hold dialog', () => {
      let advanced: unknown = null
      let held: unknown = null
      const actions = getCommMgrMonthlyActions({
        navigate: () => {},
        ability: allowAll,
        handleConfirm: () => {},
        openEmailDialog: () => {},
        setHoldRecord: (record) => {
          held = record
        },
        setAdvanceRecord: (record) => {
          advanced = record
        },
      })
      const record = { id: 7 } as MonthlyBeneficiaryCommissionSummary

      actions.find((a) => a.label === ADVANCE_REQUEST_ACTION_LABEL)?.onClick(record)

      expect(advanced).toBe(record)
      expect(held).toBeNull()
    })
  })
})
