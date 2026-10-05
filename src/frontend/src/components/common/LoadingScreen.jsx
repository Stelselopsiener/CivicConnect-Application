export default function LoadingScreen({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-soft">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-civic-100 border-t-civic-500"
        role="status"
        aria-label={label}
      />
      <p className="text-sm">{label}…</p>
    </div>
  )
}
