import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { useApiMutation } from '@/hooks/useApiQuery'

export type PromotionManualEntry = components['schemas']['PromotionManualEntry']
export type PromotionManualEntryInputRequest =
  components['schemas']['PromotionManualEntryInputRequest']
class PromotionManualEntryService extends BaseApiService {
  async createEntry(data: PromotionManualEntryInputRequest) {
    return await this.post(ApiPaths.accounting_promotion_manual_entries_create, data)
  }

  async patchEntry(id: number, data: Partial<PromotionManualEntryInputRequest>) {
    return await this.patch(ApiPaths.accounting_promotion_manual_entries_partial_update, data, {
      path: { id },
    })
  }
}

let _service: PromotionManualEntryService | null = null

export function getPromotionManualEntryService(): PromotionManualEntryService {
  if (!_service) _service = new PromotionManualEntryService()
  return _service
}

export function useCreatePromotionManualEntry() {
  return useApiMutation((data: PromotionManualEntryInputRequest) =>
    getPromotionManualEntryService().createEntry(data)
  )
}

export function usePatchPromotionManualEntry() {
  return useApiMutation(
    (variables: { id: number; data: Partial<PromotionManualEntryInputRequest> }) =>
      getPromotionManualEntryService().patchEntry(variables.id, variables.data)
  )
}
