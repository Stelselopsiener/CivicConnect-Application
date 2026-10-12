export default function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong bg-raised/60 px-6 py-10">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {children && <p className="max-w-prose text-ink-soft">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
