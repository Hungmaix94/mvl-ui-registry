import { TIcon } from '@/types/common.ts'

function IconTelevisionsimple({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M15.9697 1.71973C16.2626 1.42683 16.7374 1.42683 17.0303 1.71973C17.3231 2.01262 17.3232 2.48739 17.0303 2.78027L13.8105 6H20.25C21.0784 6 21.75 6.67157 21.75 7.5V18.75C21.75 19.5784 21.0784 20.25 20.25 20.25H3.75C2.92159 20.25 2.25003 19.5784 2.25 18.75V7.5C2.25 6.67157 2.92157 6 3.75 6H10.1895L6.96973 2.78027C6.67684 2.48739 6.67686 2.01262 6.96973 1.71973C7.26262 1.42683 7.73738 1.42683 8.03027 1.71973L12 5.68945L15.9697 1.71973ZM3.75 18.75H20.25V7.5H3.75V18.75Z" />
    </svg>
  )
}

export { IconTelevisionsimple }
