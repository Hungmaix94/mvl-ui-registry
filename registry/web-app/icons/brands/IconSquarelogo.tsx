import { TIcon } from '@/types/common.ts'

function IconSquarelogo({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM4.5 19.5H19.5V4.5H4.5V19.5ZM15 8.25C15.4142 8.25 15.75 8.58579 15.75 9V15C15.75 15.4142 15.4142 15.75 15 15.75H9C8.58579 15.75 8.25 15.4142 8.25 15V9L8.25391 8.92285C8.29253 8.54488 8.61183 8.25 9 8.25H15ZM9.75 14.25H14.25V9.75H9.75V14.25Z" />
    </svg>
  )
}

export { IconSquarelogo }
