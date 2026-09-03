import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import ContractEvaluationForceCreateForm from '@/features/contract/contract-evaluation/_shares/components/ContractEvaluationForceCreateForm'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
} from '@/features/contract/contract-evaluation/_shares/constants/contract-evaluation-constants'
import { getEvaluationRoutePaths } from '@/features/contract/contract-evaluation/_shares/utils/contract-evaluation-route-utils'
import { useForceCreateContractEvaluationHr } from '@/features/contract/services/contract-evaluation-hr-service'
import { parsePermissionCode, useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function ContractEvaluationHrCreatePage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const forceCreateHr = useForceCreateContractEvaluationHr()
  const routePaths = useMemo(() => getEvaluationRoutePaths(CONTRACT_EVALUATION_ROLE.HR), [])

  const hasPermission = useMemo(() => {
    const parsed = parsePermissionCode(CONTRACT_EVALUATION_PERMISSIONS.HR.FORCE_CREATE)
    return parsed ? ability.can(parsed.action, parsed.subject) : false
  }, [ability])

  const handleCancel = useCallback(
    () => navigate(withRememberedSearch(routePaths.list)),
    [navigate, routePaths.list]
  )

  const handleSubmit = useCallback(
    async (data: Parameters<typeof forceCreateHr.mutateAsync>[0]) => {
      const result = await forceCreateHr.mutateAsync(data)
      toastService.success('Tạo phiếu đánh giá thành công')
      navigate(result?.id ? routePaths.detail.replace(':id', String(result.id)) : routePaths.list)
    },
    [forceCreateHr, navigate, routePaths]
  )

  if (!hasPermission) {
    return (
      <Flex direction="column" gap="3" className="p-4">
        <span className="text-action-primary-red-default">
          Phiếu đánh giá được hệ thống tự tạo. Chỉ HR có quyền tạo phiếu thủ công ở đây.
        </span>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle
        title="Tạo phiếu đánh giá (thủ công)"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className="px-10 py-6">
        <ContractEvaluationForceCreateForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Tạo phiếu"
        />
      </Flex>
    </>
  )
}
