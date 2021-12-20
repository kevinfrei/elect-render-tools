import { useEffect } from 'react';
import { InitialWireUp, Subscribe, Unsubscribe } from './ipc';

export function useListener(
  message: string,
  listener: (args: unknown) => void,
): void {
  useEffect(() => {
    const subKey = Subscribe(message, listener);
    return () => Unsubscribe(subKey);
  });
}

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
