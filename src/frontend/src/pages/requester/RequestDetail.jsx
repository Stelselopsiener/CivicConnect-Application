import { useState } from 'react'
import { requestGateway } from '../../services'
import { ROLE, STATUS, canTransition, isOpen } from '../../domain/requestLifecycle'
import { formatDate } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import PageHeader from '../../components/common/PageHeader'
import DetailList from '../../components/requests/DetailList'
import LifecycleRail from '../../components/requests/LifecycleRail'
import StatusPill, { OverduePill } from '../../components/requests/StatusPill'
import Timeline from '../../components/requests/Timeline'

/** Requester: one request, its plain-language progress and what happens next (REQ-004, REQ-006). */
export default function RequestDetail({ request, onChanged }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        documentTitle={request.reference}
        crumbs={[{ label: 'My requests', to: '/requests' }, { label: request.reference }]}
        title={request.title}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={request.status} />
            {request.isOverdue && <OverduePill />}
            <span>Reported {formatDate(request.createdAt)}</span>
          </span>
        }
      />

      <LifecycleRail status={request.status} showMeaning />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card title="Progress">
            <Timeline actions={request.actions} audience="requester" category={request.category} />
          </Card>
          <Card title="What you reported">
            <DetailList
              rows={[
                ['Reference', <span key="reference" className="tabular font-mono text-sm">{request.reference}</span>],
                ['Category', request.category],
                ['Street address', request.streetAddress],
                ['Started', formatDate(request.startDate)],
                ['Ended', request.endDate ? formatDate(request.endDate) : 'Ongoing'],
                ['Description', <span key="description" className="whitespace-pre-line">{request.description}</span>],
              ]}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <NextStep request={request} />
          <CancelCard request={request} onChanged={onChanged} />
        </div>
      </div>
    </div>
  )
}

function NextStep({ request }) {
  if (!isOpen(request.status)) return null
  return (
    <Card title="What happens next">
      <p>
        Target date: <strong>{formatDate(request.targetDate)}</strong>.
      </p>
      <p className="mt-2 text-ink-soft">
        {request.isOverdue
          ? 'This request has passed its target date. It is flagged as overdue for the team and for management.'
          : 'You will see an update here each time staff change the status or add a note.'}
      </p>
    </Card>
  )
}

/**
 * Cancel is always shown while the request is open; when it is not allowed the button is
 * disabled with the reason, rather than silently disappearing (wireframe note 3, D10).
 */
function CancelCard({ request, onChanged }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen(request.status)) return null
  const allowed = canTransition(request.status, STATUS.CANCELLED, ROLE.REQUESTER)

  const cancel = async () => {
    setBusy(true)
    setError(null)
    try {
      onChanged(await requestGateway.changeStatus(request.id, { newStatus: STATUS.CANCELLED }))
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  return (
    <Card title="Changed your mind?">
      <p className="text-ink-soft">You can cancel while the request is still Pending.</p>
      <ErrorBanner error={error} title="The request was not cancelled" />
      <div className="mt-4 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <Button variant="danger" size="sm" onClick={cancel} busy={busy} busyLabel="Cancelling…">
              Yes, cancel this request
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" disabled={!allowed} onClick={() => setConfirming(true)} aria-describedby={allowed ? undefined : 'cancel-reason'}>
            Cancel request
          </Button>
        )}
      </div>
      {!allowed && (
        <p id="cancel-reason" className="mt-2 text-sm text-ink-soft">
          Not available: staff have already accepted this request.
        </p>
      )}
    </Card>
  )
}
