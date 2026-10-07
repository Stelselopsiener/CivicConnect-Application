import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { requestGateway } from '../../services'
import { ACTION_TYPE } from '../../services/requestGateway'
import { formatDateTime, toDateInput } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import Icon from '../../components/common/Icon'
import LoadingScreen from '../../components/common/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'

const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '', label: 'All time' },
]
const NO_FILTERS = { search: '', actionType: '', period: '7' }

const toQuery = ({ search, actionType, period }) => ({
  search: search.trim(),
  actionType,
  startDate: period ? toDateInput(new Date(Date.now() - Number(period) * 86400000)) : '',
})

const change = (entry) => {
  if (entry.detail) return entry.detail
  if (entry.statusChanged) return `${entry.previousStatus} → ${entry.newStatus}`
  return entry.type === ACTION_TYPE.SUBMITTED ? `New → ${entry.newStatus}` : null
}
const actor = (entry) => entry.actor?.name ?? 'Requester'

/**
 * Management: who did what, when, and previous → new (REQ-021, ASR-009).
 * Read-only by design: there is no edit or delete control because the action table is
 * append-only (§8.3).
 */
export default function AuditTrail() {
  const [draft, setDraft] = useState(NO_FILTERS)
  const [applied, setApplied] = useState(NO_FILTERS)
  const { data, error, isLoading, reload } = useAsync(() => requestGateway.listAudit(toQuery(applied)), [applied])

  const apply = (event) => {
    event.preventDefault()
    setApplied(draft)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit trail" meta={data ? `${data.length} recorded actions` : null} />

      <form onSubmit={apply} className="grid gap-4 rounded-lg border border-line bg-raised p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_13rem_11rem_auto] lg:items-end">
        <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-semibold">Request or staff member</span>
          <input type="search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="CC-00121 or a staff name" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Action</span>
          <select value={draft.actionType} onChange={(event) => setDraft({ ...draft, actionType: event.target.value })} className="input">
            <option value="">All actions</option>
            {Object.values(ACTION_TYPE).map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Period</span>
          <select value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} className="input">
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {isLoading && !data && <LoadingScreen label="Loading the audit trail" />}
      <ErrorBanner error={error} title="The audit trail could not be loaded" onRetry={reload} />

      {data && data.length === 0 && (
        <EmptyState title="No actions match these filters">Widen the period, or search for a different request or staff member.</EmptyState>
      )}

      {data && data.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-line bg-raised shadow-card md:block">
            <table className="w-full text-left">
              <caption className="sr-only">Audit trail, newest first</caption>
              <thead>
                <tr className="border-b-2 border-ink/80 text-sm">
                  {['When', 'Request', 'By', 'Action', 'Previous → new', 'Comment'].map((header) => (
                    <th key={header} scope="col" className="px-4 py-3 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id} className="border-b border-line align-top last:border-0">
                    <td className="tabular px-4 py-3 whitespace-nowrap">{formatDateTime(entry.date)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/requests/${entry.requestId}`} className="link tabular font-mono text-sm">
                        {entry.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{actor(entry)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{entry.type}</td>
                    <td className="px-4 py-3 font-medium">{change(entry) ?? <span className="font-normal text-ink-soft">No change</span>}</td>
                    <td className="max-w-xs px-4 py-3 text-ink-soft">{entry.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {data.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-line bg-raised p-4 shadow-card">
                <p className="flex items-center justify-between gap-3">
                  <Link to={`/requests/${entry.requestId}`} className="link tabular font-mono text-sm">
                    {entry.reference}
                  </Link>
                  <span className="tabular text-sm text-ink-soft">{formatDateTime(entry.date)}</span>
                </p>
                <p className="mt-2 font-semibold">
                  {entry.type}
                  {change(entry) && <span className="font-medium">: {change(entry)}</span>}
                </p>
                <p className="text-sm text-ink-soft">By {actor(entry)}</p>
                {entry.comment && <p className="mt-1 text-sm">{entry.comment}</p>}
              </li>
            ))}
          </ul>

          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Icon name="lock" size={16} /> Read-only. Entries cannot be edited or deleted from any screen.
          </p>
        </>
      )}
    </div>
  )
}
