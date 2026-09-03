import type { NavigationConfig } from '@/types/navigation'

// Role mapping configuration
export const ROLE_MAPPING: Record<string, NavigationConfig> = {
  admin: {
    role: 'Admin',
    subtitle: 'Hệ thống quản lý Admin',
  },
  user: {
    role: 'HRM', // Default to HRM for regular users
    subtitle: 'Hệ thống quản lý Hành chính nhân sự',
  },
}

// Additional role mappings can be added here based on user permissions or additional fields
export const getNavigationConfig = (userRole: string): NavigationConfig => {
  return ROLE_MAPPING[userRole] || ROLE_MAPPING['user']
}

// Note: Background and icons are now handled by design system
// - Background: Using gradient with design system colors
// - Bell icon: Using IconBell from @/assets/icons
