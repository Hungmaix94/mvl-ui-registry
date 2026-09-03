/**
 * OTP-related constants
 */

/**
 * OTP countdown duration in seconds (3 minutes)
 */
export const OTP_COUNTDOWN_DURATION = 180

/**
 * OTP countdown data structure stored in localStorage
 */
export type OtpCountdownData = {
  timestamp: number // Thời điểm bắt đầu countdown (milliseconds)
}
