import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { BlockForm } from '@/features/org/block/_shares/components/BlockForm.tsx'
import { BlockFormValues } from '@/features/org/block/_shares/types/block-form-types.ts'
import { APP_PATH } from '@/routes'
import { useBlock, usePartialUpdateBlock } from '@/features/org/services/block-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const BlockEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: blockResponse, isLoading, error } = useBlock(Number(id))
  const block = useMemo(() => blockResponse, [blockResponse])
  const updateBlockMutation = usePartialUpdateBlock()
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !block
  }, [isLoading, error, block])

  const hasPermission = ability.can('update', 'block')

  const handleSuccess = useCallback(() => {
    navigate(APP_PATH.BLOCK_MANAGEMENT)
  }, [navigate])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.BLOCK_MANAGEMENT))
  }, [navigate])

  const handleSubmit = useCallback(
    async (data: BlockFormValues) => {
      try {
        // Field names already match API, no mapping needed
        await updateBlockMutation.mutateAsync({
          id: Number(id),
          data: {
            name: data.name,
            block_type: data.block_type as 'business' | 'support',
            branch_id: data.branch_id,
            director_id: data.director_id ?? null,
            description: data.description,
          } as any,
        })
        toastService.success('Cập nhật khối thành công')
        handleSuccess()
      } catch (error) {
        handleApiError(error)
      }
    },
    [handleSuccess, id, updateBlockMutation]
  )

  return (
    <>
      <PageTitle
        title="Chỉnh sửa khối"
        idLabel={block?.name || (block?.id ? String(block?.id) : undefined) || id}
        enableBackButton
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        hasPermission={hasPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <BlockForm
            initialData={block}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateBlockMutation.isPending}
            isEdit
          />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default BlockEditPage
