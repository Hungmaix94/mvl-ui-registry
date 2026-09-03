import { TIcon } from '@/types/common.ts'

function IconTable({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 4.5C21.4142 4.50002 21.75 4.8358 21.75 5.25V18C21.75 18.3978 21.5918 18.7792 21.3105 19.0605C21.0293 19.3418 20.6478 19.5 20.25 19.5H3.75C3.35218 19.5 2.97076 19.3419 2.68945 19.0605C2.40815 18.7792 2.25 18.3978 2.25 18V5.25C2.25 4.83579 2.58579 4.5 3 4.5H21ZM9 18H20.25V15H9V18ZM3.75 18H7.5V15H3.75V18ZM9 13.5H20.25V10.5H9V13.5ZM3.75 13.5H7.5V10.5H3.75V13.5ZM3.75 9H20.25V6H3.75V9Z" />
    </svg>
  )
}

export { IconTable }
