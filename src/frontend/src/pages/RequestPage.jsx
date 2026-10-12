import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAsync } from '../hooks/useAsync'
import { requestGateway } from '../services'
import { ROLE } from '../domain/requestLifecycle'
import { ErrorBanner } from '../components/common/Banner'
import LoadingScreen from '../components/common/LoadingScreen'
import RequestDetail from './requester/RequestDetail'
import RequestWorkspace from './staff/RequestWorkspace'

/**
 * /requests/:id for every role. One URL per request (so a reference can be shared), with the
 * view chosen by role: requester detail, staff workspace, or read-only for management.
 * The API decides whether this user may load the request at all (ASR-002).
 */
export default function RequestPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: request, error, isLoading, reload, setData } = useAsync(() => requestGateway.getById(id), [id])

  if (isLoading && !request) return <LoadingScreen label="Loading request" />
  if (error) return <ErrorBanner error={error} title="This request could not be opened" onRetry={reload} />

  if (user.role === ROLE.REQUESTER) return <RequestDetail request={request} onChanged={setData} />
  return <RequestWorkspace request={request} onChanged={setData} readOnly={user.role !== ROLE.STAFF} />
}
