import { Type } from '@freik/core-utils';
import { NativeImage, OpenDialogSyncOptions } from 'electron';
import { CallMain, FreikWindow } from './ipc.js';

declare let window: FreikWindow;

export function IsDev(): boolean {
  return window.freik !== undefined && window.freik.isDev === true;
}

export function SetInit(func: () => void): void {
  window.initApp = func;
}

export async function ShowOpenDialog(
  options: OpenDialogSyncOptions,
): Promise<string[] | void> {
  return await CallMain('show-open-dialog', options, Type.isArrayOfString);
}

export function ImageFromClipboard(): NativeImage | undefined {
  return window.freik ? window.freik.clipboard.readImage() : undefined;
}
