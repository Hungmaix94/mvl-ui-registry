import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function ToastProvider() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create a container div directly in body
    const toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    document.body.appendChild(toastContainer)
    setContainer(toastContainer)

    return () => {
      // Cleanup: remove container when component unmounts
      if (document.body.contains(toastContainer)) {
        document.body.removeChild(toastContainer)
      }
    }
  }, [])

  if (!container) return null

  return createPortal(
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      newestOnTop
      closeOnClick
      pauseOnHover
      style={{ zIndex: 100 }}
      className="z-[100]"
    />,
    container
  )
}
