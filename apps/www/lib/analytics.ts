declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const trackEvent = (
  action: string,
  params?: Record<string, unknown>,
) => {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
};
