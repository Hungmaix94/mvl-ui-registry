export enum ORG_LEVEL {
  BRANCH = 'branch',
  BLOCK = 'block',
  DEPARTMENT = 'department',
}

export function isTypeOrgLevel(value: any): value is ORG_LEVEL {
  return Object.values(ORG_LEVEL).includes(value)
}
