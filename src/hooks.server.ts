import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const env = (event.platform as any)?.env as Record<string, string> | undefined;
  if (env) {
    // Persist for this worker instance; bindings are static per deployment
    (globalThis as any).__IMAGIO_ENV = env;
  }
  return resolve(event);
};
