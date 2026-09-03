import type { ImportParsedResult, ImportResultRecord } from './hrm-import'

export type CustomerImportResult = {
  success?: ImportParsedResult
  successRaw?: string
  failure?: ImportParsedResult
  failureRaw?: string
}

export type { ImportParsedResult, ImportResultRecord }
