import { TIcon } from '@/types/common.ts'

function IconWall({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 4.5C21.4142 4.5 21.75 4.83579 21.75 5.25V18.75C21.75 19.1642 21.4142 19.5 21 19.5H3C2.58579 19.5 2.25 19.1642 2.25 18.75V5.25C2.25 4.83579 2.58579 4.5 3 4.5H21ZM12.75 15V18H20.25V15H12.75ZM3.75 18H11.25V15H3.75V18ZM17.25 10.5V13.5H20.25V10.5H17.25ZM3.75 13.5H6.75V10.5H3.75V13.5ZM8.25 13.5H15.75V10.5H8.25V13.5ZM12.75 9H20.25V6H12.75V9ZM3.75 9H11.25V6H3.75V9Z" />
    </svg>
  )
}

export { IconWall }
