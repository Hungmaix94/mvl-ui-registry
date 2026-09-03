import { TIcon } from '@/types/common.ts'

function IconGenderfemale({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M12 1.5C16.1421 1.5 19.5 4.85786 19.5 9C19.5 12.889 16.5399 16.0856 12.75 16.4619V18.75H15.75C16.1642 18.75 16.5 19.0858 16.5 19.5C16.5 19.9142 16.1642 20.25 15.75 20.25H12.75V22.5C12.75 22.9142 12.4142 23.25 12 23.25C11.5858 23.25 11.25 22.9142 11.25 22.5V20.25H8.25C7.83579 20.25 7.5 19.9142 7.5 19.5C7.5 19.0858 7.83579 18.75 8.25 18.75H11.25V16.4619C7.46006 16.0856 4.5 12.889 4.5 9C4.5 4.85786 7.85786 1.5 12 1.5ZM12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3Z" />
    </svg>
  )
}

export { IconGenderfemale }
