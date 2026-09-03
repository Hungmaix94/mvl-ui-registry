import { IconEye, IconEyeslash } from '../../icons'
import { cn } from '@/utils'

export type RevealRef = {
  getIsReveal: () => boolean
}

export const IconReveal = ({
  isReveal,
  isLoading,
  cbShow,
  cbHide,
}: {
  isReveal: boolean
  isLoading?: boolean
  cbShow?: () => void
  cbHide?: () => void
}) => {
  const handleShow = () => {
    if (typeof isLoading !== 'undefined' && isLoading) return

    cbShow?.()
  }

  const handleHide = () => {
    if (typeof isLoading !== 'undefined' && isLoading) return

    cbHide?.()
  }

  return (
    <>
      {isReveal ? (
        // Click to hide
        <IconEye
          title={'Ấn để ẩn'}
          className={
            isLoading
              ? 'text-content-dark-3 hover:cursor-not-allowed'
              : 'text-content-dark-1 hover:cursor-pointer'
          }
          onClick={handleHide}
        />
      ) : (
        // Click to show
        <IconEyeslash
          title={'Ấn để xem'}
          className={cn(
            isLoading
              ? 'text-content-dark-3 hover:cursor-not-allowed'
              : 'text-content-dark-1 hover:cursor-pointer'
          )}
          onClick={handleShow}
        />
      )}
    </>
  )
}
