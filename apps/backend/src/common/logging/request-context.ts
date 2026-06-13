import { AsyncLocalStorage } from 'async_hooks';

type RequestContext = {
  traceId: string;
};

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestTraceId(): string | undefined {
  return requestContextStorage.getStore()?.traceId;
}

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback);
}
