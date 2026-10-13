/**
 * Composition root — DESIGN PATTERNS: Abstract Factory + Strategy selection.
 */
import { env } from "../config/env";
import { createAuthGateway } from "./authGateway";
import { createRequestGateway } from "./requestGateway";
import { eventBus } from "./events/eventBus";
import { withRequestEvents } from "./events/withRequestEvents";
import { httpTransport } from "./http/httpTransport";
import { getToken, clearToken } from "./session";

export function createServices({ transport, bus }) {
  return {
    auth: createAuthGateway(transport),
    requests: withRequestEvents(createRequestGateway(transport), bus),
  };
}

// Force the real HTTP transport and eliminate the missing mockTransport dependency
const transport = httpTransport;

// Discard only the old unsigned demo session, never genuine backend tokens.
if (getToken()?.endsWith(".demo")) clearToken();

export const authGateway = createAuthGateway(httpTransport);
export const requestGateway = withRequestEvents(
  createRequestGateway(transport),
  eventBus,
);

// Disable demo mode entirely so the frontend expects a real backend connection
export const isDemoMode = false;
