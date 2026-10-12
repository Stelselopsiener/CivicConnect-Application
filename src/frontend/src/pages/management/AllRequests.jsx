import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { useSort } from '../../hooks/useSort'
import { requestGateway } from '../../services'
import { DERIVED_VIEW } from '../../services/requestGateway'
import { CATEGORY_NAMES } from '../../domain/categories'
import { ALL_STATUSES } from '../../domain/requestLifecycle'
import { sortRequests } from '../../domain/sortStrategies'
import { plural } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import LoadingScreen from '../../components/common/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'
import RequestTable from '../../components/requests/RequestTable'

const COLUMNS = ['reference', 'title', 'category', 'status', 'owner', 'due']

/**
 * Management: read-only list of every request (REQ-019, REQ-020, REQ-022).
 * Filters live in the URL, so the oversight tiles can link straight to "overdue in Maintenance"
 * and a filtered view can be bookmarked or shared.
 */
export default function AllRequests() {
  const [params, setParams] = useSearchParams()
  const applied = useMemo(
    () => ({ status: params.get('status') ?? '', category: params.get('category') ?? '', search: params.get('search') ?? '' }),
    [params],
  )
  const [draft, setDraft] = useState(applied)
  const { sort, onSort } = useSort('overdueFirst')
  const { data, error, isLoading, reload } = useAsync(() => requestGateway.listAll(applied), [applied])

  const filtered = Object.values(applied).some(Boolean)
  const shown = sortRequests(data ?? [], sort.key, sort.direction)

  const apply = (event) => {
    event.preventDefault()
    const next = Object.entries({ ...draft, search: draft.search.trim() }).filter(([, value]) => value)
    setParams(Object.fromEntries(next))
  }
  const clear = () => {
    setDraft({ status: '', category: '', search: '' })
    setParams({})
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="All requests" meta={data ? `${data.length} ${plural(data.length, 'request')}${filtered ? ' match your filters' : ''}. Read-only.` : 'Read-only'} />

      <form onSubmit={apply} className="grid gap-4 rounded-lg border border-line bg-raised p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end">
        <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-semibold">Search</span>
          <input type="search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Reference, title or address" className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="input">
            <option value="">All statuses</option>
            <option value={DERIVED_VIEW.OPEN}>Any open</option>
            <option value={DERIVED_VIEW.OVERDUE}>Overdue</option>
            {ALL_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Category</span>
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="input">
            <option value="">All categories</option>
            {CATEGORY_NAMES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
          {filtered && (
            <Button variant="quiet" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {isLoading && !data && <LoadingScreen label="Loading requests" />}
      <ErrorBanner error={error} title="The requests could not be loaded" onRetry={reload} />

      {data && shown.length === 0 && (
        <EmptyState title="No requests match these filters" action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}>
          Try a different status or category.
        </EmptyState>
      )}
      {data && shown.length > 0 && <RequestTable requests={shown} columns={COLUMNS} sort={sort} onSort={onSort} caption="All requests" />}
    </div>
  )
}
