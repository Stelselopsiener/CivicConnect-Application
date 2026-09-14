const STATUS_CONFIG = {
  reported: { label: 'Reported', className: 'bg-brick-300/40 text-brick-700' },
  in_review: { label: 'In review', className: 'bg-signal-300/50 text-signal-700' },
  in_progress: { label: 'In progress', className: 'bg-municipal-300/50 text-municipal-700' },
  resolved: { label: 'Resolved', className: 'bg-civic-100 text-civic-700' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-black/5 text-ink-soft' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
