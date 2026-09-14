import { getIssues, saveIssues, networkDelay } from './mockStore'

/**
 * Mirrors src/services/issueService.js exactly (same function names,
 * params, and return shapes). See that file for the real endpoint
 * contract this substitutes for.
 */

function currentUser() {
  const raw = localStorage.getItem('civicconnect_user')
  return raw ? JSON.parse(raw) : null
}

export async function listIssues(params = {}) {
  await networkDelay()
  let items = getIssues()

  if (params.status) {
    items = items.filter((issue) => issue.status === params.status)
  }
  if (params.reportedBy) {
    items = items.filter((issue) => issue.reportedBy.id === params.reportedBy)
  }

  items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const pageSize = params.pageSize || items.length
  const page = params.page || 1
  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize)

  return { items: paged, total: items.length, page, pageSize }
}

export async function getIssue(id) {
  await networkDelay()
  const issue = getIssues().find((i) => i.id === id)
  if (!issue) {
    const error = new Error('That issue could not be found.')
    error.status = 404
    throw error
  }
  return issue
}

export async function createIssue(payload) {
  await networkDelay()
  const user = currentUser()
  const issues = getIssues()
  const newIssue = {
    id: `i${Date.now()}`,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    location: payload.location,
    status: 'reported',
    upvoteCount: 0,
    reportedBy: { id: user?.id || 'unknown', name: user?.name || 'Resident' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
  }
  saveIssues([newIssue, ...issues])
  return newIssue
}

export async function updateIssueStatus(id, status) {
  await networkDelay()
  const issues = getIssues()
  const index = issues.findIndex((i) => i.id === id)
  if (index === -1) {
    const error = new Error('That issue could not be found.')
    error.status = 404
    throw error
  }
  issues[index] = { ...issues[index], status, updatedAt: new Date().toISOString() }
  saveIssues(issues)
  return issues[index]
}

export async function addComment(id, body) {
  await networkDelay()
  const user = currentUser()
  const issues = getIssues()
  const index = issues.findIndex((i) => i.id === id)
  if (index === -1) {
    const error = new Error('That issue could not be found.')
    error.status = 404
    throw error
  }
  const comment = {
    id: `c${Date.now()}`,
    body,
    author: { id: user?.id || 'unknown', name: user?.name || 'Resident' },
    createdAt: new Date().toISOString(),
  }
  issues[index] = { ...issues[index], comments: [...issues[index].comments, comment] }
  saveIssues(issues)
  return comment
}

export async function upvoteIssue(id) {
  await networkDelay(200)
  const issues = getIssues()
  const index = issues.findIndex((i) => i.id === id)
  if (index === -1) {
    const error = new Error('That issue could not be found.')
    error.status = 404
    throw error
  }
  issues[index] = { ...issues[index], upvoteCount: issues[index].upvoteCount + 1 }
  saveIssues(issues)
  return issues[index].upvoteCount
}
