import { createContext, useContext, useMemo, type ReactNode } from 'react'

/**
 * Reconciliation form mode (mirrors the mockup's `Rf5ReadonlyCtx`).
 * - `create` / `edit`  → editable cells
 * - `view`             → read-only detail
 * - `approval`         → read-only while a reviewer decides (approve/reject)
 */
export type ReconMode = 'create' | 'edit' | 'view' | 'approval'

export interface ReconModeValue {
  mode: ReconMode
  /** Named `isReadOnly` (not `readonly`) to avoid shadowing the TS `readonly` keyword. */
  isReadOnly: boolean
}

/** Modes that are read-only unless explicitly overridden. */
const READONLY_MODES: ReadonlySet<ReconMode> = new Set<ReconMode>(['view', 'approval'])

const ReconModeContext = createContext<ReconModeValue | undefined>(undefined)

export interface ReconModeProviderProps {
  mode: ReconMode
  /** Override the mode-derived read-only default (e.g. let an approver edit a specific cell). */
  isReadOnly?: boolean
  children: ReactNode
}

export function ReconModeProvider({ mode, isReadOnly, children }: ReconModeProviderProps) {
  const value = useMemo<ReconModeValue>(
    () => ({ mode, isReadOnly: isReadOnly ?? READONLY_MODES.has(mode) }),
    [mode, isReadOnly]
  )

  return <ReconModeContext.Provider value={value}>{children}</ReconModeContext.Provider>
}

/**
 * Read the current reconciliation form mode.
 *
 * Falls back to an editable `create` mode when used outside a provider so leaf primitives never
 * crash in isolation (the mockup's readonly context degrades the same way).
 */
export function useReconMode(): ReconModeValue {
  return useContext(ReconModeContext) ?? { mode: 'create', isReadOnly: false }
}
