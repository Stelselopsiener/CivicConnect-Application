/**
 * A row of mutually exclusive choices that are all visible at once ("recognition rather than
 * recall", PED §10.3). Used for list views (Open / Finished / All).
 */
export default function ChipGroup({ label, options, value, onChange, className = '' }) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-10 cursor-pointer rounded-full border px-4 text-[15px] font-medium transition-colors ${
              selected
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-raised text-ink hover:border-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`tabular ml-1.5 ${selected ? 'text-white/75' : 'text-ink-soft'}`}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
