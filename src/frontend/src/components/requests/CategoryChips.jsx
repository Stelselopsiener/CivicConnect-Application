import { CATEGORIES } from '../../domain/categories'

/**
 * All seven controlled categories visible at once (REQ-003, wireframe note 2). Built on native
 * radio inputs, so arrow keys, labels and screen readers work without extra code.
 */
export default function CategoryChips({ name = 'category', value, onChange, invalid = false, describedBy, firstId }) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="flex flex-wrap gap-2">
      {CATEGORIES.map((category, index) => {
        const selected = value === category.name
        return (
          <label
            key={category.name}
            title={category.hint}
            className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-civic-500 ${
              selected
                ? 'border-civic-500 bg-civic-500 text-white'
                : `bg-raised text-ink hover:border-ink ${invalid ? 'border-brick-500' : 'border-line-strong'}`
            }`}
          >
            <input
              id={index === 0 ? firstId : undefined}
              type="radio"
              name={name}
              value={category.name}
              checked={selected}
              onChange={() => onChange(category.name)}
              className="sr-only"
            />
            {category.name}
          </label>
        )
      })}
    </div>
  )
}
