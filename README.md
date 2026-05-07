# FileMaker OData Webhooks Manager

[![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)](https://github.com/fsans/FMS-odata-webhooks/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![nBCN Software](https://img.shields.io/badge/nBCN_Software-Barcelona-lightgrey.svg)](https://ntwk.es)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FileMaker Server](https://img.shields.io/badge/FileMaker_Server-22.0.4+-green.svg)](https://www.claris.com/filemaker/)

A React web application for managing FileMaker Server webhooks via the OData API.

## Overview

![alt text](<Screenshot 2026-05-04 at 13.22.47.png>)

This application provides a user-friendly interface to browse FileMaker databases, tables, and fields, then configure webhooks with filters and callbacks to FileMaker scripts. Built with React, Vite, Tailwind CSS, and shadcn/ui components.

## Features

- **Database Browser**: Connect to FileMaker Server and explore databases, tables, and field metadata
- **Webhook Manager**: Create, edit, delete, and test webhooks with visual configuration
- **OData Integration**: Full support for FileMaker Server 22.0.4+ OData webhook capabilities
- **Event-Driven Architecture**: Enable real-time integrations without polling

## Documentation

- [AUTHENTICATION.md](AUTHENTICATION.md) - **Authentication guide and troubleshooting**
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Code structure and architecture
- [DISCOVERINGS.md](DISCOVERINGS.md) - **Verified findings about FileMaker OData webhooks**
- [ENDPOINT_TESTING_GUIDE.md](ENDPOINT_TESTING_GUIDE.md) - **Complete endpoint testing documentation**
- [QUICK_START_TESTING.md](QUICK_START_TESTING.md) - **Quick reference for testing endpoints**


## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **API**: FileMaker OData v4
- **Authentication**: HTTP Basic Auth

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/fsans/FMS-odata-webhooks.git
cd FMS-odata-webhooks

# Initialize submodule (private docs — requires access)
git submodule update --init

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### SSL Certificate Setup

**Before connecting to FileMaker Server, you must accept the SSL certificate:**

1. Visit `https://your-filemaker-server/fmi/odata/v4` in your browser
2. Accept the certificate warning (click "Advanced" → "Proceed to site")
3. Return to the web app and connect normally

This is required because FileMaker Servers typically use self-signed certificates.

### Building for Production

```bash
# Create production build
npm run build

# Deploy the dist/ folder to your web server
# For example, symlink to nginx:
# ln -s /path/to/project/dist /var/www/html/fmwebhooks
```

### Usage

1. **Accept SSL Certificate** (one-time setup)
   - Visit `https://your-filemaker-host/fmi/odata/v4` in browser
   - Accept the certificate warning

2. **Connect to FileMaker Server**
   - Enter your FileMaker Server host (e.g., `192.168.0.24`)
   - Provide valid credentials with OData access
   - Click "Connect"

3. **Browse Databases**
   - Select a database from the list
   - Explore tables and their field metadata
   - View field types and FileMaker-specific properties

3. **Manage Webhooks**
   - Click "New Webhook" to create a webhook
   - Configure:
     - **Webhook URL**: Where FileMaker will send notifications
     - **Table**: Which table to monitor
     - **Selected Fields**: Optional field list (leave empty for all)
     - **Filter**: OData v4 filter expression (e.g., `Status eq 'Active'`)
     - **Custom Headers**: JSON object for authentication/metadata
     - **Schema Changes**: Toggle to notify on table schema changes
   - Test webhooks using the Play button
   - Delete webhooks when no longer needed

## Testing Endpoints

The application includes comprehensive endpoint testing utilities available in the browser console:

```javascript
// Quick connectivity test
await window.FileMakerTests.quickTest('DatabaseName')

// Full endpoint validation (tests all HTTP methods)
await window.FileMakerTests.validateAllEndpoints('DatabaseName')

// Create a test webhook
const webhook = await window.FileMakerTests.testCreateWebhook('DatabaseName', 'TableName')

// Invoke/test a webhook
await window.FileMakerTests.testInvokeWebhook('DatabaseName', webhookId, 'TableName')

// Delete a webhook
await window.FileMakerTests.testDeleteWebhook('DatabaseName', webhookId)

// Full integration test (create → list → delete)
await window.FileMakerTests.fullIntegrationTest('DatabaseName', 'TableName')
```

See [QUICK_START_TESTING.md](QUICK_START_TESTING.md) for detailed testing instructions.

## ⚠️ Important: `id` is a Reserved Word in OData

**The token `id` is reserved by the OData URL conventions and cannot be
referenced bare in `$select` / `$filter` / `$orderby`.** This is
standard, well-documented OData behavior — it is not a discovery, and
it is not specific to FileMaker. We document it here because it shows
up constantly when designing webhooks against FileMaker tables that
happen to have a field named `id`.

### Symptoms

- `$select=id` (alone) → syntax error / property not found
- `$select=Name,id` → fails or silently drops the `id` field
- `$filter=id eq 123` → may fail even when the field exists
- `"select": "first_name,last_name,id"` inside a webhook descriptor
  → the webhook is created but the server returns
  `Error: syntax error in URL at: 'id'` and the webhook stays stuck
  in `NOT_SENT`

### Workarounds (keep these tricks handy)

1. **Best long-term solution — rename the field.** Avoid lowercase
   `id` entirely. Use `ID`, `RecordID`, `record_id`, `<table>_id`,
   `uuid`, etc.
2. **Quote the identifier.** FileMaker OData accepts quoted
   identifiers for the `id` field in many places:
   ```
   $select=Name,"id"
   $filter="id" eq 942
   ```
3. **Qualify it with a TO / table prefix:**
   ```
   $select=MyTO/"id"
   ```

The app already quotes `id` where it needs to be selected (see
`src/services/filemaker.ts` — e.g. `$select="id"&$top=5` when sampling
rowIDs). Treat any code path that interpolates a user-provided field
name directly into `$select` / `$filter` as needing this guard.

See [DISCOVERINGS.md](DISCOVERINGS.md#warning-id-is-a-reserved-odata-word)
for the long version (with the failing webhook payloads we hit in
testing).

## Architecture

This application uses a **hybrid connection architecture**:

### Development Mode
- **Frontend** (React/Vite) → **Vite Proxy** → **FileMaker Server**
- Vite dev server handles CORS automatically
- SSL certificate bypassing via proxy configuration
- URLs: `/fmi/odata/v4` → `https://192.168.0.24/fmi/odata/v4`

### Production Mode
- **Frontend** (Static files) → **nginx** (`/fmi/*` reverse-proxy) → **FileMaker Server**
- nginx terminates TLS for the public site and proxies `/fmi/*` to
  FileMaker Server (`proxy_ssl_verify off` to accept FMS's self-signed
  cert). Direct browser → FileMaker Server isn't viable because FMS
  doesn't emit CORS headers.
- The frontend always issues **relative** URLs like
  `/fmi/odata/v4/<db>/Webhook.GetAll`, so dev and prod use the same
  client code — only the proxy changes.
- An example nginx site config lives in
  [`docs/servers_enabled/fmwebhooks.conf`](docs/servers_enabled/fmwebhooks.conf)
  and a standalone reverse-proxy snippet lives in
  [`nginx-reverse-proxy.conf`](nginx-reverse-proxy.conf).

This approach provides:
- ✅ Easy development with automatic CORS handling (Vite proxy)
- ✅ Same-origin production deployment (no CORS needed once nginx
  proxies `/fmi/*`)
- ✅ SSL certificate flexibility (proxy bypass in dev, nginx upstream
  TLS in prod)

## Deployment Options

### Development
- `npm run dev` - Vite dev server at `http://localhost:5173`
- Automatic proxy to FileMaker Server (handles CORS and SSL)
- No manual certificate acceptance needed in development

### Production
- Build: `npm run build`
- Deploy `dist/` folder to a web server that **also** reverse-proxies
  `/fmi/*` to your FileMaker Server. The frontend uses relative URLs
  (`/fmi/odata/v4/...`), so without the proxy nothing will reach
  FileMaker.
- Example nginx setup: symlink `dist/` to `/var/www/html/fmwebhooks` and
  use the site config in
  [`docs/servers_enabled/fmwebhooks.conf`](docs/servers_enabled/fmwebhooks.conf)
  (which contains the `/fmi/` proxy block) or the standalone snippet in
  [`nginx-reverse-proxy.conf`](nginx-reverse-proxy.conf).
- Access at `http://your-server/fmwebhooks`

## Verified Findings

### HTTP Methods
✅ **Read endpoints use GET, action endpoints use POST**, per the
official Claris OData guide
([webhook-options.html](https://help.claris.com/en/odata-guide/content/webhook-options.html)).

| Endpoint                       | HTTP method | id location                       |
|--------------------------------|-------------|-----------------------------------|
| `Webhook.GetAll`               | **GET**     | n/a                               |
| `Webhook.Get(<id>)`            | **GET**     | URL path                          |
| `Webhook.Add`                  | POST        | n/a (config in JSON body)         |
| `Webhook.Delete(<id>)`         | POST        | URL path (body may be empty)      |
| `Webhook.Invoke(<id>)`         | POST        | URL path (body has `rowIDs`)      |

❌ PUT and PATCH are not supported on any webhook endpoint.
❌ REST-style `DELETE /Webhook/<id>` is also not supported — use
`POST /Webhook.Delete(<id>)` instead.

### Webhook Persistence
✅ **Webhooks persist across server restarts** - Confirmed through testing with `Webhook.GetAll`

### Webhook Updates
⚠️ **No native update operation** — use the delete + create pattern:
1. Delete the old webhook with `POST /Webhook.Delete(<id>)` (the id is
   passed as an OData function argument in the URL path).
2. Create the new webhook with `POST /Webhook.Add`.
3. Update external references — the new webhook will have a different
   ID.

### Webhook IDs
- Generated by FileMaker Server as integers (typically allocated in
  ascending order: 1, 2, 3, …)
- Unique among **active** webhooks
- Cannot be set manually
- ⚠️ **Are recycled by the server.** IDs of deleted webhooks are
  eventually reused — there is a delay after deletion before the same
  numeric ID can come back, but it does come back. Do **not** treat a
  webhook ID as a globally unique, immutable handle for external
  systems; always reconcile against the current `Webhook.GetAll`
  output. See [DISCOVERINGS.md](DISCOVERINGS.md#webhook-id-behavior)
  for the full notes.

See [DISCOVERINGS.md](DISCOVERINGS.md) for complete verified findings.

## Requirements

- FileMaker Server 22.0.4 or later (with OData webhooks support)
- Node.js 18+
- Valid FileMaker Server credentials with OData access
- Modern web browser

## License

MIT License — see [LICENSE](LICENSE) for details.

## Author

Created and maintained by **Francesc Sans** — [nBCN Software](https://ntwk.es), Barcelona.

Feel free to open issues or pull requests.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.
