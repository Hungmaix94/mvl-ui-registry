import { TIcon } from '@/types/common.ts'

function IconStop({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M18.4775 4.125C19.2493 4.12514 19.8749 4.75073 19.875 5.52246V18.4775C19.8749 19.2493 19.2493 19.8749 18.4775 19.875H5.52246C4.75073 19.8749 4.12514 19.2493 4.125 18.4775V5.52246C4.12514 4.75073 4.75073 4.12514 5.52246 4.125H18.4775ZM5.625 18.375H18.375V5.625H5.625V18.375Z" />
    </svg>
  )
}

export { IconStop }
