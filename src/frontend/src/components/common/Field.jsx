import { useState } from 'react'
import Icon from './Icon'

/**
 * Label + control + hint + error, wired for assistive technology (WCAG 3.3.1, 3.3.2):
 * the control is described by its hint and its error, and marked invalid when it has one.
 * Pass the control as a render function to receive the ids: {(a11y) => <input {...a11y} />}.
 */
export default function Field({ id, label, required = false, hint, error, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
        {required ? <RequiredMark /> : <span className="ml-1.5 text-sm font-normal text-ink-soft">(optional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

export function RequiredMark() {
  return (
    <span className="ml-1 text-brick-500" aria-hidden="true">
      *
    </span>
  )
}

/** Icon + text, so an error is never signalled by colour alone (WCAG 1.4.1). */
export function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-medium text-brick-700">
      <Icon name="alert" size={16} className="mt-0.5" />
      <span>{message}</span>
    </p>
  )
}

/** Password input that allows paste and password managers, with a show toggle (WCAG 3.3.8). */
export function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={`input pr-16 ${className}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        className="absolute inset-y-1 right-1 rounded px-2.5 text-sm font-semibold text-civic-600 hover:bg-civic-50"
      >
        {visible ? 'Hide' : 'Show'}
        <span className="sr-only"> password</span>
      </button>
    </div>
  )
}
