import { onMessage } from 'firebase/messaging'
import { useEffect } from 'react'

import { messaging } from '@/lib/firebase'
import toastService from '@/services/toast-service'

export const useFirebaseMessaging = () => {
  useEffect(() => {
    if (!messaging) return

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload)

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        payload.data?.notification_title ||
        'New Notification'
      const body =
        payload.notification?.body ||
        payload.data?.body ||
        payload.data?.notification_body ||
        'You have a new message.'

      toastService.info(
        {
          title,
          description: body,
        },
        {
          autoClose: 5000,
        }
      )
    })

    return () => {
      unsubscribe()
    }
  }, [])
}
