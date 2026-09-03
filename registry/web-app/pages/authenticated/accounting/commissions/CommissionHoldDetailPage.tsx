import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import CommHoldDetail from '@/features/accounting/commissions/components/CommHoldDetail'
import { useCommissionHoldsGrouped } from '@/features/accounting/commission-holds/services/commission-hold-service'
import {
  buildHoldGroupQuery,
  parseHoldGroupIdentity,
} from '@/features/accounting/commissions/utils/comm-hold-group'
import { useAbility } from '@/lib/ability'

/**
 * Chi tiết tạm giữ theo (người nhận × kỳ). Không có endpoint retrieve cho group — đọc lại
 * `GET /commission-holds/grouped/` với đúng khoá người nhận + kỳ (bỏ mọi filter của list) rồi
 * lấy phần tử duy nhất.
 *
 * Quyền của trang lấy theo ĐÚNG endpoint trên: `commissionhold.grouped`. Đừng đổi sang
 * `commissionhold.list` — backend khai hai mã RIÊNG cho `/commission-holds/` và
 * `/commission-holds/grouped/`, nên gate bằng `.list` sẽ cho vào trang rồi ăn 403 ở lượt tải.
 */
const CommissionHoldDetailPage = () => {
  const ability = useAbility()
  const navigate = useNavigate()
  const params = useParams<{
    beneficiaryType: string
    beneficiaryId: string
    year: string
    month: string
  }>()

  const identity = useMemo(() => parseHoldGroupIdentity(params), [params])

  const {
    data: response,
    isLoading,
    error,
  } = useCommissionHoldsGrouped(identity ? buildHoldGroupQuery(identity) : undefined, {
    enabled: !!identity,
  })

  const group = response?.results?.[0]

  return (
    <DetailPageWrapper
      isLoading={!!identity && isLoading}
      isError={!!error}
      isNotFound={!identity || (!isLoading && !group)}
      hasPermission={ability.can('grouped', 'commissionhold')}
    >
      {group && <CommHoldDetail group={group} onBack={() => navigate(-1)} />}
    </DetailPageWrapper>
  )
}

export default CommissionHoldDetailPage
