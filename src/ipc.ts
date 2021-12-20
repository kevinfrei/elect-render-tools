import { MakeError, MakeLogger, SeqNum, Type } from '@freik/core-utils';
import { IpcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron/main';
import { ObjectEncodingOptions, OpenMode, PathLike } from 'fs';
import { FileHandle } from 'fs/promises';

const log = MakeLogger('ipc', true);
const err = MakeError('ipc-err');

export type ListenKey = { key: string; id: string };
export type MessageHandler = (val: unknown) => void;

export async function ReadFromStorage(key: string): Promise<string | void> {
  return await CallMain('read-from-storage', key, Type.isString);
}

export async function WriteToStorage(key: string, data: string): Promise<void> {
  await InvokeMain('write-to-storage', [key, data]);
}

const sn = SeqNum('Listen');

// map of message names to map of id's to funtions
const listeners = new Map<string, Map<string, MessageHandler>>();

// Subscribe to the message
export function Subscribe(
  key: string,
  handler: (val: unknown) => void,
): ListenKey {
  const theKey = { key, id: sn() };
  let handlerMap: Map<string, MessageHandler> | void = listeners.get(key);
  if (!handlerMap) {
    handlerMap = new Map<string, MessageHandler>();
    listeners.set(key, handlerMap);
  }
  handlerMap.set(theKey.id, handler);
  return theKey;
}

// Remove listener from the message
export function Unsubscribe(listenKey: ListenKey): void {
  const lstn = listeners.get(listenKey.key);
  if (lstn) {
    lstn.delete(listenKey.id);
  }
}

// Called when an async message comes in from the main process
// Ideally, these should just be subscribed to as part of an AtomEffect
export function HandleMessage(message: unknown): void {
  // Walk the list of ID's to see if we've got anything with a format of:
  // { "id" : data }
  // This has an interesting side effect of letting the server process
  // send multiple "messages" in a single message:
  // { artists: ..., albums: ..., songs: ... } will invoke listeners for
  // all three of those 'messages'
  let handled = false;
  if (Type.isObjectNonNull(message)) {
    for (const id in message) {
      if (Type.isString(id) && Type.has(message, id)) {
        const lstn = listeners.get(id);
        if (lstn) {
          for (const handler of lstn.values()) {
            handled = true;
            log(`Handling message: ${id}`);
            handler(message[id]);
          }
        }
      }
    }
  }
  if (!handled) {
    err('**********');
    err('Unhandled message:');
    err(message);
    err('**********');
  }
}

type ReadFile1 = (
  path: PathLike | FileHandle,
  options?: { encoding?: null; flag?: OpenMode } | null,
) => Promise<Buffer>;

type ReadFile2 = (
  path: PathLike | FileHandle,
  options: { encoding: BufferEncoding; flag?: OpenMode } | BufferEncoding,
) => Promise<string>;

type ReadFile3 = (
  path: PathLike | FileHandle,
  options?:
    | (ObjectEncodingOptions & { flag?: OpenMode })
    | BufferEncoding
    | null,
) => Promise<string | Buffer>;

type FreikConnector = {
  ipc: IpcRenderer;
  isDev: boolean;
  clipboard: Electron.Clipboard;
  readFile: ReadFile1 | ReadFile2 | ReadFile3;
};

export interface FreikWindow extends Window {
  freik?: FreikConnector;
  initApp?: () => void;
}

declare let window: FreikWindow;

function listener(_event: IpcRendererEvent, data: unknown) {
  if (
    Type.isArray(data) &&
    Type.isObject(data[0]) &&
    Type.has(data[0], 'message')
  ) {
    log('*** Async message formed properly:');
    log(data[0]);
    HandleMessage(data[0].message);
  } else {
    err('>>> Async malformed message begin');
    err(data);
    err('<<< Async malformed message end');
  }
}

export function InitialWireUp(): () => void {
  if (window.freik !== undefined) {
    err('ipc is being set!');
    // Set up listeners for any messages that we might want to asynchronously
    // send from the main process
    window.freik.ipc.on('async-data', listener);
  } else {
    err('ipcSet is not set!');
  }
  return () => window.freik?.ipc.removeListener('async-data', listener);
}

export async function InvokeMain<T>(
  channel: string,
  key?: T,
): Promise<unknown | void> {
  let result;
  if (!window.freik) throw Error('nope');
  if (key) {
    log(`Invoking main("${channel}", "...")`);
    result = (await window.freik.ipc.invoke(channel, key)) as unknown;
    log(`Invoke main ("${channel}" "...") returned:`);
  } else {
    log(`Invoking main("${channel}")`);
    result = (await window.freik.ipc.invoke(channel)) as unknown;
    log(`Invoke main ("${channel}") returned:`);
  }
  log(result);
  return result;
}

export async function CallMain<R, T>(
  channel: string,
  key: T,
  typecheck: (val: unknown) => val is R,
): Promise<R | void> {
  let result: unknown;
  if (!window.freik) throw Error('nope');
  if (!Type.isUndefined(key)) {
    log(`CallMain("${channel}", "...")`);
    // eslint-disable-next-line
    result = await window.freik.ipc.invoke(channel, key);
    log(`CallMain ("${channel}" "...") returned:`);
  } else {
    log(`CallMain("${channel}")`);
    // eslint-disable-next-line
    result = await window.freik.ipc.invoke(channel);
    log(`CallMain ("${channel}") returned:`);
  }
  log(result);
  if (typecheck(result)) {
    return result;
  }
  err(
    `CallMain(${channel}, <T>, ${typecheck.name}(...)) result failed typecheck`,
  );
  err(result);
}

export async function PostMain<T>(channel: string, key: T): Promise<void> {
  const isVoid = (a: unknown): a is void => true;
  return CallMain(channel, key, isVoid);
}
