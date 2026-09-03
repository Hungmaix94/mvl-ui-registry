import { useState } from 'react'
import { PageTitle } from '@/components/ui'
import ElibraryDocumentsExplorer from '@/features/elibrary/documents-explorer/ElibraryDocumentsExplorer'
import type { ProjectDocumentsTabSlots } from '@/features/project/project-documents/types'
import { ELIBRARY_DOCUMENT_SCOPE } from '@/features/elibrary/documents-explorer/hooks/useElibraryDocumentsListByScope'

export default function DepartmentDocumentsPage() {
  const [tabSlots, setTabSlots] = useState<ProjectDocumentsTabSlots | null>(null)

  return (
    <>
      <PageTitle title="Tài liệu phòng ban" {...tabSlots?.toolbarProps} />
      <ElibraryDocumentsExplorer
        scope={ELIBRARY_DOCUMENT_SCOPE.DEPARTMENT}
        setTabSlots={setTabSlots}
      />
    </>
  )
}
