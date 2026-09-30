import apiClient from './apiClient'
import * as mockIssueService from './mock/mockIssueService'

/**
 * Issue service — the expected contract for the core CivicConnect domain
 * resource. Maps directly to the "issues" table/aggregate in the data
 * baseline (see PED §5.4) and to RTM requirements for reporting, tracking
 * and resolving civic issues.
 *
 * Expected endpoints:
 *   GET    /api/issues?status=&category=&page=       -> { items, total, page, pageSize }
 *   GET    /api/issues/:id                            -> { issue }
 *   POST   /api/issues            { title, description, category, location } -> { issue }
 *   PATCH  /api/issues/:id/status { status }          -> { issue }   (staff/admin only)
 *   POST   /api/issues/:id/comments { body }          -> { comment }
 *   POST   /api/issues/:id/upvote                     -> { upvoteCount }
 *
 * `issue` shape assumed:
 *   { id, title, description, category, status, location, upvoteCount,
 *     reportedBy: { id, name }, createdAt, updatedAt, comments: [...] }
 * status is one of: 'reported' | 'in_review' | 'in_progress' | 'resolved'
 *
 * MOCK MODE: when VITE_USE_MOCK_API=true, every function below delegates
 * to src/services/mock/mockIssueService.js (localStorage-backed) instead
 * of calling the real API. Delete the mock branch (and the mock/ folder)
 * once the real API is ready — no page or component needs to change.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function listIssues(params = {}) {
  if (USE_MOCK) return mockIssueService.listIssues(params)
  const { data } = await apiClient.get('/issues', { params })
  return data
}

export async function getIssue(id) {
  if (USE_MOCK) return mockIssueService.getIssue(id)
  const { data } = await apiClient.get(`/issues/${id}`)
  return data.issue
}

export async function createIssue(payload) {
  if (USE_MOCK) return mockIssueService.createIssue(payload)
  const { data } = await apiClient.post('/issues', payload)
  return data.issue
}

export async function updateIssueStatus(id, status) {
  if (USE_MOCK) return mockIssueService.updateIssueStatus(id, status)
  const { data } = await apiClient.patch(`/issues/${id}/status`, { status })
  return data.issue
}

export async function addComment(id, body) {
  if (USE_MOCK) return mockIssueService.addComment(id, body)
  const { data } = await apiClient.post(`/issues/${id}/comments`, { body })
  return data.comment
}

export async function upvoteIssue(id) {
  if (USE_MOCK) return mockIssueService.upvoteIssue(id)
  const { data } = await apiClient.post(`/issues/${id}/upvote`)
  return data.upvoteCount
}
