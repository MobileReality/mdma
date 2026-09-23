import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PolicyEngine, createDefaultPolicy } from '@mobile-reality/mdma-runtime';
import { BrowserWindow, app, session, shell } from 'electron';
import { createActionHost } from './actions.js';
import { type AuditTrail, createAuditTrail } from './audit.js';
import { forwardAuditChanges, registerMdmaIpc } from './ipc.js';
import { createAppUrlGuard, isAllowedExternalUrl } from './url-guards.js';

const sessionId = randomUUID();
const devServerUrl = process.env.ELECTRON_RENDERER_URL;
const appPagePath = join(__dirname, '../renderer/index.html');
const isAppUrl = createAppUrlGuard(devServerUrl ?? pathToFileURL(appPagePath).href);

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

  window.webContents.on('will-navigate', (event) => {
    if (!isAppUrl(event.url)) event.preventDefault();
  });

  // Web links the document opens go to the real browser, never in-app; any other scheme is dropped.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(appPagePath);
  }

  return window;
}

void app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );

  const audit = createAuditTrail({
    sessionId,
    documentId: 'electron-chat',
    filePath: join(app.getPath('userData'), 'mdma-audit.jsonl'),
  });

  // Packaged builds run under production rules; a dev run stays in `preview`,
  // where the default policy denies outbound webhook calls — which is what makes
  // the "denied by policy" path visible in the example.
  const policy = new PolicyEngine(createDefaultPolicy(), app.isPackaged ? 'production' : 'preview');

  registerMdmaIpc({ audit, actionHost: createActionHost(policy, audit), isAppUrl });
  createWindow(audit);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(audit);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
