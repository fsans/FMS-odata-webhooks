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

- [AUTHENTICATION.md](AUTHENTICATION.md) - **Authentication guide and troubleshooting**
- [CLAUDE.md](CLAUDE.md) - Comprehensive development guide and API documentation
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Code structure and architecture
- [Initial Prompt](initial-prompt.md) - Project requirements and specifications

## Articles

This repository includes several articles about FileMaker webhooks:

- [Medium Article (Conversational)](medium-article-conversational.md) - Published version
- [Medium Article (Short)](medium-article-short.md) - Condensed version
- [Medium Article (Full)](medium-article.md) - Complete original version

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **API**: FileMaker OData v4
- **Authentication**: HTTP Basic Auth

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/FMS-odata-webhooks.git
cd FMS-odata-webhooks

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Usage

1. **Connect to FileMaker Server**
   - Enter your FileMaker Server host (e.g., `server.example.com`)
   - Provide valid credentials with OData access
   - Click "Connect"

2. **Browse Databases**
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

## Requirements

- FileMaker Server 22.0.4 or later (with OData webhooks support)
- Node.js 18+
- Valid FileMaker Server credentials with OData access
- Modern web browser

## License

TBD

## Contributing

TBD
