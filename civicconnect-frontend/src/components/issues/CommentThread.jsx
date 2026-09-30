import { useState } from 'react'
import Button from '../common/Button'
import { inputClasses } from '../common/FormField'

export default function CommentThread({ comments, onAddComment }) {
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    setIsSubmitting(true)
    try {
      await onAddComment(body.trim())
      setBody('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {comments.length === 0 && <p className="text-sm text-ink-soft">No comments yet. Be the first to add an update.</p>}

      <ul className="flex flex-col gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-md border border-line bg-paper-raised p-3">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="font-medium text-ink">{comment.author?.name || 'Resident'}</span>
              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 text-sm text-ink">{comment.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          rows={3}
          placeholder="Add an update or question…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={inputClasses}
        />
        <Button type="submit" variant="secondary" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </Button>
      </form>
    </div>
  )
}
