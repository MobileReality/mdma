import { flushPromises } from '@vue/test-utils';

export async function flushMicrotasks(): Promise<void> {
  await flushPromises();
  await flushPromises();
}
