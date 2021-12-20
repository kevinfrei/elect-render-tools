import {
  MakeError,
  MakeLogger,
  Pickle,
  Type,
  Unpickle,
} from '@freik/core-utils';
import { Fail, onRejected } from '@freik/web-utils';
import { AtomEffect, DefaultValue, RecoilState } from 'recoil';
import {
  ListenKey,
  ReadFromStorage,
  Subscribe,
  Unsubscribe,
  WriteToStorage,
} from './ipc.js';

const log = MakeLogger('freik-effects');
const err = MakeError('freik-effects-err');

export type AtomEffectParams<T> = {
  node: RecoilState<T>;
  trigger: 'get' | 'set';
  // Callbacks to set or reset the value of the atom.
  // This can be called from the atom effect function directly to initialize the
  // initial value of the atom, or asynchronously called later to change it.
  setSelf: (
    newVal:
      | T
      | DefaultValue
      | Promise<T | DefaultValue> // Only allowed for initialization at this time
      | ((curVal: T | DefaultValue) => T | DefaultValue),
  ) => void;
  resetSelf: () => void;

  // Subscribe to changes in the atom value.
  // The callback is not called due to changes from this effect's own setSelf().
  onSet: (
    func: (newValue: T | DefaultValue, oldValue: T | DefaultValue) => void,
  ) => void;
};

export function translateToMain<T>(
  toString: (input: T) => string,
  fromString: (input: string) => T | void,
) {
  return ({ node, trigger, setSelf, onSet }: AtomEffectParams<T>): void => {
    if (trigger === 'get') {
      ReadFromStorage(node.key)
        .then((value) => {
          if (value) {
            const data = fromString(value);
            if (data) {
              setSelf(data);
            }
          }
        })
        .catch(onRejected(`${node.key} Get failed in translateToMainEffect`));
    }
    onSet((newVal, oldVal) => {
      if (newVal instanceof DefaultValue) {
        return;
      }
      const newStr = toString(newVal);
      if (oldVal instanceof DefaultValue || newStr !== toString(oldVal)) {
        WriteToStorage(node.key, newStr).catch(
          onRejected(`${node.key} save to main failed`),
        );
      }
    });
  };
}

/**
 * At atom effect for pulling data from the IPC channel, with no ability to
 * push data *back* through the IPC channel (i.e. one way from Main :)
 * @param get The function (or promise) that gets the value
 * @param asyncKey The (optional) key for an asynchronous assignment
 * @param asyncDataCoercion The (required if asyncKey is specified) value that
 * takes the message from Main and translates it to the T datatype (or returns
 * nothing if it's incorrect)
 */
export function oneWayFromMain<T>(
  get: () => T | Promise<T>,
  asyncKey: string,
  asyncDataCoercion: (data: unknown) => T | undefined,
): AtomEffect<T>;

export function oneWayFromMain<T>(get: () => T | Promise<T>): AtomEffect<T>;

export function oneWayFromMain<T>(
  get: () => T | Promise<T>,
  asyncKey?: string,
  asyncDataCoercion?: (data: unknown) => T | undefined,
): AtomEffect<T> {
  return ({
    node,
    trigger,
    setSelf,
    onSet,
  }: AtomEffectParams<T>): (() => void) | void => {
    if (trigger === 'get') {
      const res = get();
      if (!Type.isPromise(res)) {
        setSelf(res);
      } else {
        res
          .then(setSelf)
          .catch(onRejected(`${node.key} Get failed in oneWayFromMain`));
      }
    }
    let lKey: ListenKey | null = null;
    if (asyncKey && asyncDataCoercion) {
      lKey = Subscribe(asyncKey, (val: unknown) => {
        const theRightType = asyncDataCoercion(val);
        if (theRightType) {
          log(`Async data for ${node.key}:`);
          log(theRightType);
          setSelf(theRightType);
        } else {
          err(`Async invalid data received for ${node.key}:`);
          err(val);
        }
      });
    }
    onSet((newVal, oldVal) => {
      if (newVal instanceof DefaultValue) {
        return;
      }
      Fail(`Invalid assignment to server-side-only atom ${node.key}`);
    });
    if (asyncKey) {
      return () => {
        if (lKey) {
          log(`Unsubscribing listener for ${asyncKey}`);
          Unsubscribe(lKey);
        }
      };
    }
  };
}

/**
 * An Atom effect to acquire the value from main, and save it back when
 * modified, after processing it from the original type to JSON using Pickling.
 *
 * @param {boolean} asyncUpdates
 * Optionally true if you also need to actively respond to server changes
 *
 * @returns an AtomEffect<T>
 */
export function bidirectionalSyncWithTranslate<T>(
  toPickleable: (val: T) => unknown,
  fromUnpickled: (val: unknown) => T | void,
  asyncUpdates?: boolean,
): AtomEffect<T> {
  return ({
    node,
    trigger,
    setSelf,
    onSet,
  }: AtomEffectParams<T>): (() => void) | void => {
    if (trigger === 'get') {
      log(`Get trigger for ${node.key}`);
      ReadFromStorage(node.key)
        .then((value) => {
          log(`Got a value from the server for ${node.key}`);
          if (value) {
            log(value);
            log('***');
            const data = fromUnpickled(Unpickle(value));
            log(data);
            if (data) {
              log(`Setting Self for ${node.key}`);
              setSelf(data);
            }
          }
        })
        .catch(onRejected(`${node.key} Get failed in bidirectional sync`));
    }
    let lKey: ListenKey | null = null;
    if (asyncUpdates) {
      lKey = Subscribe(node.key, (val: unknown) => {
        const theRightType = fromUnpickled(val);
        if (theRightType) {
          log(`Async data for ${node.key}:`);
          log(theRightType);
          setSelf(theRightType);
        } else {
          err(`Async invalid data received for ${node.key}:`);
          err(val);
        }
      });
    }
    onSet((newVal, oldVal) => {
      if (newVal instanceof DefaultValue) {
        return;
      }
      const newPickled = Pickle(toPickleable(newVal));
      if (
        oldVal instanceof DefaultValue ||
        Pickle(toPickleable(oldVal)) !== newPickled
      ) {
        log(`Saving ${node.key} back to server...`);
        WriteToStorage(node.key, newPickled)
          .then(() => log(`${node.key} saved properly`))
          .catch(onRejected(`${node.key} save to main failed`));
      }
    });

    if (asyncUpdates) {
      return () => {
        if (lKey) {
          log(`Unsubscribing listener for ${node.key}`);
          Unsubscribe(lKey);
        }
      };
    }
  };
}

export function syncWithMain<T>(asyncUpdates?: boolean): AtomEffect<T> {
  return bidirectionalSyncWithTranslate<T>(
    (a) => a as unknown,
    (a) => a as T,
    asyncUpdates,
  );
}
