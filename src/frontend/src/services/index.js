/**
 * Composition root — DESIGN PATTERNS: Abstract Factory + Strategy selection.
 *
 * The only place that decides *which* implementation the app runs on. It picks a transport
 * strategy (real HTTP, or the in-browser demo API), builds the gateways on top of it and
 * decorates the request gateway with event publishing. Every page imports from here and is
 * identical in both modes; switching is one environment variable (VITE_USE_MOCK_API).
 *
 * Same idea as the backend composition root in D11, where the NotificationChannel strategy is
 * chosen in app.js and no module knows which provider it received.
 */
import { env } from '../config/env'
import { createAuthGateway } from './authGateway'
import { createRequestGateway } from './requestGateway'
import { eventBus } from './events/eventBus'
import { withRequestEvents } from './events/withRequestEvents'
import { httpTransport } from './http/httpTransport'
import { mockTransport } from './mock/mockTransport'
import { getToken, clearToken } from './session'

export function createServices({ transport, bus }) {
  return {
    auth: createAuthGateway(transport),
    requests: withRequestEvents(createRequestGateway(transport), bus),
  }
}

const transport = env.useMockApi ? mockTransport : httpTransport

// Keep the request-module transport selection intact for teammates' development work.
// Discard only the old unsigned demo session, never genuine backend tokens.
if (getToken()?.endsWith('.demo')) clearToken()
export const authGateway = createAuthGateway(httpTransport)
export const requestGateway = withRequestEvents(createRequestGateway(transport), eventBus)
export const isDemoMode = env.useMockApi
