import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAsync } from '../hooks/useAsync'
import { listIssues } from '../services/issueService'
import IssueCard from '../components/issues/IssueCard'
import LoadingScreen from '../components/common/LoadingScreen'
import ErrorBanner from '../components/common/ErrorBanner'
import EmptyState from '../components/common/EmptyState'
import Button from '../components/common/Button'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, isLoading } = useAsync(() => listIssues({ reportedBy: user.id, pageSize: 5 }), [user.id])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-ink-soft">Here's where your reported issues stand.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button as={Link} to="/issues/new">
          Report an issue
        </Button>
        <Button as={Link} to="/issues" variant="secondary">
          Browse all issues
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Your recent reports</h2>
        {isLoading && <LoadingScreen label="Loading your reports" />}
        {!isLoading && error && <ErrorBanner message={error} />}
        {!isLoading && !error && data?.items?.length === 0 && (
          <EmptyState
            title="No reports yet"
            description="Once you report an issue, you'll be able to track its status here."
            action={
              <Button as={Link} to="/issues/new" variant="secondary">
                Report your first issue
              </Button>
            }
          />
        )}
        {!isLoading && !error && data?.items?.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.items.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
