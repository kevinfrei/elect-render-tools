// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import { MakeError } from '@freik/core-utils';
import { clipboard, IpcRenderer, ipcRenderer } from 'electron';
import isDev from 'electron-is-dev';
import { ObjectEncodingOptions, OpenMode, PathLike, promises as fsp } from 'fs';
import { FileHandle } from 'fs/promises';

const err = MakeError('renderer-err');

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

interface MyWindow extends Window {
  freik?: FreikConnector;
  initApp?: () => void;
}

declare let window: MyWindow;

// This will expose the ipcRenderer (and isDev) interfaces for use by the
// React components, then, assuming the index.js has already be invoked, it
// calls the function to start the app, thus ensuring that the app has access
// to the ipcRenderer to enable asynchronous callbacks to affect the Undux store

// Yeah, this is unsafe
// Should eventually is contextBridge.exposeInMainWorld
// If I change that around, then I can switch contextIsolation in window.ts
// to false
let init = false;
export function InitRender() {
  if (init) return;
  init = true;
  window.addEventListener('DOMContentLoaded', () => {
    const freik: FreikConnector = {
      ipc: ipcRenderer,
      isDev,
      clipboard,
      readFile: fsp.readFile,
    };
    window.freik = freik;
    if (window.initApp) {
      window.initApp();
    } else {
      err('FAILURE: No window.initApp() attached.');
    }
  });
}
