import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'
import { getIssue, addComment, upvoteIssue, updateIssueStatus } from '../services/issueService'
import StatusBadge from '../components/issues/StatusBadge'
import CommentThread from '../components/issues/CommentThread'
import LoadingScreen from '../components/common/LoadingScreen'
import ErrorBanner from '../components/common/ErrorBanner'
import Button from '../components/common/Button'

const STATUS_OPTIONS = ['reported', 'in_review', 'in_progress', 'resolved']

export default function IssueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: issue, error, isLoading, refetch } = useAsync(() => getIssue(id), [id])
  const [upvoteCount, setUpvoteCount] = useState(null)
  const [actionError, setActionError] = useState('')

  const isStaff = user.role === 'staff' || user.role === 'admin'

  const handleUpvote = async () => {
    setActionError('')
    try {
      const count = await upvoteIssue(id)
      setUpvoteCount(count)
    } catch (err) {
      setActionError(err.message || 'Could not register your upvote.')
    }
  }

  const handleAddComment = async (body) => {
    await addComment(id, body)
    refetch()
  }

  const handleStatusChange = async (event) => {
    setActionError('')
    try {
      await updateIssueStatus(id, event.target.value)
      refetch()
    } catch (err) {
      setActionError(err.message || 'Could not update the status.')
    }
  }

  if (isLoading) return <LoadingScreen label="Loading issue" />
  if (error) return <ErrorBanner message={error} />
  if (!issue) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-civic-500">{issue.category}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-ink">{issue.title}</h1>
          <StatusBadge status={issue.status} />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Reported by {issue.reportedBy?.name} · {issue.location} ·{' '}
          {new Date(issue.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ErrorBanner message={actionError} />

      <p className="rounded-lg border border-line bg-paper-raised p-5 text-ink">{issue.description}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" onClick={handleUpvote}>
          Upvote ({upvoteCount ?? issue.upvoteCount})
        </Button>

        {isStaff && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Update status
            <select
              defaultValue={issue.status}
              onChange={handleStatusChange}
              className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm text-ink"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <CommentThread comments={issue.comments || []} onAddComment={handleAddComment} />
    </div>
  )
}
