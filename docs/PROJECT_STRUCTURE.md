# Project Structure

This document outlines the structure of the FileMaker OData Webhooks Manager application.

## Directory Structure

```
FMS-odata-webhooks/
├── public/                     # Static assets
│   └── vite.svg               # App icon
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── textarea.tsx
│   │   ├── ConnectionForm.tsx    # FileMaker Server connection
│   │   ├── DatabaseBrowser.tsx   # Database/table browser
│   │   ├── WebhookDialog.tsx     # Create/Edit webhook dialog
│   │   └── WebhookManager.tsx    # Webhook list and management
│   ├── contexts/
│   │   └── FileMakerContext.tsx  # Global FileMaker state
│   ├── lib/
│   │   └── utils.ts              # Utility functions (cn)
│   ├── services/
│   │   └── filemaker.ts          # FileMaker OData API service
│   ├── types/
│   │   └── filemaker.ts          # TypeScript type definitions
│   ├── App.tsx                   # Main app component
│   ├── index.css                 # Tailwind directives
│   ├── main.tsx                  # App entry point
│   └── vite-env.d.ts            # Vite type definitions
├── index.html                    # HTML template
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.app.json            # App-specific TypeScript config
├── tsconfig.node.json           # Node-specific TypeScript config
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── eslint.config.js             # ESLint configuration
├── .gitignore                   # Git ignore rules
├── CLAUDE.md                    # Development guide
└── README.md                    # Project documentation
```

## Key Components

### 1. ConnectionForm
- Handles FileMaker Server authentication
- Uses HTTP Basic Auth
- Tests connection on submit
- Displays connection status

### 2. DatabaseBrowser
- Lists available databases
- Displays tables for selected database
- Shows field metadata with FileMaker-specific annotations
- Expandable table view with field details

### 3. WebhookManager
- Lists all webhooks for current database
- Create, edit, delete, and test webhooks
- Refresh webhook list
- Invoke webhooks manually for testing

### 4. WebhookDialog
- Modal form for webhook creation/editing
- Table selector with metadata loading
- Field multi-select with checkboxes
- OData filter input
- Custom headers (JSON format)
- Schema change notification toggle

## Core Services

### FileMakerService (`src/services/filemaker.ts`)

Main API service with methods:

- `setConnection(connection)` - Configure server credentials
- `testConnection()` - Verify connection works
- `getDatabases()` - List available databases
- `getMetadata(database)` - Get tables and fields for database
- `getAllWebhooks(database)` - List all webhooks
- `createWebhook(database, params)` - Create new webhook
- `deleteWebhook(database, webhookId)` - Remove webhook
- `invokeWebhook(database, webhookId, rowIds?)` - Trigger webhook manually
- `executeScript(database, scriptName, parameter?)` - Run FileMaker script

## State Management

### FileMakerContext

Global context providing:

- `connection` - Current server connection details
- `isConnected` - Connection status
- `currentDatabase` - Selected database
- `currentTable` - Selected table metadata
- `setConnection()` - Update connection
- `disconnect()` - Clear connection and state
- `setCurrentDatabase()` - Set active database
- `setCurrentTable()` - Set active table

## API Integration

All API calls use HTTP Basic Authentication. The service handles:

1. **Database Discovery**: `GET /fmi/odata/v4`
2. **Metadata Retrieval**: `GET /fmi/odata/v4/{database}/$metadata`
3. **Webhook Operations**: `POST /fmi/odata/v4/{database}/Webhook.*`
4. **Script Execution**: `POST /fmi/odata/v4/{database}/Script.{name}`

## Styling

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library
- **lucide-react**: Icon library
- **Custom theme**: Slate color palette with gradient backgrounds

## Type Safety

Full TypeScript support with types for:

- `FileMakerConnection`
- `Database`
- `TableMetadata`
- `FieldMetadata`
- `Webhook`
- `WebhookCreateParams`
- `ScriptResult`
- `ScriptResponse`

## Development

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Notes

- No local database needed - all state lives on FileMaker Server
- CORS may require server configuration for production use
- Webhooks are persistent server-side entities
- XML metadata parsing uses browser's DOMParser
- Filter syntax follows OData v4 specification
