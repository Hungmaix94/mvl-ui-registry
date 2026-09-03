import { createContext, useContext, type ReactNode } from 'react'

import {
  INVESTOR_RECON_KIND_CONFIG,
  type ReconKindConfig,
} from '@/features/sales/_shared/reconciliation/recon-kind'

/**
 * Carries the active {@link ReconKindConfig} preset down to every reconciliation leaf, so shared
 * components branch on `kind`/`profile`/`features` instead of being hardcoded to one domain.
 *
 * Sits alongside (not inside) `ReconModeContext`: a page wraps both providers. Used outside a
 * provider, it falls back to the investor (rich) preset so legacy investor screens — which do not
 * yet mount a provider — render identically.
 */
const ReconKindContext = createContext<ReconKindConfig | undefined>(undefined)

export interface ReconKindProviderProps {
  config: ReconKindConfig
  children: ReactNode
}

export function ReconKindProvider({ config, children }: ReconKindProviderProps) {
  return <ReconKindContext.Provider value={config}>{children}</ReconKindContext.Provider>
}

/** Read the active reconciliation preset (investor/rich fallback outside a provider). */
export function useReconKind(): ReconKindConfig {
  return useContext(ReconKindContext) ?? INVESTOR_RECON_KIND_CONFIG
}
