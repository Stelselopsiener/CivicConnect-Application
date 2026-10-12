import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { requestGateway } from '../../services'
import { DERIVED_VIEW } from '../../services/requestGateway'
import { CATEGORY_NAMES } from '../../domain/categories'
import { STATUS } from '../../domain/requestLifecycle'
import { plural, toDateInput } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { FieldError } from '../../components/common/Field'
import LoadingScreen from '../../components/common/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'

const daysAgo = (days) => toDateInput(new Date(Date.now() - days * 86400000))
const DEFAULT_RANGE = { startDate: daysAgo(60), endDate: toDateInput() }

const listLink = (status, category) => {
  const params = new URLSearchParams({ status })
  if (category) params.set('category', category)
  return `/all-requests?${params}`
}

/**
 * Management: open, overdue, resolved and closed at a glance (REQ-018 to REQ-020, REQ-022).
 * Aggregates only — no requester names on this page (least privilege, ASR-002). Every figure
 * links to the list behind it.
 */
export default function Oversight() {
  const [draft, setDraft] = useState(DEFAULT_RANGE)
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [rangeError, setRangeError] = useState(null)
  const { data, error, isLoading, reload } = useAsync(() => requestGateway.getOverview(range), [range])

  const apply = (event) => {
    event.preventDefault()
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      setRangeError('"To" cannot be earlier than "From".')
      return
    }
    setRangeError(null)
    setRange(draft)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Service overview"
        meta="Requests reported in the selected period"
        actions={
          <form onSubmit={apply} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">From</span>
                <input type="date" value={draft.startDate} max={toDateInput()} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">To</span>
                <input type="date" value={draft.endDate} max={toDateInput()} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} className="input" aria-invalid={rangeError ? true : undefined} />
              </label>
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </div>
            <FieldError message={rangeError} />
          </form>
        }
      />

      {isLoading && !data && <LoadingScreen label="Loading the overview" />}
      <ErrorBanner error={error} title="The overview could not be loaded" onRetry={reload} />

      {data && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <Stat value={data.counts.open} label="Open" to={listLink(DERIVED_VIEW.OPEN)} />
            <Stat value={data.counts.overdue} label="Overdue" to={listLink(DERIVED_VIEW.OVERDUE)} alert={data.counts.overdue > 0} />
            <Stat value={data.counts.resolved} label="Resolved (Completed)" to={listLink(STATUS.COMPLETED)} />
            <Stat value={data.counts.closed} label="Closed" to={listLink(STATUS.CLOSED)} />
            <Stat
              value={data.medianDaysToComplete === null ? 'n/a' : `${data.medianDaysToComplete} d`}
              label="Median time to complete"
              className="col-span-2 lg:col-span-1"
            />
          </ul>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card title="Open requests by category">
              <CategoryBars rows={data.openByCategory} />
            </Card>
            <Card title="Overdue by category">
              <OverdueTable rows={data.overdueByCategory} />
              <p className="mt-4 text-sm text-ink-soft">Counts only. Requester names are not shown on this page.</p>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Overdue is marked by form as well as colour: heavier border, a label prefix and the number
 * colour all change, so the tile stands out in greyscale too (wireframe note 2).
 */
function Stat({ value, label, to, alert = false, className = '' }) {
  const body = (
    <>
      <span className={`tabular block text-4xl font-semibold ${alert ? 'text-brick-700' : 'text-ink'}`}>{value}</span>
      <span className="mt-1 block text-ink-soft">
        {alert && <span className="font-semibold text-brick-700">Needs attention: </span>}
        {label}
      </span>
    </>
  )
  const box = `block h-full rounded-lg bg-raised p-4 shadow-card sm:p-5 ${alert ? 'border-2 border-brick-500' : 'border border-line'}`
  return (
    <li className={className}>
      {to ? (
        <Link to={to} className={`${box} hover:border-ink`}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  )
}

/** One series, so one colour; the number is always printed beside the bar. */
function CategoryBars({ rows }) {
  const counts = new Map(rows.map((row) => [row.category, row.count]))
  const all = CATEGORY_NAMES.map((category) => ({ category, count: counts.get(category) ?? 0 })).sort((a, b) => b.count - a.count)
  const max = Math.max(1, ...all.map((row) => row.count))
  return (
    <ul className="flex flex-col gap-3">
      {all.map(({ category, count }) => (
        <li key={category} className="grid grid-cols-[9.5rem_1fr_2rem] items-center gap-3">
          <Link to={listLink(DERIVED_VIEW.OPEN, category)} className="truncate hover:underline">
            {category}
          </Link>
          <span className="h-3 overflow-hidden rounded-sm bg-sunken" aria-hidden="true">
            <span className="block h-full rounded-sm bg-civic-500" style={{ width: `${(count / max) * 100}%` }} />
          </span>
          <span className="tabular text-right font-semibold">{count}</span>
        </li>
      ))}
    </ul>
  )
}

function OverdueTable({ rows }) {
  if (rows.length === 0) return <p className="text-ink-soft">Nothing is overdue in this period.</p>
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b-2 border-ink/80 text-sm">
          <th scope="col" className="py-2 font-semibold">Category</th>
          <th scope="col" className="py-2 text-right font-semibold">Overdue</th>
          <th scope="col" className="py-2 pl-6 font-semibold">Oldest</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].sort((a, b) => b.count - a.count).map((row) => (
          <tr key={row.category} className="border-b border-line last:border-0">
            <td className="py-2.5">
              <Link to={listLink(DERIVED_VIEW.OVERDUE, row.category)} className="link">
                {row.category}
              </Link>
            </td>
            <td className="tabular py-2.5 text-right font-semibold">{row.count}</td>
            <td className="tabular py-2.5 pl-6">
              {row.oldestDays} {plural(row.oldestDays, 'day')} late
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
