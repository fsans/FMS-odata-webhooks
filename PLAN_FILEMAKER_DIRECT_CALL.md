# Implementation Plan: FileMaker Direct Call Webhooks

**Feature:** Add a second webhook configuration mode that calls a FileMaker script directly
(via OData or Data API) instead of an external URL.

**Status:** Planned — not yet implemented.

**Related:** [ROADMAP.md](ROADMAP.md)

---

## Architecture

```
FileMaker (record change)
    │
    │  POST  <app-host>/api/webhook-relay
    │  Headers carry relay config (type, host, db, script, fields, credentials)
    ▼
React App — Relay Endpoint  (new: src/api/webhook-relay)
    │
    │  reads X-FM-* headers
    │  extracts field values from OData payload
    │  builds FileMaker-compatible script call body
    │
    ├──[OData]─────▶  POST /fmi/odata/v4/{db}/Script.{name}
    │                  body: { "scriptParameterValue": { "fields": {...}, "meta": {...} } }
    │
    └──[Data API]──▶  POST /fmi/data/v1/databases/{db}/layouts/{layout}/script/{name}
                       body: { "scriptParameter": { "fields": {...}, "meta": {...} } }
```

FileMaker's webhook storage remains the **single source of truth**.  
All relay configuration is carried inside the webhook's `headers` object — no extra database needed.

---

## Custom Headers Convention

When the app creates a "FileMaker Direct Call" webhook it injects these headers:

| Header key          | Value                                  |
|---------------------|----------------------------------------|
| `X-FM-Type`         | `odata` or `data_api`                  |
| `X-FM-Host`         | target FileMaker Server hostname/IP    |
| `X-FM-Database`     | target database name                   |
| `X-FM-Layout`       | layout name (Data API only)            |
| `X-FM-Script`       | script name to call                    |
| `X-FM-Fields`       | comma-separated list of fields to send |
| `X-FM-Auth`         | `Basic <base64(user:pass)>`            |

These headers are stored by FileMaker as part of the webhook record and are forwarded to the relay on every callback.

---

## Payload Transformation

FileMaker fires:
```json
{
  "@odata.context": "fmi/odata/v4/Contacts/$metadata#contact(...)",
  "value": [
    {
      "@odata.id": "...",
      "first_name": "Joan",
      "last_name":  "Miró",
      "uuid":       "ABC-123"
    }
  ]
}
```

The relay produces (OData script call):
```json
{
  "scriptParameterValue": {
    "fields": {
      "first_name": "Joan",
      "last_name":  "Miró",
      "uuid":       "ABC-123"
    },
    "meta": {
      "operation": "UPDATE",
      "table":     "contact"
    }
  }
}
```

Or for Data API:
```json
{
  "scriptParameter": {
    "fields": {
      "first_name": "Joan",
      "last_name":  "Miró",
      "uuid":       "ABC-123"
    },
    "meta": {
      "operation": "UPDATE",
      "table":     "contact"
    }
  }
}
```

Only the fields listed in `X-FM-Fields` are included. If the header is empty, all fields from the OData payload are forwarded (excluding OData system keys that start with `@`).

---

## Implementation Steps

### Step 1 — Extend type definitions
**File:** `src/types/filemaker.ts`

Add:
```typescript
export type WebhookCallbackType = 'external_url' | 'odata_direct' | 'data_api_direct'

export type FileMakerApiType = 'odata' | 'data_api'

export interface FileMakerDirectCallConfig {
  apiType:    FileMakerApiType
  host:       string
  database:   string
  layout?:    string          // required for Data API
  scriptName: string
  username:   string
  password:   string
  fields:     string[]        // field names to include in script parameter
}
```

Extend `WebhookCreateParams` with:
```typescript
callbackType?:  WebhookCallbackType         // defaults to 'external_url'
directConfig?:  FileMakerDirectCallConfig   // only when callbackType !== 'external_url'
```

---

### Step 2 — Webhook creation logic
**File:** `src/services/filemaker.ts`

In `createWebhook()`, when `params.callbackType` is `odata_direct` or `data_api_direct`:

1. Set `webhook` URL to `<app-origin>/api/webhook-relay` (relative URL so it works in both dev and prod).
2. Build the `X-FM-*` headers from `directConfig` and merge them with any user-supplied headers.
3. Store `callbackType` as `X-FM-Type` in the headers so the relay and the UI can identify the webhook kind.

---

### Step 3 — Relay endpoint
**New file:** `src/api/webhook-relay.ts`  (or a Vite plugin / Express route depending on deploy target)

Responsibilities:
- Accept `POST /api/webhook-relay`
- Read `X-FM-*` headers
- Parse FileMaker's OData payload body
- Filter fields according to `X-FM-Fields`
- Build the script call body (OData or Data API format)
- `fetch()` the target FileMaker script endpoint
- Return `200` on success; return the FileMaker error on failure

For **development**: register as a Vite dev-server middleware (`vite.config.ts`).  
For **production**: add as an nginx `proxy_pass` target to a small Node/Express sidecar, or implement as a Vite SSR handler.

---

### Step 4 — New configuration dialog
**New file:** `src/components/FileMakerDirectCallDialog.tsx`

A two-tab dialog (tab 1 = OData, tab 2 = Data API). Each tab contains:

| Field            | Notes                                     |
|------------------|-------------------------------------------|
| Host             | FileMaker Server hostname or IP           |
| Database         | Target database                           |
| Layout           | (Data API tab only) layout name           |
| Script name      | Name of the FileMaker script to call      |
| Username         | FileMaker account with script privileges  |
| Password         | Hidden input                              |
| Table            | Dropdown populated from current connection metadata |
| Fields to send   | Multi-select checkbox list (same as existing webhook dialog) |
| OData Filter     | Optional — same as existing form          |
| Schema changes   | Toggle — same as existing form            |
| Test Connection  | Button that calls `Script.Test` or a metadata endpoint to verify credentials |

---

### Step 5 — Update WebhookDialog
**File:** `src/components/WebhookDialog.tsx`

Add a **Callback Type** selector at the top of the form:

```
( ) External URL        — current form, unchanged
( ) OData Direct Call   — opens FileMakerDirectCallDialog (OData tab)
( ) Data API Direct Call — opens FileMakerDirectCallDialog (Data API tab)
```

When a direct-call type is selected, hide the `Webhook URL` and `Custom Headers` fields (they are auto-generated) and show the `FileMakerDirectCallDialog` fields inline instead.

---

### Step 6 — WebhookManager list view
**File:** `src/components/WebhookManager.tsx`

In the webhook card, detect `X-FM-Type` in the headers and render a badge:

- No badge → External URL (current behaviour)
- `odata` badge → "OData Direct"
- `data_api` badge → "Data API Direct"

Show the script name and target host in the card subtitle instead of the raw relay URL.

---

### Step 7 — Vite proxy / nginx config
**Files:** `vite.config.ts`, `nginx-reverse-proxy.conf`, `nginx-integration-snippet.conf`

Development: add `/api/webhook-relay` to the Vite `server.proxy` or register a custom middleware.  
Production: add a `location /api/webhook-relay` block in nginx that forwards to the sidecar process.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/filemaker.ts` | Add new interfaces and extend existing ones |
| `src/services/filemaker.ts` | Inject X-FM-* headers when creating direct-call webhooks |
| `src/components/WebhookDialog.tsx` | Add callback-type selector; conditionally show direct-call fields |
| `src/components/WebhookManager.tsx` | Show type badge and human-readable summary in webhook cards |
| `vite.config.ts` | Register relay middleware for dev |
| `nginx-reverse-proxy.conf` | Add relay location block |
| `nginx-integration-snippet.conf` | Add relay location block |

## New Files

| File | Purpose |
|------|---------|
| `src/components/FileMakerDirectCallDialog.tsx` | Configuration form for direct-call webhooks |
| `src/api/webhook-relay.ts` | Relay handler: transform + forward to FileMaker |

---

## Verification Checklist

- [ ] Create an OData Direct Call webhook — verify it appears in `Webhook.GetAll` with correct URL and headers
- [ ] Create a Data API Direct Call webhook — same check
- [ ] Manually invoke (`Webhook.Invoke`) — verify relay fires and script is called
- [ ] Verify script receives `{ fields: {...}, meta: {...} }` as parameter
- [ ] Verify field filtering: only fields listed in `X-FM-Fields` are forwarded
- [ ] Test with wrong credentials — relay returns a meaningful error
- [ ] Test connection button validates target host before saving
- [ ] Edit an existing direct-call webhook — values should pre-populate correctly
- [ ] Delete a direct-call webhook — relay URL is cleaned up

---

## Risks and Considerations

| Risk | Mitigation |
|------|-----------|
| Credentials in webhook headers are Base64, not encrypted | Document clearly; plan a token-based auth in a follow-up |
| Relay must be reachable from FileMaker Server | App must be deployed on a host that FileMaker can POST to; document network requirements |
| Data API requires a layout name, not just a table | Add layout field in the Data API tab of the config form |
| CORS: FileMaker POSTs to the relay, not a browser | No CORS issue; relay is server-to-server |
| FileMaker may retry failed webhooks | Relay should be idempotent; script should handle duplicate calls gracefully |
