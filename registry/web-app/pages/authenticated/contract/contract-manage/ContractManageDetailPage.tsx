import { useNavigate, useParams } from 'react-router-dom'
import {
  useContract,
  useExportContractDocument,
} from '@/features/contract/services/contract-service'
import { useContractDelete } from '@/features/contract/manage/_shares/hooks/useContractDelete.tsx'
import { APP_PATH } from '@/routes'
import PageTitle from '@/components/ui/page-title/PageTitle.tsx'
import ContractDetail from '@/features/contract/manage/view-details/ContractDetail.tsx'
import { useCallback, useMemo } from 'react'
import { useAbility } from '@/lib/ability.ts'
import ContractActions from '@/features/contract/manage/_shares/components/ContractActions.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import {
  ExportDelivery,
  ContractStatus,
  RecruitmentRequestExportType,
  ContractExportTemplate,
} from '@/constants/api-schema-aliases'

const ContractManageDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { id } = useParams<{ id: string }>()
  const { data: contract, isLoading, error } = useContract(Number(id))

  // Determine if contract was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !contract
  }, [isLoading, error, contract])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const exportDocumentMutation = useExportContractDocument()

  const { openDeleteDialog } = useContractDelete(() => {
    navigate(APP_PATH.CONTRACT_MANAGE)
  })

  const handleEdit = () => {
    if (contract) {
      navigate(`${APP_PATH.CONTRACT_MANAGE_EDIT.replace(':id', String(contract.id))}`)
    }
  }

  const handleDelete = () => {
    if (contract) {
      openDeleteDialog(contract)
    }
  }

  const handleShowHistory = useCallback(() => {
    if (contract) {
      const path = APP_PATH.CONTRACT_MANAGE_HISTORY.replace(':id', contract.id.toString())
      navigate(path)
    }
  }, [navigate, contract])

  const handleExportWithTemplate = useCallback(
    async (template: ContractExportTemplate, docType?: RecruitmentRequestExportType) => {
      if (!contract?.id) return
      try {
        const exportData = await exportDocumentMutation.mutateAsync({
          id: contract.id,
          params: {
            delivery: ExportDelivery.link,
            type: docType || RecruitmentRequestExportType.docx,
            template: template || undefined,
          },
        })
        if (exportData?.url && exportData?.filename) {
          const response = await fetch(exportData.url)
          if (!response.ok) {
            throw new Error('Không thể tải xuống tệp')
          }
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = exportData.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
      } catch (error) {
        console.error('Error exporting document:', error)
      }
    },
    [contract?.id, exportDocumentMutation]
  )

  // Check if contract can be edited (any status except expired)
  const canEdit = ability.can('update', 'contract') && contract?.status !== ContractStatus.expired

  return (
    <>
      <PageTitle
        title={
          contract ? `Hợp đồng số ${contract.contract_number || contract.code || ''}` : undefined
        }
        idLabel={contract?.contract_number || contract?.code || ''}
        enableBackButton
        handleShowHistory={ability.can('histories', 'contract') ? handleShowHistory : undefined}
        handleDelete={
          contract?.status === ContractStatus.draft && ability.can('destroy', 'contract')
            ? handleDelete
            : undefined
        }
        handleEdit={canEdit ? handleEdit : undefined}
        customActions={
          ability.can('export_detail_document', 'contract') ? (
            <ContractActions onExportWithTemplate={handleExportWithTemplate} />
          ) : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'contract')}
      >
        {contract && (
          <div className="flex flex-col items-start gap-9 px-10">
            <ContractDetail contract={contract} />
          </div>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default ContractManageDetailPage
