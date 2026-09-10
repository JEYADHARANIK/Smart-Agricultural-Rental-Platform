import { useEffect, useRef, useCallback } from 'react'

/**
 * Reusable modal behavior: scroll lock, Escape-to-close, focus trap,
 * move/restore focus. Apply `dialogProps` to the dialog container.
 * Focus is restored to `document.activeElement` at the moment the modal opens
 * (the trigger element), so no separate triggerRef is needed.
 */
export default function useModal({ open, onClose, labelledBy }) {
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)

  // Body scroll lock
  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Focus management: capture the trigger, move focus into dialog, restore on cleanup
  useEffect(() => {
    if (!open) return undefined

    // Capture the element that triggered the modal (the button that was clicked)
    triggerRef.current = document.activeElement

    // Move focus into the dialog after React renders
    requestAnimationFrame(() => {
      dialogRef.current?.focus?.()
    })

    return () => {
      const trigger = triggerRef.current
      if (
        trigger &&
        typeof trigger.focus === 'function' &&
        document.contains(trigger)
      ) {
        trigger.focus()
      }
      triggerRef.current = null
    }
  }, [open])

  // Escape closes the modal
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap: keep Tab within the dialog
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    []
  )

  const dialogProps = {
    ref: dialogRef,
    role: 'dialog',
    'aria-modal': true,
    tabIndex: -1,
    ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
    onKeyDown: handleKeyDown,
    className: 'outline-none',
  }

  return { dialogProps, dialogRef }
}
