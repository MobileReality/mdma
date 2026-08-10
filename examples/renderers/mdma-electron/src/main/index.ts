import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PolicyEngine, createDefaultPolicy } from '@mobile-reality/mdma-runtime';
import { BrowserWindow, app, shell } from 'electron';
import { createActionHost } from './actions.js';
import { type AuditTrail, createAuditTrail } from './audit.js';
import { forwardAuditChanges, registerMdmaIpc } from './ipc.js';

const sessionId = randomUUID();

function createWindow(audit: AuditTrail) {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    title: 'MDMA — Electron',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const disposeAuditForwarding = forwardAuditChanges(audit, window.webContents);
  window.on('closed', disposeAuditForwarding);

  // Anything the document links out to opens in the real browser, never in-app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

void app.whenReady().then(() => {
  const audit = createAuditTrail({
    sessionId,
    documentId: 'electron-chat',
    filePath: join(app.getPath('userData'), 'mdma-audit.jsonl'),
  });

  // Packaged builds run under production rules; a dev run stays in `preview`,
  // where the default policy denies outbound webhook calls — which is what makes
  // the "denied by policy" path visible in the example.
  const policy = new PolicyEngine(createDefaultPolicy(), app.isPackaged ? 'production' : 'preview');

  registerMdmaIpc({ audit, actionHost: createActionHost(policy, audit) });
  createWindow(audit);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(audit);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
