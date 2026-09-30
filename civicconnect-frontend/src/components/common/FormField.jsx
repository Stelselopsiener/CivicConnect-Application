export default function FormField({ label, name, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-brick-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export const inputClasses =
  'rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-civic-500'
