export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="rounded-md border border-brick-300 bg-brick-300/15 px-4 py-3 text-sm text-brick-700"
    >
      {message}
    </div>
  )
}
