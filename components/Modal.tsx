'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** When true, focus the last focusable element (safe action) on open. */
  destructive?: boolean
  /** Optional id of the element that labels the dialog. Defaults to generated id. */
  labelledBy?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface ModalStackEntry {
  dialog: HTMLDivElement
  restoreFocus: HTMLElement | null
}

const modalStack: ModalStackEntry[] = []
let originalBodyOverflow: string | null = null

function registerModal(dialog: HTMLDivElement) {
  const activeElement = document.activeElement
  const entry: ModalStackEntry = {
    dialog,
    restoreFocus: activeElement instanceof HTMLElement ? activeElement : null,
  }

  if (modalStack.length === 0) {
    originalBodyOverflow = document.body.style.overflow
  }
  modalStack.push(entry)
  document.body.style.overflow = 'hidden'

  function unregister() {
    const index = modalStack.indexOf(entry)
    if (index === -1) return

    const wasTopmost = index === modalStack.length - 1
    modalStack.splice(index, 1)

    for (const nestedEntry of modalStack.slice(index)) {
      if (entry.dialog.contains(nestedEntry.restoreFocus)) {
        nestedEntry.restoreFocus = entry.restoreFocus
      }
    }

    if (modalStack.length === 0 && originalBodyOverflow !== null) {
      document.body.style.overflow = originalBodyOverflow
      originalBodyOverflow = null
    }

    if (wasTopmost) {
      const fallback = modalStack[modalStack.length - 1]?.dialog
      const target = entry.restoreFocus?.isConnected ? entry.restoreFocus : fallback
      target?.focus()
    }
  }

  return { entry, unregister }
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  destructive = false,
  labelledBy,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const generatedId = useId()
  const titleId = labelledBy ?? `modal-title-${generatedId}`
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!open || !portalReady) return

    const dialog = dialogRef.current
    if (!dialog) return

    const { entry, unregister } = registerModal(dialog)
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )
    const target = destructive
      ? focusables[focusables.length - 1]
      : focusables[0]
    ;(target ?? dialog).focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== entry) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          element.offsetParent !== null || element === document.activeElement
      )

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unregister()
    }
  }, [open, destructive, portalReady])

  if (!open || !portalReady || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          modalStack[modalStack.length - 1]?.dialog === dialogRef.current
        ) {
          onCloseRef.current()
        }
      }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-100">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}