import { useMemo } from 'react'
import ProjectDocumentsExplorer from '@/features/project/project-documents/ProjectDocumentsExplorer'
import type { ProjectDocumentsTabSlots } from '@/features/project/project-documents/types'
import { createElibraryDocumentsExplorerAdapter } from './elibraryDocumentsExplorerAdapter'
import { type ElibraryDocumentScope } from './hooks/useElibraryDocumentsListByScope'

type ElibraryDocumentsExplorerProps = {
  scope: ElibraryDocumentScope
  setTabSlots?: (slots: ProjectDocumentsTabSlots | null) => void
}

export default function ElibraryDocumentsExplorer({
  scope,
  setTabSlots,
}: ElibraryDocumentsExplorerProps) {
  const adapter = useMemo(() => createElibraryDocumentsExplorerAdapter(scope), [scope])

  return (
    <ProjectDocumentsExplorer
      project={{ id: adapter.sourceId || 1, code: null, name: null }}
      setTabSlots={setTabSlots}
      adapter={adapter}
    />
  )
}
