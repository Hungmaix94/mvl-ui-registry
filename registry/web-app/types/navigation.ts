export type UserRole = 'user' | 'admin'

export type ModuleRole = 'HRM' | 'Kế toán' | 'Admin' | 'Thư ký'

export interface NavigationConfig {
  role: ModuleRole
  subtitle: string
}

export interface UserNavigationInfo {
  role: UserRole
  moduleRole: ModuleRole
  subtitle: string
}
