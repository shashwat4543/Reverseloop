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
  MatchCandidate,
  Outcome,
  PublicItem,
  PublicTenantConfig,
  ReasonCode,
  TenantConfig,
  Webhook
} from '../types';

export type DevScenario = 'happy' | 'noMatch' | 'rejected' | 'conflict' | 'rateLimit' | 'serverError' | 'slow';

let currentScenario: DevScenario = 'happy';

export function setDevScenario(scenario: DevScenario) {
  currentScenario = scenario;
}

export function getDevScenario(): DevScenario {
  return currentScenario;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ZONES: Record<string, [number, number]> = {
  A: [1, 1],
  B: [3, 2],
  C: [5, 1],
  D: [2, 5],
  E: [6, 5],
  F: [9, 9],
};

interface MockRoute {
  id: string;
  name: string;
  stops: [number, number][];
  free: number;
}

let ROUTES: MockRoute[] = [
  { id: 'r1', name: 'Route R1 (north loop)', stops: [[1, 1], [3, 2], [5, 1]], free: 3 },
  { id: 'r2', name: 'Route R2 (east run)', stops: [[2, 5], [3, 4], [6, 5]], free: 1 },
  { id: 'r3', name: 'Route R3 (city centre)', stops: [[1, 2], [2, 2]], free: 0 },
];

let HUBS = [
  { name: 'Demo hub (consolidation)', accepts: ['ELECTRONICS', 'PACKAGING', 'RETURN'] as Category[] },
  { name: 'Demo refurbisher', accepts: ['ELECTRONICS', 'RETURN'] as Category[] },
  { name: 'Demo reuse partner', accepts: ['PACKAGING'] as Category[] },
];

const DEFAULT_SIZE: Record<Category, number> = {
  ELECTRONICS: 1,
  PACKAGING: 1,
  RETURN: 2,
};

function computeCandidates(cat: Category, zone: string, size: number, maxDetour: number): MatchCandidate[] {
  const zoneCoords = ZONES[zone] || [1, 1];
  const [zx, zy] = zoneCoords;

  return ROUTES.map((r) => {
    const d = 2 * Math.min(...r.stops.map(([x, y]) => Math.hypot(x - zx, y - zy)));
    const capacityOk = r.free >= size;
    const detourOk = d <= maxDetour;
    const destinationOk = HUBS.some((h) => h.accepts.includes(cat));
    const ok = capacityOk && detourOk && destinationOk;
    const score = ok
      ? Math.round(60 * (1 - d / maxDetour) + 25 * Math.min(1, (r.free - size + 1) / 3) + 15)
      : 0;
    const failReasons = [
      !capacityOk && 'NO_CAPACITY',
      !detourOk && 'DETOUR_TOO_LONG',
      !destinationOk && 'NO_DESTINATION',
    ].filter(Boolean) as string[];

    return {
      routeId: r.id,
      routeName: r.name,
      spareUnits: r.free,
      detourKm: +d.toFixed(1),
      capacityOk,
      detourOk,
      destinationOk,
      score,
      failReasons,
    };
  });
}

let tenantConfig: TenantConfig = {
  version: 1,
  dataMode: 'SIMULATED',
  defaultLocale: 'en',
  dropoffUrl: 'https://example.com/dropoff',
  theme: {
    primaryColor: '#8B2E16',
    accentColor: '#E0701B',
    fontFamily: 'system',
  },
  rules: {
    allowedCategories: ['ELECTRONICS', 'PACKAGING', 'RETURN'],
    maxSizeUnits: 2,
    maxDetourKm: 1.5,
    allowedZones: ['A', 'B', 'C', 'D', 'E', 'F'],
    excludedKeywords: ['explosive', 'chemical', 'paint', 'ammunition', 'acid'],
  },
  strings: {},
};

function generatePublicId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = 'RL-';
  for (let i = 0; i < 6; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

let itemsStore: Map<string, Item> = new Map();
let collectionRequestsStore: Map<string, CollectionRequest> = new Map();
let idempotencyStore: Map<string, CollectionRequest> = new Map();
let webhooksStore: Webhook[] = [
  {
    id: 'wh_1',
    url: 'https://api.partner.example/webhooks/reverseloop',
    events: ['item.registered', 'item.collected', 'item.outcome_verified'],
    secret: 'whsec_test_secret_key_9981',
    active: true,
  },
];

function seedItems() {
  itemsStore.clear();
  collectionRequestsStore.clear();
  idempotencyStore.clear();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://reverseloop.local';

  const demoItems: Item[] = [
    {
      id: 'item_demo1',
      publicId: 'RL-DEMO1',
      passportUrl: `${baseUrl}/p/RL-DEMO1`,
      category: 'ELECTRONICS',
      status: 'REGISTERED',
      verified: false,
      events: [
        {
          type: 'REGISTERED',
          at: new Date(Date.now() - 3600000 * 5).toISOString(),
          actorRole: 'SYSTEM',
          placeName: 'Customer address (Zone A)',
          note: 'Registered for pickup during grocery drop-off',
        },
      ],
    },
    {
      id: 'item_demo2',
      publicId: 'RL-DEMO2',
      passportUrl: `${baseUrl}/p/RL-DEMO2`,
      category: 'PACKAGING',
      status: 'COLLECTED',
      verified: false,
      events: [
        {
          type: 'REGISTERED',
          at: new Date(Date.now() - 3600000 * 24).toISOString(),
          actorRole: 'SYSTEM',
          placeName: 'Customer address (Zone B)',
        },
        {
          type: 'COLLECTED',
          at: new Date(Date.now() - 3600000 * 18).toISOString(),
          actorRole: 'DRIVER',
          placeName: 'Route R1 (Stop 2)',
          note: 'Package collected and secured in return tote',
        },
      ],
    },
    {
      id: 'item_demo3',
      publicId: 'RL-DEMO3',
      passportUrl: `${baseUrl}/p/RL-DEMO3`,
      category: 'RETURN',
      status: 'RECEIVED',
      verified: false,
      events: [
        {
          type: 'REGISTERED',
          at: new Date(Date.now() - 3600000 * 48).toISOString(),
          actorRole: 'SYSTEM',
          placeName: 'Customer address (Zone C)',
        },
        {
          type: 'COLLECTED',
          at: new Date(Date.now() - 3600000 * 36).toISOString(),
          actorRole: 'DRIVER',
          placeName: 'Route R1 (Stop 3)',
        },
        {
          type: 'RECEIVED',
          at: new Date(Date.now() - 3600000 * 12).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo hub (consolidation)',
          note: 'Scanned at intake dock A',
        },
      ],
    },
    {
      id: 'item_demo4',
      publicId: 'RL-DEMO4',
      passportUrl: `${baseUrl}/p/RL-DEMO4`,
      category: 'ELECTRONICS',
      status: 'ASSESSED',
      condition: 'Needs repair',
      recommendedDestination: 'Repair',
      verified: false,
      events: [
        {
          type: 'REGISTERED',
          at: new Date(Date.now() - 3600000 * 72).toISOString(),
          actorRole: 'SYSTEM',
          placeName: 'Customer address (Zone A)',
        },
        {
          type: 'COLLECTED',
          at: new Date(Date.now() - 3600000 * 60).toISOString(),
          actorRole: 'DRIVER',
          placeName: 'Route R1 (Stop 1)',
        },
        {
          type: 'RECEIVED',
          at: new Date(Date.now() - 3600000 * 40).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo hub (consolidation)',
        },
        {
          type: 'ASSESSED',
          at: new Date(Date.now() - 3600000 * 10).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo hub (consolidation)',
          note: 'Condition: Needs repair. Dispatched to tech workbench.',
        },
      ],
    },
    {
      id: 'item_demo5',
      publicId: 'RL-DEMO5',
      passportUrl: `${baseUrl}/p/RL-DEMO5`,
      category: 'PACKAGING',
      status: 'OUTCOME_VERIFIED',
      condition: 'Good',
      recommendedDestination: 'Clean and return to circulation',
      outcome: 'PACKAGING_RECIRCULATED',
      verified: true,
      hasPhoto: true,
      reference: 'REF-CLEAN-2026-9081',
      events: [
        {
          type: 'REGISTERED',
          at: new Date(Date.now() - 3600000 * 96).toISOString(),
          actorRole: 'SYSTEM',
          placeName: 'Customer address (Zone B)',
        },
        {
          type: 'COLLECTED',
          at: new Date(Date.now() - 3600000 * 80).toISOString(),
          actorRole: 'DRIVER',
          placeName: 'Route R1 (Stop 2)',
        },
        {
          type: 'RECEIVED',
          at: new Date(Date.now() - 3600000 * 60).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo reuse partner',
        },
        {
          type: 'ASSESSED',
          at: new Date(Date.now() - 3600000 * 30).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo reuse partner',
          note: 'Thermal insulated tote sanitized & integrity tested',
        },
        {
          type: 'OUTCOME',
          at: new Date(Date.now() - 3600000 * 5).toISOString(),
          actorRole: 'HUB',
          placeName: 'Demo reuse partner',
          note: 'Cleaned and returned to circulation. Ref: REF-CLEAN-2026-9081',
        },
      ],
    },
  ];

  for (const item of demoItems) {
    itemsStore.set(item.id, item);
  }
}

// Initial seed
seedItems();

export function resetMockData() {
  ROUTES = [
    { id: 'r1', name: 'Route R1 (north loop)', stops: [[1, 1], [3, 2], [5, 1]], free: 3 },
    { id: 'r2', name: 'Route R2 (east run)', stops: [[2, 5], [3, 4], [6, 5]], free: 1 },
    { id: 'r3', name: 'Route R3 (city centre)', stops: [[1, 2], [2, 2]], free: 0 },
  ];
  currentScenario = 'happy';
  seedItems();
}

async function handleScenarioCheck() {
  if (currentScenario === 'slow') {
    await sleep(3000);
    currentScenario = 'happy';
    return;
  }
  const latency = 300 + Math.random() * 500;
  await sleep(latency);

  if (currentScenario === 'serverError') {
    currentScenario = 'happy';
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Simulated 500 server error');
  }
  if (currentScenario === 'rateLimit') {
    currentScenario = 'happy';
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait and retry.');
  }
  if (currentScenario === 'conflict') {
    currentScenario = 'happy';
    throw new ApiError(409, 'CONFLICT', 'Resource was modified by another operation.');
  }
}

export const mockApi = {
  async getPublicConfig(slug: string, locale?: string): Promise<PublicTenantConfig> {
    await handleScenarioCheck();
    const activeLocale = locale || tenantConfig.defaultLocale;
    const isRtl = activeLocale === 'ar' || activeLocale === 'he' || activeLocale === 'fa' || activeLocale === 'ur';

    return {
      slug: slug || 'demo',
      locale: activeLocale,
      rtl: isRtl,
      dataMode: tenantConfig.dataMode,
      dropoffUrl: tenantConfig.dropoffUrl,
      theme: tenantConfig.theme,
      strings: tenantConfig.strings[activeLocale] || {},
    };
  },

  async checkEligibility(body: EligibilityRequest): Promise<EligibilityResult> {
    await handleScenarioCheck();

    if (currentScenario === 'rejected') {
      currentScenario = 'happy';
      return {
        decision: 'REJECTED',
        reasonCodes: ['HOST_CATEGORY_NOT_ALLOWED'],
        message: 'Item rejected by active dev scenario',
      };
    }

    const reasons: ReasonCode[] = [];

    // Global safety rules
    if (body.flags?.swollenOrDamagedBattery) {
      reasons.push('GLOBAL_SWOLLEN_BATTERY');
    }
    if (body.flags?.hazardousMaterial) {
      reasons.push('GLOBAL_HAZARDOUS');
    }
    if (body.flags?.unknownWaste) {
      reasons.push('GLOBAL_UNKNOWN_WASTE');
    }

    // Host tenant rules
    if (tenantConfig.rules.allowedCategories && !tenantConfig.rules.allowedCategories.includes(body.category)) {
      reasons.push('HOST_CATEGORY_NOT_ALLOWED');
    }

    const size = body.sizeUnits || DEFAULT_SIZE[body.category] || 1;
    if (tenantConfig.rules.maxSizeUnits && size > tenantConfig.rules.maxSizeUnits) {
      reasons.push('HOST_SIZE_EXCEEDED');
    }

    if (body.description && tenantConfig.rules.excludedKeywords) {
      const lower = body.description.toLowerCase();
      const hasExcluded = tenantConfig.rules.excludedKeywords.some((k) => lower.includes(k.toLowerCase()));
      if (hasExcluded) {
        reasons.push('HOST_KEYWORD_EXCLUDED');
      }
    }

    if (body.location?.zoneCode && tenantConfig.rules.allowedZones) {
      if (!tenantConfig.rules.allowedZones.includes(body.location.zoneCode)) {
        reasons.push('HOST_ZONE_NOT_ALLOWED');
      }
    }

    if (reasons.length > 0) {
      return {
        decision: 'REJECTED',
        reasonCodes: reasons,
        message: 'This item cannot go through the standard flow.',
      };
    }

    return {
      decision: 'ELIGIBLE',
      reasonCodes: [],
      message: 'This item can be collected.',
    };
  },

  async createCollectionRequest(body: CollectionRequestCreate, idempotencyKey?: string): Promise<CollectionRequest> {
    await handleScenarioCheck();

    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      return idempotencyStore.get(idempotencyKey)!;
    }

    // Check eligibility first
    const elig = await mockApi.checkEligibility(body);
    if (elig.decision === 'REJECTED') {
      throw new ApiError(422, 'NOT_ELIGIBLE', elig.reasonCodes.join(', '));
    }

    const cat = body.category;
    const zone = body.location?.zoneCode || 'A';
    const size = body.sizeUnits || DEFAULT_SIZE[cat] || 1;
    const maxDetour = body.maxDetourKm || tenantConfig.rules.maxDetourKm || 1.5;

    let candidateList = computeCandidates(cat, zone, size, maxDetour);

    if (currentScenario === 'noMatch') {
      currentScenario = 'happy';
      candidateList = candidateList.map((c) => ({
        ...c,
        capacityOk: false,
        score: 0,
        failReasons: ['NO_CAPACITY'],
      }));
    }

    // Best candidate with score > 0
    const sorted = [...candidateList].sort((a, b) => b.score - a.score);
    const best = sorted[0]?.score > 0 ? sorted[0] : null;

    const reqId = crypto.randomUUID();

    if (!best) {
      const failedReq: CollectionRequest = {
        id: reqId,
        matched: false,
        candidates: candidateList,
        fallback: 'No safe or feasible match. Choose another collection window or a drop-off option.',
      };
      if (idempotencyKey) idempotencyStore.set(idempotencyKey, failedReq);
      collectionRequestsStore.set(reqId, failedReq);
      return failedReq;
    }

    // Matched: decrement route capacity
    const route = ROUTES.find((r) => r.id === best.routeId);
    if (route) {
      route.free = Math.max(0, route.free - size);
    }

    const itemId = crypto.randomUUID();
    const publicId = generatePublicId();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://reverseloop.local';
    const passportUrl = `${origin}/p/${publicId}`;

    const newItem: Item = {
      id: itemId,
      publicId,
      passportUrl,
      category: cat,
      status: 'REGISTERED',
      verified: false,
      events: [
        {
          type: 'REGISTERED',
          at: new Date().toISOString(),
          actorRole: 'SYSTEM',
          placeName: `Customer address (Zone ${zone})`,
          note: 'Pickup registered with reverse route matching',
        },
      ],
    };

    itemsStore.set(itemId, newItem);

    const matchedReq: CollectionRequest = {
      id: reqId,
      matched: true,
      candidates: candidateList,
      selectedRouteId: best.routeId,
      destinationHub: 'Demo hub (consolidation)',
      detourKm: best.detourKm,
      item: newItem,
    };

    if (idempotencyKey) idempotencyStore.set(idempotencyKey, matchedReq);
    collectionRequestsStore.set(reqId, matchedReq);

    return matchedReq;
  },

  async getCollectionRequest(id: string): Promise<CollectionRequest> {
    await handleScenarioCheck();
    const req = collectionRequestsStore.get(id);
    if (!req) {
      throw new ApiError(404, 'NOT_FOUND', `Collection request ${id} not found`);
    }
    return req;
  },

  async getItem(id: string): Promise<Item> {
    await handleScenarioCheck();
    const item = itemsStore.get(id) || Array.from(itemsStore.values()).find((it) => it.publicId === id);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', `Item ${id} not found`);
    }
    return JSON.parse(JSON.stringify(item));
  },

  async listItems(status?: ItemStatus): Promise<{ items: Item[] }> {
    await handleScenarioCheck();
    let list = Array.from(itemsStore.values());
    if (status) {
      list = list.filter((i) => i.status === status);
    }
    return { items: JSON.parse(JSON.stringify(list)) };
  },

  async postItemEvent(id: string, body: EventCreate): Promise<Item> {
    await handleScenarioCheck();

    const item = itemsStore.get(id) || Array.from(itemsStore.values()).find((it) => it.publicId === id);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', `Item ${id} not found`);
    }

    // State machine check
    switch (body.type) {
      case 'COLLECTED':
        if (item.status !== 'REGISTERED') {
          throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition to COLLECTED from ${item.status}`);
        }
        item.status = 'COLLECTED';
        break;

      case 'RECEIVED':
        if (item.status !== 'COLLECTED') {
          throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition to RECEIVED from ${item.status}`);
        }
        item.status = 'RECEIVED';
        break;

      case 'ASSESSED':
        if (item.status !== 'RECEIVED') {
          throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition to ASSESSED from ${item.status}`);
        }
        if (!body.condition || !body.recommendedDestination) {
          throw new ApiError(400, 'BAD_REQUEST', 'Condition and recommended destination are required');
        }
        item.status = 'ASSESSED';
        item.condition = body.condition;
        item.recommendedDestination = body.recommendedDestination;
        break;

      case 'OUTCOME':
        if (item.status !== 'ASSESSED') {
          throw new ApiError(409, 'INVALID_TRANSITION', `Cannot transition to OUTCOME from ${item.status}`);
        }
        if (!body.outcome) {
          throw new ApiError(400, 'BAD_REQUEST', 'Outcome is required');
        }
        item.status = 'OUTCOME_RECORDED';
        item.outcome = body.outcome;
        break;

      default:
        throw new ApiError(400, 'BAD_REQUEST', `Unknown event type: ${body.type}`);
    }

    item.events.push({
      type: body.type,
      at: new Date().toISOString(),
      actorRole: body.type === 'COLLECTED' ? 'DRIVER' : 'HUB',
      placeName: body.type === 'COLLECTED' ? 'Route pickup' : 'ReverseLoop Hub',
      note: body.note || (body.condition ? `Condition: ${body.condition}` : undefined),
    });

    // Check evidence verification condition
    if (item.status === 'OUTCOME_RECORDED' && item.hasPhoto && item.reference) {
      item.status = 'OUTCOME_VERIFIED';
      item.verified = true;
    }

    itemsStore.set(item.id, item);
    return JSON.parse(JSON.stringify(item));
  },

  async uploadEvidence(id: string, photo?: File | Blob | string, reference?: string): Promise<Item> {
    await handleScenarioCheck();

    const item = itemsStore.get(id) || Array.from(itemsStore.values()).find((it) => it.publicId === id);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', `Item ${id} not found`);
    }

    if (photo) {
      item.hasPhoto = true;
    }
    if (reference && reference.trim()) {
      item.reference = reference.trim();
    }

    if (item.status === 'OUTCOME_RECORDED' && item.hasPhoto && item.reference) {
      item.status = 'OUTCOME_VERIFIED';
      item.verified = true;
      item.events.push({
        type: 'OUTCOME',
        at: new Date().toISOString(),
        actorRole: 'HUB',
        placeName: 'ReverseLoop Hub',
        note: `Evidence verified. Partner reference: ${item.reference}`,
      });
    }

    itemsStore.set(item.id, item);
    return JSON.parse(JSON.stringify(item));
  },

  async getPublicItem(publicId: string): Promise<PublicItem> {
    await handleScenarioCheck();

    const item = Array.from(itemsStore.values()).find((it) => it.publicId === publicId);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', `Item ${publicId} not found`);
    }

    const timeline = item.events.map((e) => ({
      stage: e.type,
      at: e.at,
      placeName: e.placeName,
    }));

    return {
      publicId: item.publicId,
      category: item.category,
      status: item.status,
      outcome: item.outcome,
      verified: item.verified,
      timeline,
    };
  },

  async getConfig(tenantId: string): Promise<TenantConfig> {
    await handleScenarioCheck();
    return JSON.parse(JSON.stringify(tenantConfig));
  },

  async putConfig(tenantId: string, cfg: TenantConfig): Promise<TenantConfig> {
    await handleScenarioCheck();
    if (cfg.version !== tenantConfig.version) {
      throw new ApiError(409, 'CONFLICT', 'Configuration version conflict. Reload to continue.');
    }
    tenantConfig = {
      ...cfg,
      version: tenantConfig.version + 1,
    };
    return JSON.parse(JSON.stringify(tenantConfig));
  },

  async upsertRoutes(body: unknown): Promise<{ count: number; routes: unknown[] }> {
    await handleScenarioCheck();
    if (Array.isArray(body)) {
      ROUTES = body as MockRoute[];
      return { count: ROUTES.length, routes: ROUTES };
    }
    return { count: ROUTES.length, routes: ROUTES };
  },

  async upsertHubs(body: unknown): Promise<{ count: number; hubs: unknown[] }> {
    await handleScenarioCheck();
    if (Array.isArray(body)) {
      HUBS = body as any;
      return { count: HUBS.length, hubs: HUBS };
    }
    return { count: HUBS.length, hubs: HUBS };
  },

  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    await handleScenarioCheck();
    return { webhooks: JSON.parse(JSON.stringify(webhooksStore)) };
  },

  async createWebhook(url: string, events: string[]): Promise<Webhook> {
    await handleScenarioCheck();
    const newWh: Webhook = {
      id: `wh_${crypto.randomUUID().slice(0, 8)}`,
      url,
      events,
      secret: `whsec_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      active: true,
    };
    webhooksStore.push(newWh);
    return newWh;
  },

  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    await handleScenarioCheck();
    webhooksStore = webhooksStore.filter((w) => w.id !== id);
    return { success: true };
  },
};
