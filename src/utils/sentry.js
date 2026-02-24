import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
  initialized = true;
}

export function setSentryUser(user) {
  if (!initialized || !user) return;
  Sentry.setUser({ id: String(user.id), email: user.email });
}

export function clearSentryUser() {
  if (!initialized) return;
  Sentry.setUser(null);
}
