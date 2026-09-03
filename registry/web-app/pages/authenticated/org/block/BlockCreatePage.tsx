import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { BlockForm } from '@/features/org/block/_shares/components/BlockForm.tsx'
import { BlockFormValues } from '@/features/org/block/_shares/types/block-form-types.ts'
import { APP_PATH } from '@/routes'
import { useCreateBlock } from '@/features/org/services/block-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { BlockType } from '@/constants/api-schema-aliases'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const BlockCreatePage = () => {
  const navigate = useNavigate()
  const createBlockMutation = useCreateBlock()

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
        const payload = {
          name: data.name,
          block_type: data.block_type as BlockType,
          branch_id: data.branch_id,
          director_id: data.director_id ?? null,
          description: data.description,
        }
        await createBlockMutation.mutateAsync(payload)
        toastService.success('Tạo khối thành công')
        handleSuccess()
      } catch (error) {
        handleApiError(error)
      }
    },
    [createBlockMutation, handleSuccess]
  )

  return (
    <>
      <PageTitle title="Tạo mới khối" enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <BlockForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createBlockMutation.isPending}
        />
      </Flex>
    </>
  )
}

export default BlockCreatePage
