import { useState, useRef, useCallback } from 'react'

import { PageTitle, Button } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useLinkedExchangeRevenueRules } from '@/features/accounting/linked-exchange-targets/services/linked-exchange-revenue-rule.service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import {
  SLKRatePolicyMatrix,
  type SLKRatePolicyMatrixRef,
} from '@/features/accounting/commissions/components/slk-policy/SLKRatePolicyMatrix'
import { SLKRatePolicyHistory } from '@/features/accounting/commissions/components/slk-policy/SLKRatePolicyHistory'

import { useAbility } from '@/lib/ability'

const CommSLKDeptPage = () => {
  const ability = useAbility()
  const canViewRelatedRoles = true || ability.can('view_related_roles', 'linkedexchangetarget')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const matrixRef = useRef<SLKRatePolicyMatrixRef>(null)

  const {
    data: rulesData,
    isLoading,
    error,
  } = useLinkedExchangeRevenueRules({
    ordering: 'revenue', // Ordered by revenue ascending
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/linked-exchange-revenue-rules/export/',
    'hh-slk-theo-phong-ban.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({ ordering: 'revenue' })
  }, [openExportDialog])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Bảng chỉ tiêu phòng Sàn liên kết"
        handleShowHistory={() => setIsHistoryOpen(true)}
        customActions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"></div>
            {isEditMode ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditMode(false)}>
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    setIsSaving(true)
                    const ok = await matrixRef.current?.save()
                    setIsSaving(false)
                    if (ok) setIsEditMode(false)
                  }}
                  loading={isSaving}
                >
                  Lưu quy định
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={handleExport}>
                  Xuất Excel
                </Button>
                <Button variant="primary" onClick={() => setIsEditMode(true)}>
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="px-7 pt-2 pb-0">
        <span className="text-sm text-neutral-500">
          Quy định tỷ lệ HH theo target doanh thu của phòng SLK — áp cho từng vị trí và các đầu mục
          liên quan
        </span>
      </div>

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        {isLoading ? (
          <div className="text-neutral-500">Đang tải dữ liệu...</div>
        ) : error || !rulesData ? (
          <div className="text-red-500">Lỗi tải dữ liệu</div>
        ) : (
          <>
            {/* The new Policy Matrix */}
            <SLKRatePolicyMatrix
              ref={matrixRef}
              rules={rulesData.results}
              canViewRelatedRoles={canViewRelatedRoles}
              isEditMode={isEditMode}
              onEditModeChange={setIsEditMode}
            />
          </>
        )}
      </div>

      <AppDialog
        variant="custom"
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onCancel={() => setIsHistoryOpen(false)}
        onConfirm={() => setIsHistoryOpen(false)}
        isHideCancelButton={true}
        title="Lịch sử thay đổi quy định"
        content={<SLKRatePolicyHistory />}
      />
    </div>
  )
}

export default CommSLKDeptPage
