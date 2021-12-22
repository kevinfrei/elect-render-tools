let mediaQuery: MediaQueryList | null = null;

/**
 * Add a listener for a media query, and invoke it once, which
 * is necessary to get it to start paying attention, apparently?
 *
 * Use it like this:
 * ```typescript
 * const handleWidthChange = useMyTransaction(
 *   ({ set }) =>
 *     ev: MediaQueryList | MediaQueryListEvent) => {
 *       set(isMiniplayerState, ev.matches);
 *     },
 * );
 * useEffect(() => {
 *   SubscribeMediaMatcher('(max-width: 499px)', handleWidthChange);
 *   return () => UnsubscribeMediaMatcher(handleWidthChange);
 * });
 * ```
 *
 * @param mq The media query to listen for changes in
 * @param handler The function to invoke when the media query changes
 */
export function SubscribeMediaMatcher(
  mq: string,
  handler: (ev: MediaQueryList | MediaQueryListEvent) => void,
): void {
  mediaQuery = window.matchMedia(mq);
  mediaQuery.addEventListener('change', handler);
  handler(mediaQuery);
}

/**
 * Remove the mediaquery listener. See {@link SubscribeMediaMatcher} for
 * an example
 *
 * @param handler the handler that had been previously subscribed
 */
export function UnsubscribeMediaMatcher(
  handler: (ev: MediaQueryList | MediaQueryListEvent) => void,
): void {
  mediaQuery?.removeEventListener('change', handler);
}
