# Notification Component

## Features

- **Infinite Scrolling**: Loads 20 notifications initially, then loads more as user scrolls to bottom
- **Read Status Management**: Automatically marks notifications as read on hover or expand
- **API Optimization**: Debounced API calls to prevent excessive requests when user interacts quickly
- **Loading States**: Shows dot loader during initial load and when loading more notifications
- **Visual Indicators**: Unread notifications have blue dot indicator and different styling

## Usage

```tsx
import Notification from '@/components/navigation/Notification'

// Use in your component
;<Notification />
```

## API Endpoints

- `GET /api/notifications?page=1&limit=20` - Get paginated notifications
- `PUT /api/notifications/{id}/read` - Mark single notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

## Development

The component uses mock data in development mode. Switch to production mode to use real API endpoints.

## Hooks

- `useNotification()` - Main hook for notification management

## Infinite Scrolling

Notifications use `react-infinite-scroll-component` (container-scoped) for loading more items when scrolling to the bottom of the notification list.
