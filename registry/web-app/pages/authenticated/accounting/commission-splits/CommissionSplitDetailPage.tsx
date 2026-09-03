import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { useCommissionSplitDetail } from '@/features/accounting/commission-splits/services/commission-splits-service'
import { CommissionSplitDetailInfo } from '@/features/accounting/commission-splits/components/CommissionSplitDetailInfo'
import { withRememberedSearch } from '@/utils/list-url-memory'

const CommissionSplitDetailPage = () => {
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
  } = useCommissionSplitDetail(Number(idStr), { enabled: !!idStr })
  const {
    data: record,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useCommissionSplitDetail(id, { enabled: !!id })

  /**
   * Bấm sang kỳ khác chỉ đổi `?worksheet_id=`, mà query giữ dữ liệu cũ (`keepPreviousData`)
   * nên `isLoading` vẫn false và màn tiếp tục hiện số của kỳ CŨ tới khi kỳ mới về —
   * xem chú thích cùng nội dung ở `DealPeriodAllocationDetailPage`.
   */
  const isRefreshing = isPlaceholderData || isFetching || isCurrentFetching

  const handleBack = () => {
    navigate(withRememberedSearch(APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET))
  }

  return (
    <DetailPageWrapper
      isLoading={isLoading || isCurrentLoading}
      isError={!!error || !!currentError}
      isNotFound={
        (!isLoading && !error && !record) || (!isCurrentLoading && !currentError && !currentRecord)
      }
      hasPermission={
        ability.can('retrieve', 'dealperiodworksheet') || ability.can('retrieve', 'commissionsplit')
      }
    >
      {record && currentRecord && (
        <CommissionSplitDetailInfo
          detail={record}
          currentDetail={currentRecord}
          onBack={handleBack}
          onRefresh={refetch}
          isRefreshing={isRefreshing}
        />
      )}
    </DetailPageWrapper>
  )
}

export default CommissionSplitDetailPage
