import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { listIssues } from '../services/issueService'
import IssueCard from '../components/issues/IssueCard'
import LoadingScreen from '../components/common/LoadingScreen'
import ErrorBanner from '../components/common/ErrorBanner'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/common/Button'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'reported', label: 'Reported' },
  { value: 'in_review', label: 'In review' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

export default function IssueList() {
  const [status, setStatus] = useState('')
  const { data, error, isLoading } = useAsync(() => listIssues(status ? { status } : {}), [status])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Community issues</h1>
          <p className="mt-1 text-ink-soft">Everything reported by residents in your area.</p>
        </div>
        <Button as={Link} to="/issues/new">
          Report an issue
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatus(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              status === filter.value
                ? 'border-civic-500 bg-civic-500 text-white'
                : 'border-line bg-paper-raised text-ink-soft hover:border-civic-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingScreen label="Loading issues" />}
      {!isLoading && error && <ErrorBanner message={error} />}
      {!isLoading && !error && data?.items?.length === 0 && (
        <EmptyState
          title="No issues match this filter"
          description="Try a different status, or check back once new issues are reported."
        />
      )}
      {!isLoading && !error && data?.items?.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.items.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}
