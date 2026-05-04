# FileMaker OData Webhooks Manager

A React web application for managing FileMaker Server webhooks via the OData API.

## Overview

This application provides a user-friendly interface to browse FileMaker databases, tables, and fields, then configure webhooks with filters and callbacks to FileMaker scripts. Built with React, Vite, Tailwind CSS, and shadcn/ui components.

## Features

- **Database Browser**: Connect to FileMaker Server and explore databases, tables, and field metadata
- **Webhook Manager**: Create, edit, delete, and test webhooks with visual configuration
- **OData Integration**: Full support for FileMaker Server 22.0.4+ OData webhook capabilities
- **Event-Driven Architecture**: Enable real-time integrations without polling

## Documentation

- [AUTHENTICATION.md](docs/AUTHENTICATION.md) - **Authentication guide and troubleshooting**
- [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) - Code structure and architecture
- [DISCOVERINGS.md](docs/DISCOVERINGS.md) - **Verified findings about FileMaker OData webhooks**
- [ENDPOINT_TESTING_GUIDE.md](docs/ENDPOINT_TESTING_GUIDE.md) - **Complete endpoint testing documentation**
- [QUICK_START_TESTING.md](docs/QUICK_START_TESTING.md) - **Quick reference for testing endpoints**

## Articles

This repository includes several articles about FileMaker webhooks:

- [Medium Article (Conversational)](docs/medium-article-conversational.md) - Published version
- [Medium Article (Short)](docs/medium-article-short.md) - Condensed version
- [Medium Article (Full)](docs/medium-article.md) - Complete original version

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

See [QUICK_START_TESTING.md](docs/QUICK_START_TESTING.md) for detailed testing instructions.

## ⚠️ Important: Reserved Field Names in OData Queries

**The `id` field is a reserved word in FileMaker OData and MUST be quoted in `$select` parameters.**

When querying records and selecting the `id` field, always use:
```
$select="id"
```

NOT:
```
$select=id
```

This is a FileMaker-specific requirement. Failure to quote reserved field names will result in OData parsing errors.

## Architecture

This application uses a **hybrid connection architecture**:

### Development Mode
- **Frontend** (React/Vite) → **Vite Proxy** → **FileMaker Server**
- Vite dev server handles CORS automatically
- SSL certificate bypassing via proxy configuration
- URLs: `/fmi/odata/v4` → `https://192.168.0.24/fmi/odata/v4`

### Production Mode  
- **Frontend** (Static files) → **FileMaker Server** (direct OData API calls)
- Requires SSL certificate acceptance in browser
- Direct HTTPS calls to FileMaker's OData API
- URLs: `https://your-server/fmi/odata/v4`

This approach provides:
- ✅ Easy development with automatic CORS handling
- ✅ Simple production deployment without backend dependencies
- ✅ SSL certificate flexibility (proxy in dev, manual acceptance in prod)

## Deployment Options

### Development
- `npm run dev` - Vite dev server at `http://localhost:5173`
- Automatic proxy to FileMaker Server (handles CORS and SSL)
- No manual certificate acceptance needed in development

### Production
- Build: `npm run build`
- Deploy `dist/` folder to any web server (nginx, Apache, etc.)
- Example nginx setup: symlink `dist/` to `/var/www/html/fmwebhooks`
- Access at `http://your-server/fmwebhooks`

## Verified Findings

### HTTP Methods
✅ **Only POST is supported** for all webhook operations (verified through systematic testing)
- `POST /Webhook.GetAll` - List webhooks
- `POST /Webhook.Add` - Create webhook
- `POST /Webhook.Get` - Get specific webhook
- `POST /Webhook.Delete` - Delete webhook
- `POST /Webhook.Invoke` - Test/trigger webhook

❌ GET, PUT, PATCH, DELETE methods are NOT supported

### Webhook Persistence
✅ **Webhooks persist across server restarts** - Confirmed through testing with `Webhook.GetAll`

### Webhook Updates
⚠️ **No native update operation** - Use delete + create pattern:
1. Delete old webhook with `POST /Webhook.Delete`
2. Create new webhook with `POST /Webhook.Add`
3. Update external references (new webhook gets new ID)

### Webhook IDs
- Sequentially generated integers (1, 2, 3, etc.)
- Unique per webhook
- Cannot be set manually
- Not reused after deletion

See [DISCOVERINGS.md](docs/DISCOVERINGS.md) for complete verified findings.

## Requirements

- FileMaker Server 22.0.4 or later (with OData webhooks support)
- Node.js 18+
- Valid FileMaker Server credentials with OData access
- Modern web browser

## License

TBD

## Contributing

TBD
