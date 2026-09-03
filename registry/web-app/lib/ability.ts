import { createContext, useContext } from 'react'
import { createMongoAbility, MongoAbility } from '@casl/ability'
import type { ExtractSubjectType } from '@casl/ability'

type Permission = {
  code: string
  // Add other fields if needed, e.g., name, description
}

// Define your subjects more generically
type Subjects = 'all' | string

export type AppAbility = MongoAbility<[string, Subjects]>

/**
 * Parses a permission code in the format 'subject.action' or 'subject.subsubject.action'
 * Returns the action (last part) and the subject (everything before the last dot)
 */
export function parsePermissionCode(code: string) {
  const lastDotIndex = code.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  return {
    action: code.slice(lastDotIndex + 1),
    subject: code.slice(0, lastDotIndex),
  }
}

export function defineAbilitiesFor(
  permissions: Permission[] | undefined,
  isSuperuser?: boolean
): AppAbility {
  const rules: any = []

  // Grant all permissions for superusers
  if (isSuperuser) {
    rules.push({ action: 'manage', subject: 'all' })
  } else if (permissions && permissions.length > 0) {
    // Use actual permissions if available, even for system roles
    permissions.forEach(({ code }) => {
      const parsed = parsePermissionCode(code)
      if (parsed) {
        rules.push(parsed)
      }
    })
  }

  return createMongoAbility(rules, {
    detectSubjectType: (item: object) => item as unknown as ExtractSubjectType<Subjects>,
  })
}

export const AbilityContext = createContext<AppAbility>(createMongoAbility())

export const useAbility = () => useContext(AbilityContext)
