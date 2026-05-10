# Roadmap

## Feature: FileMaker Direct Call Webhooks

### Overview

Currently the webhook configurator only supports sending notifications to an **external URL** (e.g. a PHP script, a Node.js endpoint, etc.). The proposed feature adds a second option that allows FileMaker Server itself to be the webhook target — calling a FileMaker script directly via the **OData API** or the **FileMaker Data API**, without needing any intermediate server-side script.

### Problem Statement

When a record changes, FileMaker fires a webhook that POST-s an OData-shaped payload to a configured URL:

```
FileMaker → POST → http://your-server/handler.php  →  (manual work)  →  FileMaker Script
```

The intermediate handler is necessary today because:
- FileMaker's webhook payload format (`{ "value": [...] }`) is **not** the same as what the FileMaker script endpoints expect (`{ "scriptParameterValue": ... }` for OData or `{ "scriptParameter": ... }` for Data API).
- There is no built-in way to point a webhook directly at a FileMaker script and have it work without transformation.

The goal is to let the user configure all of this inside this app, eliminating the need to maintain a separate handler script.

---

### Strategies Studied

#### Strategy A — Point the webhook directly at a FileMaker OData/Data API endpoint
**Verdict: Not viable.**

FileMaker fires a POST with its own OData envelope (`@odata.context`, `value[]`, etc.).  
The OData script endpoint (`/Script.Name`) and the Data API script endpoint (`/layouts/Layout/script/Name`) each expect a completely different JSON body. FileMaker does not transform the payload before sending, so the receiving endpoint would get an unrecognised body and fail.

#### Strategy B — Separate persistence layer in the app
**Verdict: Adds complexity, creates a double source of truth.**

We could store the "FileMaker Direct" webhook configs in a local database (SQLite, JSON file, etc.) and reconcile them with FileMaker's native webhook list. This was considered but rejected because:
- The app is currently a static frontend with no backend persistence.
- Two sources of truth (FileMaker's JSON store + app's store) are error-prone.
- It introduces infra requirements (a backend process must be running to receive webhooks).

#### Strategy C — React app as a lightweight relay (chosen approach)
**Verdict: Viable. Selected for implementation.**

The app's own server (the same nginx/Vite host that serves the UI) acts as a thin relay endpoint:

```
FileMaker → POST /webhook-handler → React App Relay → transform payload → FileMaker Script (OData or Data API)
```

- FileMaker's native webhook storage is still the **single source of truth** — no extra persistence layer.
- The webhook URL stored in FileMaker points to this app's relay endpoint.
- The relay configuration (target host, database, credentials, script name, field list) is **encoded in the webhook's custom headers** — so it travels with the webhook record inside FileMaker's own store.
- When the relay receives a call it reads the headers, transforms the OData payload into the correct script-call body, and forwards it to FileMaker.

---

### Implementation Plan

See [PLAN_FILEMAKER_DIRECT_CALL.md](PLAN_FILEMAKER_DIRECT_CALL.md) for the full, step-by-step implementation plan.

---

### Open Questions / Future Work

- **Security**: credentials stored in webhook headers are Base64-encoded but not encrypted. A future iteration should use short-lived tokens or a secrets store.
- **Data API layout**: the FileMaker Data API requires a layout name in the script call URL (`/layouts/{layout}/script/{name}`). This needs to be an additional field in the config form.
- **Error / retry UI**: once the relay is in place, surface relay errors in the Pending Operations panel alongside FileMaker's own errors.
