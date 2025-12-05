/**
 * Analytics Helper
 * Lightweight event tracking utility
 * 
 * Currently logs to console. Replace with actual analytics provider
 * (e.g., Mixpanel, Amplitude, PostHog) when ready.
 */

const IS_DEV = typeof window !== 'undefined' && window.location?.hostname === 'localhost';

/**
 * Track an analytics event
 * @param {string} eventName - Name of the event (e.g., 'featured_impression')
 * @param {Object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
  const payload = {
    event: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
  };

  // Log to console in development
  if (IS_DEV) {
    console.log('[Analytics]', eventName, payload.properties);
  }

  // TODO: Send to analytics provider
  // Examples:
  // mixpanel.track(eventName, payload.properties);
  // posthog.capture(eventName, payload.properties);
  // amplitude.logEvent(eventName, payload.properties);
};

/**
 * Track a page view
 * @param {string} pageName - Name of the page
 * @param {Object} properties - Additional properties
 */
export const trackPageView = (pageName, properties = {}) => {
  trackEvent('page_view', {
    page_name: pageName,
    ...properties
  });
};