import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

const STATUS_KEY = APP_CONSTANT_KEY.ACCOUNTING.DIRECTOR_COMMISSION_STATUS
const BALANCE_KEY = APP_CONSTANT_KEY.ACCOUNTING.DIRECTOR_COMMISSION_BALANCE_STATE

/**
 * Server-side labels for the director-commission `status` + `balance_state` enums.
 * Backed by the BE app_constants (module `accounting`): `DirectorCommissionStatus`
 * and `DirectorCommissionBalanceState`. Call once at table/detail/filter level.
 *
 * - `statusLabels` / `balanceLabels`: O(1) `Record<value, label>` for cell/row lookups.
 * - `statusOptions`: pre-built `{ value, label }[]` for Select/multi-select.
 */
export function useDirectorCommissionConstants() {
  const { keysMap, keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [STATUS_KEY, BALANCE_KEY],
  })

  const statusLabels = (keysMap.get(STATUS_KEY) as Record<string, string> | undefined) ?? {}
  const balanceLabels = (keysMap.get(BALANCE_KEY) as Record<string, string> | undefined) ?? {}
  const statusOptions = (keysMapOptions.get(STATUS_KEY) ?? []) as Array<{
    value: string
    label: string
  }>

  return { statusLabels, balanceLabels, statusOptions }
}
