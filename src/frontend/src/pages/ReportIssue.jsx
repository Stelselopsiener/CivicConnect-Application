import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIssue } from '../services/issueService'
import FormField, { inputClasses } from '../components/common/FormField'
import Button from '../components/common/Button'
import ErrorBanner from '../components/common/ErrorBanner'

const CATEGORIES = ['Roads & potholes', 'Water & sanitation', 'Electricity & streetlights', 'Waste management', 'Public safety', 'Other']

export default function ReportIssue() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', category: CATEGORIES[0], location: '', description: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const issue = await createIssue(form)
      navigate(`/issues/${issue.id}`)
    } catch (err) {
      setError(err.message || 'Could not submit your report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Report an issue</h1>
      <p className="mt-1 text-ink-soft">Give as much detail as you can — it helps municipal staff act faster.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-lg border border-line bg-paper-raised p-6">
        <ErrorBanner message={error} />

        <FormField label="Title" name="title">
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Large pothole on Main Road"
            value={form.title}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>

        <FormField label="Category" name="category">
          <select id="category" name="category" value={form.category} onChange={handleChange} className={inputClasses}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Location" name="location">
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="e.g. Corner of Main Road & 5th Street"
            value={form.location}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>

        <FormField label="Description" name="description">
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="What's happening, and since when?"
            value={form.description}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>

        <Button type="submit" disabled={isSubmitting} className="mt-2 self-start">
          {isSubmitting ? 'Submitting…' : 'Submit report'}
        </Button>
      </form>
    </div>
  )
}
