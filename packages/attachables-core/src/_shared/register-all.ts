import type { AttachableRegistry } from '@mobile-reality/mdma-runtime';
import { formHandler } from '../form/form-handler.js';
import { buttonHandler } from '../button/button-handler.js';
import { tasklistHandler } from '../tasklist/tasklist-handler.js';
import { tableHandler } from '../table/table-handler.js';
import { calloutHandler } from '../callout/callout-handler.js';
import { approvalGateHandler } from '../approval-gate/approval-gate-handler.js';
import { webhookHandler } from '../webhook/webhook-handler.js';

export function registerAllCoreAttachables(registry: AttachableRegistry): void {
  registry.register(formHandler);
  registry.register(buttonHandler);
  registry.register(tasklistHandler);
  registry.register(tableHandler);
  registry.register(calloutHandler);
  registry.register(approvalGateHandler);
  registry.register(webhookHandler);
}
