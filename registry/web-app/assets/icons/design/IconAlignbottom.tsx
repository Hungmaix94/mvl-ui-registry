import { TIcon } from '@/types/common.ts'

function IconAlignbottom({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.251 19.501C20.665 19.5012 21.001 19.8369 21.001 20.251C21.0007 20.6648 20.6648 21.0007 20.251 21.001H3.75098C3.33693 21.001 3.00026 20.665 3 20.251C3 19.8368 3.33676 19.501 3.75098 19.501H20.251ZM9.75 2.25C10.5784 2.25 11.25 2.92157 11.25 3.75V16.5C11.25 17.3284 10.5784 18 9.75 18H6C5.17157 18 4.5 17.3284 4.5 16.5V3.75C4.5 2.92157 5.17157 2.25 6 2.25H9.75ZM18 6C18.8284 6 19.5 6.67157 19.5 7.5V16.5C19.5 17.3284 18.8284 18 18 18H14.25C13.4216 18 12.75 17.3284 12.75 16.5V7.5C12.75 6.67157 13.4216 6 14.25 6H18ZM6 16.5H9.75V3.75H6V16.5ZM14.25 16.5H18V7.5H14.25V16.5Z" />
    </svg>
  )
}

export { IconAlignbottom }
