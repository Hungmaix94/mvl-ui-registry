// Type definition for notification
export type Notification = {
  id: string
  title: string
  description: string
  isRead: boolean
  type: 'info' | 'warning' | 'error' | 'success'
  createdAt: string
  updatedAt: string
}

// Generate 1000 dummy notification records
export const generateMockNotifications = (): Notification[] => {
  const notifications: Notification[] = []
  const types: Array<'info' | 'warning' | 'error' | 'success'> = [
    'info',
    'warning',
    'error',
    'success',
  ]

  const titles = [
    'System Update Available',
    'New Message Received',
    'Password Expiry Warning',
    'Account Security Alert',
    'Meeting Reminder',
    'File Upload Complete',
    'Backup Successful',
    'Maintenance Scheduled',
    'New Feature Released',
    'Payment Processed',
    'Login from New Device',
    'Storage Quota Warning',
    'Report Generated',
    'Task Completed',
    'Error in Processing',
    'Welcome to the Platform',
    'Subscription Renewal',
    'Data Export Ready',
    'Team Invitation',
    'System Maintenance Complete',
  ]

  const descriptions = [
    'A new system update is available for download.',
    'You have received a new message from a colleague.',
    'Your password will expire in 7 days. Please update it.',
    'We detected unusual activity on your account.',
    'You have a meeting scheduled in 30 minutes.',
    'Your file has been successfully uploaded.',
    'Daily backup has been completed successfully.',
    'System maintenance is scheduled for tonight.',
    "Check out the latest features we've added.",
    'Your payment has been processed successfully.',
    'Someone logged into your account from a new device.',
    'You are approaching your storage quota limit.',
    'Your requested report is ready for download.',
    'The assigned task has been marked as completed.',
    'An error occurred while processing your request.',
    "Welcome! We're excited to have you on board.",
    'Your subscription will renew automatically.',
    'Your data export is ready for download.',
    'You have been invited to join a team.',
    'System maintenance has been completed successfully.',
  ]

  const now = new Date()

  for (let i = 0; i < 1000; i++) {
    const randomType = types[Math.floor(Math.random() * types.length)]
    const randomTitle = titles[Math.floor(Math.random() * titles.length)]
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)]

    // Generate random date within the last 30 days
    const randomDaysAgo = Math.floor(Math.random() * 30)
    const randomHoursAgo = Math.floor(Math.random() * 24)
    const randomMinutesAgo = Math.floor(Math.random() * 60)

    const createdAt = new Date(
      now.getTime() -
        randomDaysAgo * 24 * 60 * 60 * 1000 -
        randomHoursAgo * 60 * 60 * 1000 -
        randomMinutesAgo * 60 * 1000
    )
    const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 60 * 60 * 1000)) // Updated within 1 hour of creation

    notifications.push({
      id: `notification-${i + 1}`,
      title: `${randomTitle} ${i + 1}`,
      description: randomDescription,
      isRead: Math.random() > 0.3, // 70% chance of being read
      type: randomType,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    })
  }

  // Sort by creation date (newest first)
  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Export the generated notifications
export const mockNotifications = generateMockNotifications()

// Helper function to get paginated notifications
export const getPaginatedNotifications = (
  page: number = 1,
  limit: number = 20
): { notifications: Notification[]; total: number; hasNext: boolean; hasPrev: boolean } => {
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedNotifications = mockNotifications.slice(startIndex, endIndex)

  return {
    notifications: paginatedNotifications,
    total: mockNotifications.length,
    hasNext: endIndex < mockNotifications.length,
    hasPrev: page > 1,
  }
}

// Helper function to mark notification as read
export const markNotificationAsRead = (id: string): boolean => {
  const notification = mockNotifications.find((n) => n.id === id)
  if (notification) {
    notification.isRead = true
    notification.updatedAt = new Date().toISOString()
    return true
  }
  return false
}

// Helper function to mark all notifications as read
export const markAllNotificationsAsRead = (): number => {
  let count = 0
  mockNotifications.forEach((notification) => {
    if (!notification.isRead) {
      notification.isRead = true
      notification.updatedAt = new Date().toISOString()
      count++
    }
  })
  return count
}
