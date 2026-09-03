import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { useCommissionSplitAdminPreview } from '@/features/accounting/commission-splits/services/commission-splits-service'
import { CommissionSplitDetailInfo } from '@/features/accounting/commission-splits/components/CommissionSplitDetailInfo'
import { withRememberedSearch } from '@/utils/list-url-memory'

/**
 * "Giao dịch tiền về" detail = the same screen as "Thực nhận HH"
 * (CommissionSplitDetailInfo) rendered in admin/read-only mode (isAdminView), fed by the
 * admin-preview endpoint. The "Chia thực nhận" section is view-only and "nhận hộ" payees
 * are hidden — both driven by isAdminView inside the shared component.
 */
const DealPeriodAllocationDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const worksheetIdParam = searchParams.get('worksheet_id')
  const id = worksheetIdParam ? Number(worksheetIdParam) : Number(idStr)
  const ability = useAbility()
  const navigate = useNavigate()

  const {
    data: currentRecord,
    isLoading: isCurrentLoading,
    isFetching: isCurrentFetching,
    error: currentError,
  } = useCommissionSplitAdminPreview(Number(idStr), { enabled: !!idStr })
  const {
    data: record,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useCommissionSplitAdminPreview(id, { enabled: !!id })

  /**
   * Bấm sang kỳ khác chỉ đổi `?worksheet_id=`, mà query dùng `placeholderData: keepPreviousData`
   * nên `isLoading` vẫn false và màn TIẾP TỤC hiện số của kỳ CŨ tới khi kỳ mới về. Không có
   * cờ này thì kế toán đọc số kỳ trước mà tưởng là kỳ vừa bấm.
   *
   * `isPlaceholderData` là tín hiệu đúng cho ca đó; `isFetching` phủ thêm các lượt tải lại
   * nền (sau khi lưu dial, sau duyệt chi).
   */
  const isRefreshing = isPlaceholderData || isFetching || isCurrentFetching

  const handleBack = () => {
    navigate(withRememberedSearch(APP_PATH.DEAL_PERIOD_ALLOCATION))
  }

  return (
    <DetailPageWrapper
      isLoading={isLoading || isCurrentLoading}
      isError={!!error || !!currentError}
      isNotFound={
        (!isLoading && !error && !record) || (!isCurrentLoading && !currentError && !currentRecord)
      }
      hasPermission={ability.can('admin_preview', 'dealperiodworksheet')}
    >
      {record && currentRecord && (
        <CommissionSplitDetailInfo
          detail={record}
          currentDetail={currentRecord}
          onBack={handleBack}
          onRefresh={refetch}
          isRefreshing={isRefreshing}
          isAdminView
        />
      )}
    </DetailPageWrapper>
  )
}

export default DealPeriodAllocationDetailPage
