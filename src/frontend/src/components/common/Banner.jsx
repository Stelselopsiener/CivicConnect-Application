import Icon from './Icon'

const TONES = {
  info: { box: 'border-municipal-500 bg-municipal-100 text-municipal-800', icon: 'info', role: 'status' },
  success: { box: 'border-civic-500 bg-civic-50 text-civic-700', icon: 'check', role: 'status' },
  warning: { box: 'border-signal-400 bg-signal-100 text-signal-800', icon: 'alert', role: 'status' },
  error: { box: 'border-brick-500 bg-brick-100 text-brick-700', icon: 'alert', role: 'alert' },
}

/** Inline message. Errors announce immediately (role="alert"); the rest politely (role="status"). */
export default function Banner({ tone = 'info', title, children, action, className = '' }) {
  const config = TONES[tone]
  return (
    <div role={config.role} className={`flex items-start gap-3 rounded-md border-l-4 px-4 py-3 ${config.box} ${className}`}>
      <Icon name={config.icon} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-ink">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[15px]">{children}</div>}
      </div>
      {action}
    </div>
  )
}

/** Shows a gateway error (AppError) in the interface's own words. */
export function ErrorBanner({ error, title = 'That did not work', onRetry }) {
  if (!error) return null
  return (
    <Banner
      tone="error"
      title={title}
      action={
        onRetry && (
          <button type="button" onClick={() => onRetry()} className="link shrink-0">
            Try again
          </button>
        )
      }
    >
      {error.message}
    </Banner>
  )
}
