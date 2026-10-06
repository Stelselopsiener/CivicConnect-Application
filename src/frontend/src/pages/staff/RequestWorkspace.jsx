import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAsync } from '../../hooks/useAsync'
import { requestGateway } from '../../services'
import { CATEGORY_NAMES } from '../../domain/categories'
import { STATUS, isOpen, staffTransitionOptions } from '../../domain/requestLifecycle'
import { daysOverdue } from '../../domain/requestRules'
import { formatDate } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { FieldError, RequiredMark } from '../../components/common/Field'
import PageHeader from '../../components/common/PageHeader'
import DetailList from '../../components/requests/DetailList'
import LifecycleRail from '../../components/requests/LifecycleRail'
import StatusPill, { OverduePill } from '../../components/requests/StatusPill'
import Timeline from '../../components/requests/Timeline'

/**
 * Staff: everything needed to work one request (REQ-009 to REQ-017, REQ-021, REQ-024).
 * With `readOnly` (management) the same record is shown without any controls.
 */
export default function RequestWorkspace({ request, onChanged, readOnly = false }) {
  const back = readOnly ? { label: 'All requests', to: '/all-requests' } : { label: 'Worklist', to: '/worklist' }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        documentTitle={request.reference}
        crumbs={[back, { label: request.reference }]}
        title={request.title}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={request.status} />
            {request.isOverdue && <OverduePill days={daysOverdue(request)} />}
            <span>Due {formatDate(request.targetDate)}</span>
          </span>
        }
      />

      <LifecycleRail status={request.status} />

      <div className={`grid items-start gap-6 ${readOnly ? '' : 'lg:grid-cols-[1fr_23rem]'}`}>
        <div className="flex flex-col gap-6">
          <Card title="Request details">
            <DetailList
              rows={[
                ['Requester', request.requester && `${request.requester.name}, ${request.requester.email}`],
                ['Category', <CategoryRow key="category" request={request} onChanged={onChanged} readOnly={readOnly} />],
                ['Owner', readOnly ? (request.owner?.name ?? 'Unassigned') : null],
                ['Street address', request.streetAddress],
                ['Dates', `Started ${formatDate(request.startDate)}, ${request.endDate ? `ended ${formatDate(request.endDate)}` : 'ongoing'}`],
                ['Reported', formatDate(request.createdAt)],
                ['Description', <span key="description" className="whitespace-pre-line">{request.description}</span>],
              ]}
            />
          </Card>
          <Card title="History" aside={readOnly ? 'Read-only' : 'Every change is recorded and cannot be edited'}>
            <Timeline actions={request.actions} />
          </Card>
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-6">
            <OwnershipCard request={request} onChanged={onChanged} />
            {/* key: a fresh form (and fresh options) whenever the status changes */}
            <UpdateCard key={request.status} request={request} onChanged={onChanged} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Triage correction (REQ-024): staff can move a Pending request to the right team. */
function CategoryRow({ request, onChanged, readOnly }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [category, setCategory] = useState(request.category)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const canCorrect = !readOnly && request.status === STATUS.PENDING

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const updated = await requestGateway.changeCategory(request.id, category)
      // The request now belongs to another team's worklist, so this staff member leaves it.
      if (updated.category !== user.category) navigate('/worklist', { replace: true })
      else onChanged(updated)
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <span className="flex flex-wrap items-center gap-x-3">
        {request.category}
        {canCorrect && (
          <button type="button" onClick={() => setEditing(true)} className="link cursor-pointer">
            Change
          </button>
        )}
      </span>
    )
  }

  return (
    <span className="flex flex-col gap-2">
      <span className="flex flex-wrap items-center gap-2">
        <select aria-label="Correct category" value={category} onChange={(event) => setCategory(event.target.value)} className="input max-w-56">
          {CATEGORY_NAMES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <Button size="sm" onClick={save} busy={busy} disabled={category === request.category}>
          Move request
        </Button>
        <Button size="sm" variant="quiet" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
      </span>
      <span className="text-sm text-ink-soft">The request moves to that team's worklist and leaves yours.</span>
      <ErrorBanner error={error} title="The category was not changed" />
    </span>
  )
}

/** Accept or assign responsibility (REQ-010 to REQ-012). Only staff in the request's category are listed. */
function OwnershipCard({ request, onChanged }) {
  const { user } = useAuth()
  const selectId = useId()
  const { data: members } = useAsync(() => requestGateway.listStaffMembers(request.category), [request.category])
  const [assignee, setAssignee] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const open = isOpen(request.status)
  const ownedByMe = request.owner?.id === user.id
  const candidates = (members ?? []).filter((member) => member.id !== request.owner?.id)

  const assign = async (staffId, which) => {
    setBusy(which)
    setError(null)
    try {
      onChanged(await requestGateway.assign(request.id, staffId))
      setAssignee('')
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card title="Ownership">
      <p>
        {request.owner ? (
          <>
            <strong>{ownedByMe ? 'You own this request' : request.owner.name}</strong>
            {!ownedByMe && ' owns this request'}.
          </>
        ) : (
          <strong>Unassigned</strong>
        )}
      </p>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {!ownedByMe && (
            <Button onClick={() => assign(user.id, 'me')} busy={busy === 'me'} disabled={busy !== null} className="self-start">
              {request.owner ? 'Take over myself' : 'Accept myself'}
            </Button>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={selectId} className="text-sm font-semibold">
              {ownedByMe ? 'Hand over to' : 'Or assign to'}
            </label>
            <div className="flex gap-2">
              <select id={selectId} value={assignee} onChange={(event) => setAssignee(event.target.value)} className="input min-w-0 flex-1">
                <option value="">Choose staff in {request.category}</option>
                {candidates
                  .filter((member) => member.id !== user.id)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <Button variant="secondary" onClick={() => assign(assignee, 'other')} busy={busy === 'other'} busyLabel="Assigning…" disabled={!assignee || busy !== null}>
                Assign
              </Button>
            </div>
            <p className="text-sm text-ink-soft">Only staff whose category matches are listed.</p>
          </div>
        </div>
      )}
      <ErrorBanner error={error} title="Ownership was not changed" />
    </Card>
  )
}

const COMMENT_ONLY = 'comment-only'

/**
 * Status change and/or comment in one save, matching the PATCH /status body of §12.2.
 *
 * The options are not written here: they come from the State object for the request's current
 * status (staffTransitionOptions). Moves that are not allowed are shown disabled with the
 * reason; the server enforces the same rule and answers 409 if it is bypassed (REQ-013).
 */
function UpdateCard({ request, onChanged }) {
  const options = staffTransitionOptions(request.status)
  const terminal = options.every((option) => !option.allowed)
  const [choice, setChoice] = useState(COMMENT_ONLY)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (terminal) {
    return (
      <Card title="Update this request">
        <p className="text-ink-soft">
          This request is {request.status.toLowerCase()}. No further changes can be made; the history stays available.
        </p>
      </Card>
    )
  }

  const selected = options.find((option) => option.to === choice)
  const commentRequired = choice === COMMENT_ONLY || Boolean(selected?.requiresComment)
  const commentLabel = choice === STATUS.REJECTED ? 'Reason for rejecting' : choice === STATUS.COMPLETED ? 'What was done' : 'Comment visible to requester'

  const save = async (event) => {
    event.preventDefault()
    setError(null)
    if (commentRequired && !comment.trim()) {
      setCommentError(choice === COMMENT_ONLY ? 'Write the update, or choose a new status.' : `Write a comment to move this request to ${choice}. The requester will see it.`)
      return
    }
    setCommentError(null)
    setBusy(true)
    try {
      const updated =
        choice === COMMENT_ONLY
          ? await requestGateway.addComment(request.id, { currentStatus: request.status, comment })
          : await requestGateway.changeStatus(request.id, { newStatus: choice, comment })
      setComment('')
      setChoice(COMMENT_ONLY)
      onChanged(updated)
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  const optionClass = (active, disabled) =>
    `flex items-start gap-3 rounded-md border px-3 py-2.5 ${
      disabled
        ? 'cursor-not-allowed border-dashed border-line bg-paper text-ink-soft'
        : active
          ? 'cursor-pointer border-civic-500 bg-civic-50 shadow-[inset_0_0_0_1px_var(--color-civic-500)]'
          : 'cursor-pointer border-line-strong hover:border-ink'
    }`

  return (
    <Card title="Update this request">
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Status</legend>
          <label className={optionClass(choice === COMMENT_ONLY, false)}>
            <input type="radio" name="status" className="mt-1 accent-civic-500" checked={choice === COMMENT_ONLY} onChange={() => setChoice(COMMENT_ONLY)} />
            <span>
              <span className="font-medium">Keep as {request.status}</span>
              <span className="block text-sm text-ink-soft">Add an update only</span>
            </span>
          </label>
          {options.map((option) => (
            <label key={option.to} className={optionClass(choice === option.to, !option.allowed)}>
              <input
                type="radio"
                name="status"
                className="mt-1 accent-civic-500"
                disabled={!option.allowed}
                checked={choice === option.to}
                onChange={() => setChoice(option.to)}
              />
              <span>
                <span className="font-medium">{option.to}</span>
                <span className="block text-sm text-ink-soft">
                  {option.allowed ? `${option.action}${option.requiresComment ? ', comment required' : ''}` : option.reason}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="update-comment" className="font-semibold">
            {commentLabel}
            {commentRequired ? <RequiredMark /> : <span className="ml-1.5 text-sm font-normal text-ink-soft">(optional)</span>}
          </label>
          <textarea
            id="update-comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-invalid={commentError ? true : undefined}
            aria-describedby={commentError ? 'update-comment-error' : undefined}
            placeholder="What was done, or what happens next"
            className="input"
          />
          <FieldError id="update-comment-error" message={commentError} />
        </div>

        <ErrorBanner error={error} title="Nothing was saved" />
        <Button type="submit" busy={busy} className="w-full">
          {choice === COMMENT_ONLY ? 'Save update' : `Save as ${choice}`}
        </Button>
      </form>
    </Card>
  )
}
