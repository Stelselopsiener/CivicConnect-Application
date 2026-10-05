import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'

export default function IssueCard({ issue }) {
  return (
    <Link
      to={`/issues/${issue.id}`}
      className="block rounded-lg border border-line bg-paper-raised p-5 transition-colors hover:border-civic-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-civic-500">{issue.category}</p>
          <h3 className="mt-1 font-medium text-ink">{issue.title}</h3>
        </div>
        <StatusBadge status={issue.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{issue.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
        <span>{issue.location}</span>
        <span>{issue.upvoteCount} upvote{issue.upvoteCount === 1 ? '' : 's'}</span>
      </div>
    </Link>
  )
}
