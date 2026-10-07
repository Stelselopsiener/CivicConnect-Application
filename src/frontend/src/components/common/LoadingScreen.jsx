export default function LoadingScreen({ label = 'Loading' }) {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-ink-soft">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-civic-100 border-t-civic-500" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}
