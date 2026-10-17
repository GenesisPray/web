'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Toast, { type ToastOptions, type ToastType } from './Toast'

interface QueuedToast extends ToastOptions {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([])
  const nextId = useRef(0)

  const showToast = useCallback(
    (message: string, type: ToastType, options: ToastOptions = {}) => {
      const toast = { id: ++nextId.current, message, type, ...options }
      setToasts((current) => [...current, toast].slice(-MAX_TOASTS))
    },
    []
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        {toasts.map(({ id, ...toast }) => (
          <div key={id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() =>
                setToasts((current) => current.filter((item) => item.id !== id))
              }
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
