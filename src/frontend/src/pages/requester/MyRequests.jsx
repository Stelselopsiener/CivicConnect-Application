import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestGateway } from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { useSort } from '../../hooks/useSort'
import { isOpen } from '../../domain/requestLifecycle'
import { sortRequests } from '../../domain/sortStrategies'
import { formatAgo } from '../../utils/format'
import Banner, { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import ChipGroup from '../../components/common/ChipGroup'
import EmptyState from '../../components/common/EmptyState'
import Icon from '../../components/common/Icon'
import LoadingScreen from '../../components/common/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'
import RequestTable from '../../components/requests/RequestTable'

const COLUMNS = ['reference', 'title', 'category', 'status', 'lastUpdate']

/** The most recent thing staff did on any of the requester's requests (REQ-006, S-IN-003). */
function latestStaffUpdate(requests) {
  return requests
    .flatMap((request) => request.actions.filter((action) => action.actor).map((action) => ({ request, action })))
    .sort((a, b) => b.action.date - a.action.date)[0]
}

/** Requester: status and history of their own requests (REQ-004, REQ-005, REQ-006). */
export default function MyRequests() {
  const { data, error, isLoading, reload } = useAsync(() => requestGateway.listMine(), [])
  const [view, setView] = useState('open')
  const { sort, onSort } = useSort('lastUpdate')

  const requests = useMemo(() => data ?? [], [data])
  const open = requests.filter((request) => isOpen(request.status))
  const finished = requests.filter((request) => !isOpen(request.status))
  const shown = sortRequests({ open, finished, all: requests }[view], sort.key, sort.direction)
  const latest = latestStaffUpdate(requests)

  const newRequest = (
    <Button as={Link} to="/requests/new">
      <Icon name="plus" /> New request
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My requests" actions={newRequest} />

      {isLoading && <LoadingScreen label="Loading your requests" />}
      <ErrorBanner error={error} title="Your requests could not be loaded" onRetry={reload} />

      {data && requests.length === 0 && (
        <EmptyState title="You have not reported anything yet" action={newRequest}>
          When you report a problem it appears here, with its status and every update from staff.
        </EmptyState>
      )}

      {data && requests.length > 0 && (
        <>
          {latest && (
            <Banner tone="info">
              Update on <strong className="tabular">{latest.request.reference}</strong>:{' '}
              {latest.action.statusChanged ? (
                <>
                  status changed to <strong>{latest.action.newStatus}</strong>
                </>
              ) : (
                'new update'
              )}{' '}
              by the {latest.request.category} team, {formatAgo(latest.action.date)}.{' '}
              <Link to={`/requests/${latest.request.id}`} className="link">
                View
              </Link>
            </Banner>
          )}

          <ChipGroup
            label="Show"
            value={view}
            onChange={setView}
            options={[
              { value: 'open', label: 'Open', count: open.length },
              { value: 'finished', label: 'Finished', count: finished.length },
              { value: 'all', label: 'All', count: requests.length },
            ]}
          />

          {shown.length === 0 ? (
            <EmptyState title={view === 'open' ? 'Nothing open right now' : 'No finished requests yet'}>
              {view === 'open' ? 'All your requests are finished. Choose "All" to see them.' : 'Requests appear here once they are completed, closed, rejected or cancelled.'}
            </EmptyState>
          ) : (
            <RequestTable requests={shown} columns={COLUMNS} sort={sort} onSort={onSort} caption="My requests" />
          )}
        </>
      )}
    </div>
  )
}
