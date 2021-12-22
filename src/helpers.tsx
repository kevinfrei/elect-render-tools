import { useEffect } from 'react';
import { InitialWireUp, Subscribe, Unsubscribe } from './ipc';

/**
 * This is a React Hook that lets you listen for data sent from the main
 * process, via the
 * [`AsyncSend`](https://github.com/kevinfrei/elect-main-tools/blob/main/docs/modules/Comms.md#asyncsend)
 * function in the [companion module](https://github.com/kevinfrei/elect-main-tools).
 *
 * @param message The message type to listen to
 * @param listener The function to invoke with the data sent
 */
export function useListener(
  message: string,
  listener: (args: unknown) => void,
): void {
  useEffect(() => {
    const subKey = Subscribe(message, listener);
    return () => Unsubscribe(subKey);
  });
}

/**
 * This is the helper JSX element to support IPC with the main process.
 * Use it like this:
 * ```html
 * <App>
 *   <RecoilRoot>
 *     <FreikElem/>
 *     <MyOtherStuff/>
 *   </RecoilRoot>
 * </All>
 * ```
 */
export function FreikElem(): JSX.Element {
  useEffect(InitialWireUp);
  /*
  const callback = useMyTransaction(
    (xact) => (data: unknown) => MenuHandler(xact, data),
  );
  useListener('menuAction', callback);
  const handleWidthChange = useMyTransaction(
    ({ set }) =>
      (ev: MediaQueryList | MediaQueryListEvent) => {
        // set(isMiniplayerState, ev.matches);
      },
  );
  useEffect(() => {
    SubscribeMediaMatcher('(max-width: 499px)', handleWidthChange);
    return () => UnsubscribeMediaMatcher(handleWidthChange);
  });
  const setViewMode = useMyTransaction(({ set }) => (data: unknown) => {
    log('Set View Mode transaction: ', data);
    if (Type.isNumber(data)) {
      log("(it's a number!)");
      set(viewModeState, data);
    }
  });
  useListener('set-view-mode', setViewMode);
  */
  return <></>;
}
