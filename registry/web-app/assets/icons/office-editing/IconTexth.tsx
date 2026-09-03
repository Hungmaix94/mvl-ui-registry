import { TIcon } from '@/types/common.ts'

function IconTexth({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M18.75 4.5C19.1642 4.5 19.5 4.83579 19.5 5.25V18.75C19.5 19.1642 19.1642 19.5 18.75 19.5C18.3358 19.5 18 19.1642 18 18.75V12.75H6V18.75C6 19.1642 5.66421 19.5 5.25 19.5C4.83579 19.5 4.5 19.1642 4.5 18.75V5.25C4.5 4.83579 4.83579 4.5 5.25 4.5C5.66421 4.5 6 4.83579 6 5.25V11.25H18V5.25C18 4.83579 18.3358 4.5 18.75 4.5Z" />
    </svg>
  )
}

export { IconTexth }
