const VARIANTS = {
  primary: 'bg-civic-500 text-white hover:bg-civic-600 disabled:bg-civic-100 disabled:text-civic-300',
  secondary: 'bg-transparent text-civic-700 border border-civic-500 hover:bg-civic-50 disabled:opacity-50',
  ghost: 'bg-transparent text-ink-soft hover:bg-black/5 disabled:opacity-50',
  danger: 'bg-brick-500 text-white hover:bg-brick-700 disabled:bg-brick-300',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
