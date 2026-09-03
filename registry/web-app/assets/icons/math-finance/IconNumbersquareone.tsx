import { TIcon } from '@/types/common.ts'

function IconNumbersquareone({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM4.5 19.5H19.5V4.5H4.5V19.5ZM11.959 7.25098C12.189 7.09767 12.4847 7.08352 12.7285 7.21387C12.9723 7.34439 13.125 7.59843 13.125 7.875V16.5C13.125 16.9142 12.7892 17.25 12.375 17.25C11.9608 17.25 11.625 16.9142 11.625 16.5V9.27539L10.541 9.99805C10.1963 10.2277 9.73067 10.1347 9.50098 9.79004C9.27136 9.44536 9.36432 8.97967 9.70898 8.75L11.959 7.25098Z" />
    </svg>
  )
}

export { IconNumbersquareone }
