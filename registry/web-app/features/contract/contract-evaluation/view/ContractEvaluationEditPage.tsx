import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { isNotFoundError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import ContractEvaluationForm from '../_shares/components/ContractEvaluationForm'
import {
  usePartialUpdateContractEvaluationHr,
  type ContractEvaluation,
} from '@/features/contract/services/contract-evaluation-hr-service'
import { usePartialUpdateContractEvaluationManager } from '@/features/contract/services/contract-evaluation-manager-service'
import { useContractEvaluationByRole } from '../_shares/hooks/useContractEvaluationByRole'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
  ContractEvaluationFormType,
  type ContractEvaluationRole,
} from '../_shares/constants/contract-evaluation-constants'
import { getEvaluationRoutePaths } from '../_shares/utils/contract-evaluation-route-utils'

type ContractEvaluationEditPageProps = {
  role: ContractEvaluationRole
  title: string
}

const PERMISSIONS_BY_ROLE = {
  [CONTRACT_EVALUATION_ROLE.MANAGER]: CONTRACT_EVALUATION_PERMISSIONS.MANAGER,
  [CONTRACT_EVALUATION_ROLE.HR]: CONTRACT_EVALUATION_PERMISSIONS.HR,
} as const

const ContractEvaluationEditPage = ({ role, title }: ContractEvaluationEditPageProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const evaluationId = Number(id)
  const ability = useAbility()

  const can = useCallback(
    (code: string) => {
      const parsed = parsePermissionCode(code)
      return parsed ? ability.can(parsed.action, parsed.subject) : false
    },
    [ability]
  )

  const permissions = PERMISSIONS_BY_ROLE[role]

  const query = useContractEvaluationByRole(role, evaluationId)
  const evaluation = query.data as ContractEvaluation | undefined
  const formType = (evaluation?.form_type ?? undefined) as ContractEvaluationFormType | undefined

  const updateHr = usePartialUpdateContractEvaluationHr()
  const updateManager = usePartialUpdateContractEvaluationManager()

  const isNotFound = useMemo(() => {
    if (query.isLoading) return false
    if (query.error && isNotFoundError(query.error)) return true
    return !evaluation
  }, [query.isLoading, query.error, evaluation])

  const isError = useMemo(() => {
    if (query.isLoading || !query.error) return false
    return !isNotFoundError(query.error)
  }, [query.isLoading, query.error])

  const routePaths = useMemo(() => getEvaluationRoutePaths(role), [role])

  const handleSubmit = useCallback(
    async (data: Parameters<typeof updateHr.mutateAsync>[0]['data']) => {
      if (role === CONTRACT_EVALUATION_ROLE.HR) {
        await updateHr.mutateAsync({ id: evaluationId, data })
      } else {
        await updateManager.mutateAsync({ id: evaluationId, data })
      }
      toastService.success('Cập nhật phiếu đánh giá thành công')
      navigate(routePaths.detail.replace(':id', String(evaluationId)))
    },
    [role, evaluationId, updateHr, updateManager, navigate, routePaths.detail]
  )

  const handleCancel = useCallback(
    () => navigate(routePaths.detail.replace(':id', String(evaluationId))),
    [navigate, routePaths.detail, evaluationId]
  )

  return (
    <>
      <PageTitle
        title={title}
        idLabel={evaluation?.code || ''}
        enableBackButton
        handleBackButton={handleCancel}
      />
      <DetailPageWrapper
        isLoading={query.isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={can(permissions.PARTIAL_UPDATE)}
      >
        {evaluation && formType && (
          <Flex flexGrow={'1'} direction="column" gap="4" className="px-10 py-6">
            <ContractEvaluationForm
              mode={role}
              formType={formType}
              initialData={evaluation}
              onSubmit={async (payload) => {
                await handleSubmit(payload)
              }}
              onCancel={handleCancel}
              submitLabel="Lưu thay đổi"
            />
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default ContractEvaluationEditPage
