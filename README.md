# ReverseLoop Frontend

ReverseLoop matches spare vehicle capacity on existing delivery routes with items customers wish to return (small electronics, reusable packaging, product returns), logging each item's circular journey via a digital QR passport.

## Run Commands

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run TypeScript compiler checks
npm run lint

# Build production bundle
npm run build
```

## Architectural Design & Key Assumptions

1. **Default Mode & Mock State**:
   - The application defaults to mock mode with zero external dependencies required.
   - Real backend integration is conditionally enabled when `VITE_USE_MOCK=false` and `VITE_API_BASE` is configured.
   - In-memory mock adapter implements the complete state machine (`REGISTERED` &rarr; `COLLECTED` &rarr; `RECEIVED` &rarr; `ASSESSED` &rarr; `OUTCOME_RECORDED` &rarr; `OUTCOME_VERIFIED`), idempotency cache, route capacity decrements, and scoring logic per the specification.

2. **Security & Privacy**:
   - Strict zero personal data policy: no names, physical addresses, emails, or phone numbers are accepted, stored, or rendered.
   - Authentication tokens, session state, and file blobs are maintained strictly in memory; no storage in `localStorage` or `sessionStorage`.

3. **Internationalization & Layout**:
   - Every visible string is derived via `t('key')` with a fallback hierarchy: active locale &rarr; tenant default locale &rarr; `en`.
   - Directionality (`ltr` / `rtl`) is bound to document root and CSS logical properties (`margin-inline`, `padding-inline`, etc.) are used throughout to support RTL languages (`ar`).
   - Pseudo-locale `en-XA` is available for layout expansion testing.

4. **DevPanel & Testing**:
   - Interactive DevPanel floating button provides instantaneous role switching (`CUSTOMER`, `DRIVER`, `HUB`, `ADMIN`) and fault-injection scenarios (`happy`, `noMatch`, `rejected`, `conflict`, `rateLimit`, `serverError`, `slow`).
