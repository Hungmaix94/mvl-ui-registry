import { getReconRequireApproval } from '@/config/environment'

/**
 * Feature flag for the per-reconciliation approval workflow.
 *
 * - `false` (default): a reconciliation is confirmed in a single step ("Xác nhận" = confirm-deal).
 * - `true`: the reconciliation must be submitted ("Trình duyệt" = submit → `pending`), then approved
 *   or rejected ("Duyệt" / "Từ chối").
 *
 * The flag is environment-driven (`VITE_RECON_REQUIRE_APPROVAL`) and constant for the session, so the
 * hook simply re-exposes the resolved value. Centralizing it here keeps the env read in one place and
 * lets the UI switch the visible action set without scattering `import.meta.env` checks.
 */
export function useReconApprovalFlag(): boolean {
  return getReconRequireApproval()
}

export default useReconApprovalFlag
