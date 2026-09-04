import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { USE_MOCKS } from '@shared/lib/mock';
import { useAccessToken } from '@shared/stores/authStore';
import { notificationKeys } from '../api/notification.keys';

/**
 * Live notifications over Server-Sent Events.
 *
 * The backend already publishes every dispatched notification to the recipient's
 * open connections (`realtime` channel → `hub.publishToUser`), and exposes them
 * at `GET /api/v1/realtime/stream`, emitting
 *   `data: {"type":"notification","notification":{…}}`
 * plus a `: ping` comment every 25 s to keep proxies from idling the socket out.
 *
 * This hook does NOT push the payload into the cache. It invalidates instead, so
 * the list, the KPI row and the badge all refetch through the one filtering and
 * scoping pipeline they normally use — a socket frame must not be able to inject
 * a row that the scope gate never saw.
 *
 * ⚠️ AUTH CAVEAT, INHERITED FROM THE TRANSPORT: `EventSource` cannot set request
 * headers, so the server accepts `?token=<jwt>` (plugins/realtime.js:182). The
 * access token therefore appears in the stream URL. That is the backend's
 * documented auth method for this endpoint and is not something the client can
 * work around; it is called out here so nobody copies the pattern to a normal
 * request, where `apiClient` sends a proper `Authorization` header.
 */

/** Give up after this many consecutive failures — never reconnect-loop forever. */
const MAX_RETRIES = 5;

export interface NotificationStreamState {
  /** True while the SSE connection is open, so the badge can stop polling. */
  isLive: boolean;
}

export function useNotificationStream(): NotificationStreamState {
  const queryClient = useQueryClient();
  const token = useAccessToken();
  const [isLive, setIsLive] = useState(false);
  // Consecutive connection failures. A ref, not state: it must survive
  // re-renders without causing one, since nothing renders from it.
  const failuresRef = useRef(0);

  useEffect(() => {
    // Mock mode has no server to stream from; the badge falls back to polling.
    if (USE_MOCKS || !token) {
      setIsLive(false);
      return;
    }
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    // `base` may be relative ("/api/v1") in production, which `new URL` needs an
    // origin for; resolving against the document keeps both forms working.
    const url = new URL(`${base.replace(/\/$/, '')}/realtime/stream`, window.location.origin);
    url.searchParams.set('token', token);

    // A fresh token (a new sign-in) deserves a fresh retry budget, otherwise a
    // session that exhausted MAX_RETRIES would never reconnect.
    failuresRef.current = 0;

    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let closed = false;

    const connect = () => {
      if (closed) return;
      source = new EventSource(url.toString());

      source.onopen = () => {
        failuresRef.current = 0;
        setIsLive(true);
      };

      source.onmessage = (event: MessageEvent<string>) => {
        let payload: { type?: string } | null = null;
        try {
          payload = JSON.parse(event.data) as { type?: string };
        } catch {
          // A malformed frame is the server's problem, not a reason to tear down
          // a working stream.
          return;
        }
        if (payload?.type !== 'notification') return;
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      };

      source.onerror = () => {
        setIsLive(false);
        source?.close();
        source = null;
        failuresRef.current += 1;
        if (closed || failuresRef.current >= MAX_RETRIES) return;
        // EventSource retries on its own, but only for a clean disconnect — a 401
        // or a 404 closes it for good. Reconnecting explicitly, with a backoff
        // capped by MAX_RETRIES, covers both without hammering a dead endpoint.
        retryTimer = window.setTimeout(connect, 2 ** failuresRef.current * 1000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      source?.close();
      setIsLive(false);
    };
  }, [queryClient, token]);

  return { isLive };
}
