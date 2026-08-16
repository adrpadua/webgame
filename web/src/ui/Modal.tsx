import { useEffect, type ReactNode } from 'react'

// The one reusable popup modal surface for the play surface: a dimmed
// backdrop plus a framed, focused panel. Anything that needs a deliberate
// "pause and read this" moment (guides, confirmations, summaries) renders
// through here so every popup dims, frames, animates, and dismisses the
// same way. Escape and a backdrop tap both call onDismiss.
export function Modal({
  onDismiss,
  labelledBy,
  accentBorderClass = 'border-zinc-600',
  testId,
  children,
}: {
  onDismiss: () => void
  labelledBy: string
  accentBorderClass?: string
  testId?: string
  children: ReactNode
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  return (
    <div
      className="wb-fade-in absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/80 p-5 backdrop-blur-[2px]"
      data-testid={testId}
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        className={`wb-pop-in max-h-full w-full overflow-y-auto rounded-2xl border-2 ${accentBorderClass} bg-zinc-900 p-4 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  )
}
