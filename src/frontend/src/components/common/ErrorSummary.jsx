import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { plural } from '../../utils/format'

/**
 * Error summary at the top of a form (wireframe: submit request, note 1).
 * Lists every problem as a link that moves focus to the field; receives focus itself when it
 * appears so keyboard and screen-reader users land on it (WCAG 3.3.1).
 */
export default function ErrorSummary({ errors, fieldIds = {} }) {
  const ref = useRef(null)
  const count = errors.length

  useEffect(() => {
    if (count > 0) ref.current?.focus()
  }, [count, errors])

  if (count === 0) return null

  const focusField = (event, field) => {
    event.preventDefault()
    const element = document.getElementById(fieldIds[field] ?? field)
    element?.focus()
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-md border-2 border-brick-500 bg-brick-100 px-4 py-3.5"
    >
      <p className="flex items-center gap-2 font-semibold text-brick-700">
        <Icon name="alert" />
        {count} {plural(count, 'field')} {count === 1 ? 'needs' : 'need'} attention before you can submit
      </p>
      <ul className="mt-2 flex flex-col gap-1 pl-7">
        {errors.map(({ field, message }) => (
          <li key={field}>
            <a href={`#${fieldIds[field] ?? field}`} onClick={(event) => focusField(event, field)} className="link !text-brick-700">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
