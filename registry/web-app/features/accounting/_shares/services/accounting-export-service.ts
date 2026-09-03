import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'

/**
 * Triggers the async XLSX export of an accounting list screen.
 *
 * The per-screen `/export/` endpoints are not in the generated OpenAPI schema
 * yet, so the path is cast (same approach as the F2 payment export). The BE
 * returns `{ task_id }` for async jobs, which `useExport` then polls via
 * `/api/export/status/`.
 */
class AccountingExportService extends BaseApiService {
  async triggerExport(
    exportPath: string,
    query: Record<string, unknown>
  ): Promise<{ task_id?: string }> {
    const res = (await this.client.GET(exportPath as any, {
      params: { query: query as any },
    })) as unknown as { data?: unknown; error?: unknown }

    if (res.error) throw res.error
    // The BE wraps every response in the `{ success, data, error }` envelope, so
    // the `{ task_id }` payload lives at `res.data.data`. Unwrap it the same way
    // BaseApiService.get does — returning the raw envelope leaves `task_id`
    // undefined, so `useExport` never polls and the dialog hangs at 0%.
    return extractApiData<{ task_id?: string }>(res) ?? {}
  }
}

export const accountingExportService = new AccountingExportService()
