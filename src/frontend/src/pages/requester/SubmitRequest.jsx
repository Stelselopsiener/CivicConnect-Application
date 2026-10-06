import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { requestGateway } from '../../services'
import { ERROR_CODE } from '../../services/AppError'
import { formatReference } from '../../domain/requestRules'
import { DESCRIPTION_MAX, TITLE_MAX, requestSchema, validate } from '../../domain/validation'
import { toDateInput } from '../../utils/format'
import Banner from '../../components/common/Banner'
import Button from '../../components/common/Button'
import ErrorSummary from '../../components/common/ErrorSummary'
import Field, { FieldError, RequiredMark } from '../../components/common/Field'
import PageHeader from '../../components/common/PageHeader'
import CategoryChips from '../../components/requests/CategoryChips'

const EMPTY = { category: '', title: '', description: '', streetAddress: '', startDate: toDateInput(), endDate: '' }

/** Where the error summary should send focus for each field. */
const FIELD_IDS = { category: 'category-first', title: 'title', description: 'description', streetAddress: 'streetAddress', startDate: 'startDate', endDate: 'endDate' }

/** API field names (snake_case) -> form field names, for server-side validation details. */
const API_FIELDS = { street_address: 'streetAddress', start_date: 'startDate', end_date: 'endDate' }

/** Requester: report a problem (REQ-001 to REQ-003, REQ-031, REQ-035; CR-001, CR-002). */
export default function SubmitRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState({ errors: {}, list: [] })
  const [attempted, setAttempted] = useState(false)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = (name, value) => {
    const next = { ...form, [name]: value }
    setForm(next)
    // After the first attempt, messages clear as each field is fixed (but the summary only
    // re-focuses on the next submit).
    if (attempted) setResult(validate(next, requestSchema))
  }
  const onInput = (event) => change(event.target.name, event.target.value)

  const submit = async (event) => {
    event.preventDefault()
    const checked = validate(form, requestSchema)
    setAttempted(true)
    setResult({ ...checked, list: [...checked.list] })
    setFailure(null)
    if (!checked.valid) return

    setBusy(true) // the button stays disabled from the first click until the server answers
    try {
      const request = await requestGateway.submit(form)
      navigate(`/requests/${request.id}`, { replace: true })
    } catch (error) {
      // The server repeats the checks (§12.3). Show its field messages in the same places.
      if (error.status === 400 && error.details.length) {
        const list = error.details.map((detail) => ({ field: API_FIELDS[detail.field] ?? detail.field, message: detail.message }))
        setResult({ valid: false, list, errors: Object.fromEntries(list.map((item) => [item.field, item.message])) })
      } else {
        setFailure(error)
      }
      setBusy(false)
    }
  }

  const { errors } = result
  const duplicateId = failure?.code === ERROR_CODE.DUPLICATE_REQUEST ? failure.details[0]?.message : null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Report a problem" crumbs={[{ label: 'My requests', to: '/requests' }, { label: 'New request' }]} />

      <ErrorSummary errors={result.list} fieldIds={FIELD_IDS} />
      {failure && (
        <Banner tone="error" title={duplicateId ? 'You have already reported this' : 'The request was not submitted'}>
          {failure.message}{' '}
          {duplicateId && (
            <Link to={`/requests/${duplicateId}`} className="link">
              Open {formatReference(duplicateId)}
            </Link>
          )}
        </Banner>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-7 rounded-lg border border-line bg-raised p-5 shadow-card sm:p-8">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-semibold">
            What kind of problem is it?
            <RequiredMark />
          </legend>
          <CategoryChips
            value={form.category}
            onChange={(category) => change('category', category)}
            invalid={Boolean(errors.category)}
            describedBy={errors.category ? 'category-error' : undefined}
            firstId="category-first"
          />
          <FieldError id="category-error" message={errors.category} />
        </fieldset>

        <Field id="title" label="Short title" required error={errors.title} hint={`${form.title.length} / ${TITLE_MAX} characters`}>
          {(a11y) => <input {...a11y} name="title" value={form.title} onChange={onInput} className="input" placeholder="For example: Broken tap in hall kitchen" />}
        </Field>

        <Field id="description" label="Describe the problem" required error={errors.description} hint="What is wrong, and how does it affect people?">
          {(a11y) => <textarea {...a11y} name="description" rows={5} maxLength={DESCRIPTION_MAX + 200} value={form.description} onChange={onInput} className="input" />}
        </Field>

        <Field id="streetAddress" label="Street address" required error={errors.streetAddress} hint="A street address or a landmark staff will recognise.">
          {(a11y) => <input {...a11y} name="streetAddress" autoComplete="street-address" value={form.streetAddress} onChange={onInput} className="input" />}
        </Field>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-5">
          <Field id="startDate" label="Start date" required error={errors.startDate} hint="When the problem started.">
            {(a11y) => <input {...a11y} name="startDate" type="date" max={toDateInput()} value={form.startDate} onChange={onInput} className="input" />}
          </Field>
          <Field id="endDate" label="End date" error={errors.endDate} hint="Leave empty if the problem is ongoing.">
            {(a11y) => <input {...a11y} name="endDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={onInput} className="input" />}
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-6">
          <Button type="submit" busy={busy} busyLabel="Submitting…">
            Submit request
          </Button>
          <p className="text-sm text-ink-soft">We will contact you at {user.email} (your account email).</p>
        </div>
      </form>
    </div>
  )
}
