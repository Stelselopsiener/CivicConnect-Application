const VARIANTS = {
  primary: 'bg-civic-500 text-white hover:bg-civic-600 active:bg-civic-700',
  secondary: 'bg-raised text-ink border border-line-strong hover:border-ink hover:bg-paper',
  quiet: 'bg-transparent text-civic-600 hover:bg-civic-50',
  danger: 'bg-raised text-brick-700 border border-brick-500 hover:bg-brick-100',
}

const SIZES = {
  md: 'min-h-11 px-4 text-[15px]',
  sm: 'min-h-9 px-3 text-sm',
}

/**
 * One button for the whole app. `as` lets it render a router <Link> with the same look.
 * `busy` disables it and swaps the label, which is how double submission is prevented in the
 * UI (REQ-031; the server still rejects duplicates).
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  busy = false,
  busyLabel = 'Saving…',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isButton = Component === 'button'
  return (
    <Component
      {...(isButton ? { type: 'button', disabled: disabled || busy } : {})}
      aria-busy={busy || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {busy ? busyLabel : children}
    </Component>
  )
}
