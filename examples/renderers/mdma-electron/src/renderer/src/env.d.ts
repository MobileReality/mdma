/// <reference types="vite/client" />

import type { MdmaBridge } from '@shared/ipc';

declare global {
  interface Window {
    mdma: MdmaBridge;
  }
}
