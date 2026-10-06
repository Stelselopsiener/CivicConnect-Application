import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAsync } from '../../hooks/useAsync'
import { useSort } from '../../hooks/useSort'
import { requestGateway } from '../../services'
import { DERIVED_VIEW } from '../../services/requestGateway'
import { REQUEST_EVENTS } from '../../services/events/eventBus'
import { ALL_STATUSES, isOpen } from '../../domain/requestLifecycle'
import { SORT_STRATEGIES, sortRequests } from '../../domain/sortStrategies'
import { plural } from '../../utils/format'
import { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import ChipGroup from '../../components/common/ChipGroup'
import EmptyState from '../../components/common/EmptyState'
import LoadingScreen from '../../components/common/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'
import RequestTable from '../../components/requests/RequestTable'

const COLUMNS = ['reference', 'title', 'address', 'status', 'owner', 'due']
const SORT_CHOICES = ['overdueFirst', 'dueSoonest', 'newest', 'oldest']
const NO_FILTERS = { search: '', status: DERIVED_VIEW.OPEN }

/**
 * Staff: requests in the staff member's own category, with search, filter and sort
 * (REQ-007, REQ-008). The API scopes the list by user.category; nothing here can widen it.
 */
export default function Worklist() {
  const { user } = useAuth()
  const [draft, setDraft] = useState(NO_FILTERS)
  const [applied, setApplied] = useState(NO_FILTERS)
  const [view, setView] = useState('mine')
  const { sort, onSort, setSort } = useSort('overdueFirst')

  const { data, error, isLoading, reload } = useAsync(
    () => requestGateway.listForStaff(applied),
    [applied],
    { refreshOn: REQUEST_EVENTS },
  )

  const requests = useMemo(() => data ?? [], [data])
  // Default view is the triage queue: nobody owns it yet, or I do.
  const mine = requests.filter((request) => !request.owner || request.owner.id === user.id)
  const shown = sortRequests(view === 'mine' ? mine : requests, sort.key, sort.direction)
  const openCount = requests.filter((request) => isOpen(request.status)).length
  const filtered = applied.search !== '' || applied.status !== NO_FILTERS.status

  const apply = (event) => {
    event.preventDefault()
    setApplied({ ...draft, search: draft.search.trim() })
  }
  const clear = () => {
    setDraft(NO_FILTERS)
    setApplied(NO_FILTERS)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Worklist"
        meta={data ? `${user.category}: ${openCount} open ${plural(openCount, 'request')}${filtered ? ' match your filters' : ''}` : user.category}
        actions={
          <ChipGroup
            label="Which requests"
            value={view}
            onChange={setView}
            options={[
              { value: 'mine', label: 'Unassigned and mine', count: data ? mine.length : undefined },
              { value: 'category', label: 'All in my category', count: data ? requests.length : undefined },
            ]}
          />
        }
      />

      <form onSubmit={apply} className="grid gap-4 rounded-lg border border-line bg-raised p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end">
        <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-semibold">Search</span>
          <input
            type="search"
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
            placeholder="Reference, title or address"
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="input">
            <option value={DERIVED_VIEW.OPEN}>Any open</option>
            <option value={DERIVED_VIEW.OVERDUE}>Overdue</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            <option value="">All statuses</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Order</span>
          <select
            value={SORT_CHOICES.includes(sort.key) ? sort.key : ''}
            onChange={(event) => setSort({ key: event.target.value, direction: 'asc' })}
            className="input"
          >
            {!SORT_CHOICES.includes(sort.key) && <option value="">By column</option>}
            {SORT_CHOICES.map((key) => (
              <option key={key} value={key}>
                {SORT_STRATEGIES[key].label}
              </option>
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

      {isLoading && !data && <LoadingScreen label="Loading the worklist" />}
      <ErrorBanner error={error} title="The worklist could not be loaded" onRetry={reload} />

      {data && shown.length === 0 && (
        <EmptyState
          title={filtered ? 'No requests match these filters' : 'Nothing is waiting for you'}
          action={
            filtered ? (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            ) : (
              view === 'mine' && requests.length > 0 && (
                <Button variant="secondary" onClick={() => setView('category')}>
                  Show all in {user.category}
                </Button>
              )
            )
          }
        >
          {filtered
            ? 'Try a different status, or search by reference such as CC-00128.'
            : `There are no unassigned ${user.category} requests and none assigned to you.`}
        </EmptyState>
      )}

      {data && shown.length > 0 && (
        <RequestTable requests={shown} columns={COLUMNS} sort={sort} onSort={onSort} caption={`${user.category} worklist`} />
      )}
    </div>
  )
}
