import {
  ApiError,
  Category,
  CollectionRequest,
  CollectionRequestCreate,
  EligibilityRequest,
  EligibilityResult,
  EventCreate,
  Item,
  ItemStatus,
  PublicItem,
  PublicTenantConfig,
  TenantConfig,
  Webhook
} from '../types';

let currentAuthToken: string | null = null;
let currentAcceptLanguage = 'en';

export function setClientToken(token: string | null) {
  currentAuthToken = token;
}

export function setClientLanguage(lang: string) {
  currentAcceptLanguage = lang;
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface RequestOpts {
  headers?: Record<string, string>;
  body?: unknown;
  idempotencyKey?: string;
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept-Language': currentAcceptLanguage,
    ...opts.headers,
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  if (opts.idempotencyKey) {
    headers['Idempotency-Key'] = opts.idempotencyKey;
  } else if (method === 'POST' && !path.includes('/check')) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (opts.body as FormData) : opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    let errCode = 'UNKNOWN_ERROR';
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.code) errCode = errJson.code;
      if (errJson.message) errMsg = errJson.message;
    } catch {
      // ignored
    }
    throw new ApiError(res.status, errCode, errMsg);
  }

  return (await res.json()) as T;
}

export const realApi = {
  async getPublicConfig(slug: string, locale?: string): Promise<PublicTenantConfig> {
    return request<PublicTenantConfig>('GET', `/v1/public/tenants/${encodeURIComponent(slug)}/config${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`);
  },

  async checkEligibility(body: EligibilityRequest): Promise<EligibilityResult> {
    return request<EligibilityResult>('POST', '/v1/eligibility/check', { body });
  },

  async createCollectionRequest(body: CollectionRequestCreate, idempotencyKey?: string): Promise<CollectionRequest> {
    return request<CollectionRequest>('POST', '/v1/collection-requests', { body, idempotencyKey });
  },

  async getCollectionRequest(id: string): Promise<CollectionRequest> {
    return request<CollectionRequest>('GET', `/v1/collection-requests/${encodeURIComponent(id)}`);
  },

  async getItem(id: string): Promise<Item> {
    return request<Item>('GET', `/v1/items/${encodeURIComponent(id)}`);
  },

  async listItems(status?: ItemStatus): Promise<{ items: Item[] }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<{ items: Item[] }>('GET', `/v1/items${q}`);
  },

  async postItemEvent(id: string, body: EventCreate): Promise<Item> {
    return request<Item>('POST', `/v1/items/${encodeURIComponent(id)}/events`, { body });
  },

  async uploadEvidence(id: string, photo?: File | Blob | string, reference?: string): Promise<Item> {
    const fd = new FormData();
    if (photo instanceof Blob) {
      fd.append('photo', photo);
    } else if (typeof photo === 'string') {
      fd.append('photoUrl', photo);
    }
    if (reference) {
      fd.append('reference', reference);
    }
    return request<Item>('POST', `/v1/items/${encodeURIComponent(id)}/evidence`, { body: fd });
  },

  async getPublicItem(publicId: string): Promise<PublicItem> {
    return request<PublicItem>('GET', `/v1/public/items/${encodeURIComponent(publicId)}`);
  },

  async getConfig(tenantId: string): Promise<TenantConfig> {
    return request<TenantConfig>('GET', `/v1/tenants/${encodeURIComponent(tenantId)}/config`);
  },

  async putConfig(tenantId: string, cfg: TenantConfig): Promise<TenantConfig> {
    return request<TenantConfig>('PUT', `/v1/tenants/${encodeURIComponent(tenantId)}/config`, { body: cfg });
  },

  async upsertRoutes(body: unknown): Promise<{ count: number; routes: unknown[] }> {
    return request<{ count: number; routes: unknown[] }>('POST', '/v1/routes:upsert', { body });
  },

  async upsertHubs(body: unknown): Promise<{ count: number; hubs: unknown[] }> {
    return request<{ count: number; hubs: unknown[] }>('POST', '/v1/hubs:upsert', { body });
  },

  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    return request<{ webhooks: Webhook[] }>('GET', '/v1/webhooks');
  },

  async createWebhook(url: string, events: string[]): Promise<Webhook> {
    return request<Webhook>('POST', '/v1/webhooks', { body: { url, events } });
  },

  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('DELETE', `/v1/webhooks/${encodeURIComponent(id)}`);
  },
};
