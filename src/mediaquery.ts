let mediaQuery: MediaQueryList | null = null;

// This adds a listener for a media query and invokes it the first time which
// is necessary to get it to start paying attention, apparently.
export function SubscribeMediaMatcher(
  mq: string,
  handler: (ev: MediaQueryList | MediaQueryListEvent) => void,
): void {
  mediaQuery = window.matchMedia(mq);
  mediaQuery.addEventListener('change', handler);
  handler(mediaQuery);
}

export function UnsubscribeMediaMatcher(
  handler: (ev: MediaQueryList | MediaQueryListEvent) => void,
): void {
  mediaQuery?.removeEventListener('change', handler);
}
