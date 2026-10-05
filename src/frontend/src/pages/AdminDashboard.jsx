import { useAsync } from '../hooks/useAsync'
import { listIssues } from '../services/issueService'
import IssueCard from '../components/issues/IssueCard'
import LoadingScreen from '../components/common/LoadingScreen'
import ErrorBanner from '../components/common/ErrorBanner'
import EmptyState from '../components/common/EmptyState'

const QUEUES = [
  { status: 'reported', title: 'New reports' },
  { status: 'in_review', title: 'In review' },
  { status: 'in_progress', title: 'In progress' },
]

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Municipal dashboard</h1>
        <p className="mt-1 text-ink-soft">Triage issues by status across the community queue.</p>
      </div>

      {QUEUES.map((queue) => (
        <Queue key={queue.status} status={queue.status} title={queue.title} />
      ))}
    </div>
  )
}

function Queue({ status, title }) {
  const { data, error, isLoading } = useAsync(() => listIssues({ status, pageSize: 6 }), [status])

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">{title}</h2>
      {isLoading && <LoadingScreen label={`Loading ${title.toLowerCase()}`} />}
      {!isLoading && error && <ErrorBanner message={error} />}
      {!isLoading && !error && data?.items?.length === 0 && (
        <EmptyState title="Nothing here" description={`No issues currently in "${title.toLowerCase()}".`} />
      )}
      {!isLoading && !error && data?.items?.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </section>
  )
}
