import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
let initialized = false;

export function initAnalytics() {
  if (!MIXPANEL_TOKEN) return;
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false,
    persistence: 'localStorage',
  });
  initialized = true;
}

export function identifyUser(user) {
  if (!initialized) return;
  mixpanel.identify(user.id || user.email);
  mixpanel.people.set({
    $email: user.email,
    $name: user.name,
    role: user.role,
  });
}

export function resetAnalytics() {
  if (!initialized) return;
  mixpanel.reset();
}

export function trackEvent(name, properties = {}) {
  if (!initialized) return;
  mixpanel.track(name, properties);
}

export function trackPageView(pageName) {
  if (!initialized) return;
  mixpanel.track('page_viewed', { page: pageName });
}
