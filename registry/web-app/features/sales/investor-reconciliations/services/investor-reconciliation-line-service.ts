import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

/**
 * Per-line CRUD service for the v6 sheet-first flow: create the sheet (DRAFT),
 * then save / edit / delete each "căn" through the nested
 * ``/investor-reconciliation-sheets/{sheet_pk}/lines/`` endpoints. The BE computes
 * commission/VAT on every write and returns the full row (incl. ``recon_check``),
 * so the FE renders Khớp/Lệch without recomputing.
 *
 * Bodies use the generated request types verbatim — callers convert their form model to the wire
 * shape via the line adapter (``toLineCreatePayload`` / ``toLinePatchPayload``) before calling.
 */

/** A saved căn row — the generated InvestorReconciliation read shape (incl. recon_check). */
export type InvestorReconciliationLine = components['schemas']['InvestorReconciliation']

type LineCreateRequest = components['schemas']['InvestorReconciliationSheetItemRequest']
type LinePatchRequest = components['schemas']['PatchedInvestorReconciliationRequest']

/** Async XLSX import of căn into a DRAFT sheet (apps.imports framework on BE). */
type ImportStartRequest = components['schemas']['ImportStartRequest']
export type ImportStartResponse = components['schemas']['ImportStartResponse']
export type ImportTemplateResponse = components['schemas']['ImportTemplateResponse']

class InvestorReconciliationLineService extends BaseApiService {
  async listLines(sheetPk: number): Promise<InvestorReconciliationLine[]> {
    const data = await this.getPaginated(
      ApiPaths.sales_investor_reconciliation_sheets_lines_list,
      undefined,
      { sheet_pk: sheetPk }
    )
    return data?.results ?? []
  }

  async getLine(sheetPk: number, id: number): Promise<InvestorReconciliationLine> {
    return await this.get(ApiPaths.sales_investor_reconciliation_sheets_lines_retrieve, {
      path: { sheet_pk: sheetPk, id },
    })
  }

  async createLine(sheetPk: number, body: LineCreateRequest): Promise<InvestorReconciliationLine> {
    return await this.post(ApiPaths.sales_investor_reconciliation_sheets_lines_create, body, {
      path: { sheet_pk: sheetPk },
    })
  }

  async patchLine(
    sheetPk: number,
    id: number,
    body: LinePatchRequest
  ): Promise<InvestorReconciliationLine> {
    return await this.patch(
      ApiPaths.sales_investor_reconciliation_sheets_lines_partial_update,
      body,
      { path: { sheet_pk: sheetPk, id } }
    )
  }

  async deleteLine(sheetPk: number, id: number): Promise<void> {
    await this.delete(ApiPaths.sales_investor_reconciliation_sheets_lines_destroy, {
      path: { sheet_pk: sheetPk, id },
    })
  }

  /**
   * Queue the XLSX import job; poll progress via the shared /api/import/status/ endpoint.
   *
   * GAP BE (regen 2026-07-27): action này thiếu `@extend_schema`, OpenAPI đang khai
   * body = `InvestorReconciliationRequest` và response = serializer sheet — KHÔNG
   * phải hợp đồng thật của import job. Giữ type đúng ở chữ ký hàm và cast qua
   * generated type; gỡ cast khi BE annotate lại.
   */
  async startLinesImport(sheetPk: number, body: ImportStartRequest): Promise<ImportStartResponse> {
    return (await this.post(
      ApiPaths.sales_investor_reconciliation_sheets_lines_import_create,
      body as never,
      { path: { sheet_pk: sheetPk } }
    )) as unknown as ImportStartResponse
  }

  async getLinesImportTemplate(sheetPk: number): Promise<ImportTemplateResponse> {
    return await this.get(
      ApiPaths.sales_investor_reconciliation_sheets_lines_import_template_retrieve,
      { path: { sheet_pk: sheetPk } }
    )
  }
}

let _service: InvestorReconciliationLineService | null = null

export function getInvestorReconciliationLineService(): InvestorReconciliationLineService {
  if (!_service) _service = new InvestorReconciliationLineService()
  return _service
}

/**
 * Object-form facade kept for existing call sites (EditPage imperative save/delete).
 * Delegates to the singleton service instance.
 */
export const investorReconciliationLineService = {
  listLines: (sheetPk: number) => getInvestorReconciliationLineService().listLines(sheetPk),
  getLine: (sheetPk: number, id: number) =>
    getInvestorReconciliationLineService().getLine(sheetPk, id),
  createLine: (sheetPk: number, body: LineCreateRequest) =>
    getInvestorReconciliationLineService().createLine(sheetPk, body),
  patchLine: (sheetPk: number, id: number, body: LinePatchRequest) =>
    getInvestorReconciliationLineService().patchLine(sheetPk, id, body),
  deleteLine: (sheetPk: number, id: number) =>
    getInvestorReconciliationLineService().deleteLine(sheetPk, id),
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useInvestorReconciliationLines(sheetPk: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.INVESTOR_RECONCILIATION_SHEET.LINES(sheetPk),
    () => getInvestorReconciliationLineService().listLines(sheetPk),
    { enabled: !!sheetPk && (options?.enabled ?? true) }
  )
}

export function useCreateInvestorReconciliationLine() {
  return useApiMutation((variables: { sheetPk: number; body: LineCreateRequest }) =>
    getInvestorReconciliationLineService().createLine(variables.sheetPk, variables.body)
  )
}

export function usePatchInvestorReconciliationLine() {
  return useApiMutation((variables: { sheetPk: number; id: number; body: LinePatchRequest }) =>
    getInvestorReconciliationLineService().patchLine(
      variables.sheetPk,
      variables.id,
      variables.body
    )
  )
}

export function useDeleteInvestorReconciliationLine() {
  return useApiMutation((variables: { sheetPk: number; id: number }) =>
    getInvestorReconciliationLineService().deleteLine(variables.sheetPk, variables.id)
  )
}

export function useStartInvestorReconciliationLinesImport() {
  return useApiMutation((variables: { sheetPk: number; body: ImportStartRequest }) =>
    getInvestorReconciliationLineService().startLinesImport(variables.sheetPk, variables.body)
  )
}

/** Lazy (``enabled: false``) — fetched on demand when the user clicks "Tải tệp mẫu". */
export function useInvestorReconciliationLinesImportTemplate(
  sheetPk: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.INVESTOR_RECONCILIATION_SHEET.LINES_IMPORT_TEMPLATE(sheetPk),
    () => getInvestorReconciliationLineService().getLinesImportTemplate(sheetPk),
    { enabled: options?.enabled ?? false }
  )
}
