import { useCallback, useEffect, useRef, useState } from 'react'
import { OTP_COUNTDOWN_DURATION, type OtpCountdownData } from '../constants/otp'
import { LOCAL_STORAGE_KEY } from '../constants/localstorage-key'

type FlowType = 'login' | 'forgot-password'

type UseOtpCountdownReturn = {
  remainingSeconds: number
  isCountdownActive: boolean
  startCountdown: () => void
  clearCountdown: () => void
  formattedTime: string
}

/**
 * Custom hook for managing OTP countdown timer
 * Persists countdown state in localStorage
 *
 * @param flowType - Type of flow: 'login' or 'forgot-password'
 * @param _currentCredential - Current username (login) or identifier (forgot password) - not used for validation
 */
export function useOtpCountdown(
  flowType: FlowType,
  _currentCredential: string
): UseOtpCountdownReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isCountdownActive, setIsCountdownActive] = useState(false)

  // Use ref to store storage key to avoid recreating functions
  const storageKeyRef = useRef(
    flowType === 'login'
      ? LOCAL_STORAGE_KEY.OTP.LOGIN_COUNTDOWN
      : LOCAL_STORAGE_KEY.OTP.FORGOT_PASSWORD_COUNTDOWN
  )

  // Get localStorage key based on flow type
  const getStorageKey = useCallback(() => {
    return storageKeyRef.current
  }, [])

  // Load countdown from localStorage
  const loadCountdown = useCallback(() => {
    const storageKey = getStorageKey()
    const stored = localStorage.getItem(storageKey)

    if (!stored) {
      return
    }

    try {
      const data: OtpCountdownData = JSON.parse(stored)

      // Calculate remaining time
      const elapsed = Math.floor((Date.now() - data.timestamp) / 1000)
      const remaining = OTP_COUNTDOWN_DURATION - elapsed

      if (remaining > 0) {
        setRemainingSeconds(remaining)
        setIsCountdownActive(true)
      } else {
        // Countdown expired
        localStorage.removeItem(storageKey)
      }
    } catch (error) {
      console.error('Failed to parse countdown data:', error)
      localStorage.removeItem(storageKey)
    }
  }, [getStorageKey])

  // Start countdown
  const startCountdown = useCallback(() => {
    const storageKey = getStorageKey()
    const data: OtpCountdownData = {
      timestamp: Date.now(),
    }

    localStorage.setItem(storageKey, JSON.stringify(data))
    setRemainingSeconds(OTP_COUNTDOWN_DURATION)
    setIsCountdownActive(true)
  }, [getStorageKey])

  // Clear countdown
  const clearCountdown = useCallback(() => {
    const storageKey = getStorageKey()
    localStorage.removeItem(storageKey)
    setRemainingSeconds(0)
    setIsCountdownActive(false)
  }, [getStorageKey])

  // Format time as mm:ss
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [remainingSeconds])()

  // Load countdown on mount
  useEffect(() => {
    loadCountdown()
  }, [loadCountdown])

  // Countdown interval
  useEffect(() => {
    if (!isCountdownActive || remainingSeconds <= 0) {
      return
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1
        if (newValue <= 0) {
          const storageKey = getStorageKey()
          localStorage.removeItem(storageKey)
          setIsCountdownActive(false)
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCountdownActive, remainingSeconds])

  // NOTE: No cleanup on unmount - countdown persists across component remounts
  // Countdown is only cleared explicitly via clearCountdown() when needed

  return {
    remainingSeconds,
    isCountdownActive,
    startCountdown,
    clearCountdown,
    formattedTime,
  }
}
