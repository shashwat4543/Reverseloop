import { realApi } from './client';
import { mockApi } from './mock';

// Default mode is mock. Real API only when VITE_USE_MOCK === 'false' and VITE_API_BASE is set.
const useMock =
  import.meta.env.VITE_USE_MOCK === 'false' && Boolean(import.meta.env.VITE_API_BASE)
    ? false
    : true;

export const api = useMock ? mockApi : realApi;

export * from './client';
export * from './mock';
