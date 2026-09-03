import { TIcon } from '@/types/common.ts'

function IconNumbersquareseven({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM4.5 19.5H19.5V4.5H4.5V19.5ZM14.25 7.125C14.4911 7.125 14.7174 7.24095 14.8584 7.43652C14.9993 7.6321 15.0381 7.8836 14.9619 8.1123L11.9619 17.1123C11.8309 17.5053 11.4057 17.7179 11.0127 17.5869C10.6197 17.4559 10.4071 17.0307 10.5381 16.6377L13.209 8.625H9.75C9.33579 8.625 9 8.28921 9 7.875C9 7.46079 9.33579 7.125 9.75 7.125H14.25Z" />
    </svg>
  )
}

export { IconNumbersquareseven }
