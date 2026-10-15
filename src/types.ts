export type Category = 'ELECTRONICS' | 'PACKAGING' | 'RETURN';
export type ItemStatus = 'REGISTERED' | 'COLLECTED' | 'RECEIVED' | 'ASSESSED' | 'OUTCOME_RECORDED' | 'OUTCOME_VERIFIED';
export type Outcome = 'REPAIRED' | 'REFURBISHED' | 'REUSED_RESOLD' | 'AUTHORIZED_RECYCLING' | 'PACKAGING_RECIRCULATED' | 'RETURNED_TO_SELLER';
export type ReasonCode = 'GLOBAL_SWOLLEN_BATTERY' | 'GLOBAL_HAZARDOUS' | 'GLOBAL_UNKNOWN_WASTE'
  | 'HOST_CATEGORY_NOT_ALLOWED' | 'HOST_SIZE_EXCEEDED' | 'HOST_KEYWORD_EXCLUDED' | 'HOST_ZONE_NOT_ALLOWED';
export type Role = 'CUSTOMER' | 'DRIVER' | 'HUB' | 'ADMIN';

export interface Location { zoneCode?: string; lat?: number; lng?: number }
export interface SafetyFlags { swollenOrDamagedBattery?: boolean; hazardousMaterial?: boolean; unknownWaste?: boolean }
export interface EligibilityRequest { category: Category; sizeUnits?: number; description?: string; location?: Location; flags?: SafetyFlags }
export interface EligibilityResult { decision: 'ELIGIBLE' | 'REJECTED'; reasonCodes: ReasonCode[]; message?: string }
export interface CollectionRequestCreate extends EligibilityRequest { location: Location; customerRef?: string; maxDetourKm?: number }

export interface MatchCandidate {
  routeId: string; routeName: string; spareUnits: number; detourKm: number;
  capacityOk: boolean; detourOk: boolean; destinationOk: boolean; score: number; failReasons: string[];
}
export interface ItemEvent {
  type: 'REGISTERED' | 'COLLECTED' | 'RECEIVED' | 'ASSESSED' | 'OUTCOME';
  at: string; actorRole: 'SYSTEM' | 'DRIVER' | 'HUB' | 'ADMIN'; placeName?: string; note?: string;
}
export interface Item {
  id: string; publicId: string; passportUrl: string; category: Category; status: ItemStatus;
  condition?: string | null; recommendedDestination?: string | null; outcome?: Outcome | null;
  verified: boolean; events: ItemEvent[];
  hasPhoto?: boolean; reference?: string;
}
export interface CollectionRequest {
  id: string; matched: boolean; candidates: MatchCandidate[]; selectedRouteId?: string | null;
  destinationHub?: string | null; detourKm?: number | null; fallback?: string | null; item?: Item;
}
export interface PublicItem {
  publicId: string; category: Category; status: ItemStatus; outcome?: Outcome | null; verified: boolean;
  timeline: { stage: string; at: string; placeName?: string }[];
}
export interface EventCreate {
  type: 'COLLECTED' | 'RECEIVED' | 'ASSESSED' | 'OUTCOME';
  condition?: string; recommendedDestination?: string; outcome?: Outcome; note?: string;
}
export interface Theme { logoUrl?: string; primaryColor?: string; accentColor?: string; fontFamily?: 'system' | 'serif' | 'rounded' }
export interface ExtraRules { allowedCategories?: Category[]; maxSizeUnits?: number; maxDetourKm?: number; excludedKeywords?: string[]; allowedZones?: string[] }
export interface TenantConfig {
  version: number; dataMode: 'SIMULATED' | 'LIVE'; defaultLocale: string; dropoffUrl?: string | null;
  theme: Theme; rules: ExtraRules; strings: Record<string, Record<string, string>>;
}
export interface PublicTenantConfig {
  slug: string; locale: string; rtl: boolean; dataMode: string; dropoffUrl?: string | null;
  oidc?: { issuer: string; clientId: string }; theme: Theme; strings: Record<string, string>;
}
export interface Webhook { id: string; url: string; events: string[]; secret?: string; active: boolean }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
