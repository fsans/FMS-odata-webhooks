# FileMaker OData Webhook Endpoint Testing Guide

## Overview

This guide documents the proper way to test FileMaker OData webhook endpoints and clarifies which HTTP methods are supported by each endpoint.

## Critical Finding: Reads Are GET, Actions Are POST

Based on the official Claris OData guide and the live code in
`src/services/filemaker.ts`, FileMaker OData webhook endpoints use the
standard OData function-call shape: **read** endpoints use `GET`, and
**action** endpoints use `POST` with the `<id>` passed as a function
argument in the URL path.

| Endpoint                       | HTTP method | id location |
|--------------------------------|-------------|-------------|
| `Webhook.GetAll`               | **GET**     | n/a         |
| `Webhook.Get(<id>)`            | **GET**     | URL path    |
| `Webhook.Add`                  | POST        | n/a (config in JSON body) |
| `Webhook.Delete(<id>)`         | POST        | URL path (body may be empty) |
| `Webhook.Invoke(<id>)`         | POST        | URL path (body has `rowIDs`) |

- ❌ `PUT` and `PATCH` are not supported on any webhook endpoint.
- ❌ REST-style `DELETE /Webhook/<id>` is also not supported — use
  `POST /Webhook.Delete(<id>)` instead.

Reference:
https://help.claris.com/en/odata-guide/content/webhook-options.html

## Documented Webhook Endpoints

### 1. Webhook.GetAll
**Purpose:** List all webhooks in the database

```
GET /fmi/odata/v4/{database}/Webhook.GetAll
```

**Request body:** none (it's a `GET`).

**Response:**
```json
{
  "webhooks": [
    {
      "webhookID": 1,
      "webhook": "http://example.com/webhook",
      "tableName": "TableName",
      "notifySchemaChanges": false,
      "select": "Field1,Field2",
      "filter": "Field1 eq 'value'"
    }
  ]
}
```

### 2. Webhook.Add
**Purpose:** Create a new webhook

```
POST /fmi/odata/v4/{database}/Webhook.Add
```

**Request Body:**
```json
{
  "webhook": "http://example.com/webhook",
  "tableName": "TableName",
  "notifySchemaChanges": false,
  "select": "Field1,Field2",
  "filter": "Field1 eq 'value'",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

**Response:**
```json
{
  "webhookResult": {
    "webhookID": 1
  }
}
```

### 3. Webhook.Get
**Purpose:** Get a specific webhook by ID

```
GET /fmi/odata/v4/{database}/Webhook.Get(<id>)
```

The `<id>` is the OData function argument and goes in the URL path —
for example: `GET /fmi/odata/v4/Contacts/Webhook.Get(1)`.

**Request body:** none.

**Response:**
```json
{
  "webhook": {
    "webhookID": 1,
    "webhook": "http://example.com/webhook",
    "tableName": "TableName",
    "notifySchemaChanges": false,
    "select": "Field1,Field2",
    "filter": "Field1 eq 'value'"
  }
}
```

### 4. Webhook.Delete
**Purpose:** Delete a webhook by ID

```
POST /fmi/odata/v4/{database}/Webhook.Delete(<id>)
```

The `<id>` goes in the URL path. The request body may be empty (or
`{}`). For example: `POST /fmi/odata/v4/Contacts/Webhook.Delete(1)`.

**Response:**
```json
{
  "webhookResult": {
    "webhookID": 1
  }
}
```

### 5. Webhook.Invoke
**Purpose:** Manually trigger a webhook for testing

```
POST /fmi/odata/v4/{database}/Webhook.Invoke(<id>)
```

The `<id>` goes in the URL path. The body carries the `rowIDs` to fire
for:

**Request Body:**
```json
{
  "rowIDs": [1, 2, 3]
}
```

**Response:**
```json
{
  "webhookResult": {
    "webhookID": 1
  }
}
```

## What Does NOT Exist

The following endpoints/patterns do NOT exist in FileMaker OData:

- ❌ `PUT /Webhook/<id>`    — no native update endpoint
- ❌ `PATCH /Webhook/<id>`  — no native patch endpoint
- ❌ `DELETE /Webhook/<id>` — no REST-style verb; use `POST /Webhook.Delete(<id>)`
- ❌ `Webhook.Update(<id>)`, `Webhook.Edit(<id>)`, `Webhook.Patch(<id>)`,
  `Webhook.Put(<id>)` — none of these are exposed by the OData service
- ❌ `Webhook(<id>)` as a single-resource entity URL

## How to Update a Webhook

Since FileMaker OData does not support PUT/PATCH operations, updating a webhook requires:

1. **Delete** the old webhook using `POST /Webhook.Delete(<id>)`
   (the id goes in the URL path).
2. **Create** a new webhook using `POST /Webhook.Add` with the updated
   config in the JSON body.

**Important:** The new webhook will receive a new ID. Any external systems referencing the old ID will need to be updated.

This is implemented in `fileMakerService.updateWebhook()`:

```typescript
async updateWebhook(database: string, webhookId: string, params: WebhookCreateParams): Promise<{ webhook: Webhook; oldId: string }> {
  const oldId = webhookId
  await this.deleteWebhook(database, webhookId)
  const newWebhook = await this.createWebhook(database, params)
  return { webhook: newWebhook, oldId }
}
```

## Testing Endpoints

### Using the Endpoint Validator

The `endpointValidator` service provides a systematic way to test which methods are supported:

```typescript
import { endpointValidator } from '@/services/endpointValidator'

const report = await endpointValidator.validateWebhookEndpoints('YourDatabase')
console.log(endpointValidator.generateReport(report))
```

This will test all documented endpoints with GET, POST, PUT, PATCH, and DELETE methods and report which are actually supported.

### Using Test Utilities

Browser console utilities are available for quick testing:

```javascript
// Validate all endpoints
await window.FileMakerTests.validateAllEndpoints('YourDatabase')

// Quick connectivity test
await window.FileMakerTests.quickTest('YourDatabase')

// Test creating a webhook
const webhook = await window.FileMakerTests.testCreateWebhook('YourDatabase', 'TableName')

// Test deleting a webhook
await window.FileMakerTests.testDeleteWebhook('YourDatabase', webhook.id)

// Full integration test
await window.FileMakerTests.fullIntegrationTest('YourDatabase', 'TableName')
```

## Previous Issues with Testing

The previous test files had fundamental problems:

### `endpointTester.ts` Issues:
1. Tested non-existent endpoints like `Webhook(1)`, `Webhook.Delete(1)`, `Webhook.Update(1)`
2. Assumed OData query syntax (with parentheses) would work for webhook operations
3. Did not follow FileMaker's actual function-call syntax (with dots)
4. Tested PUT/PATCH/DELETE methods that are never supported

### `webhookTestFramework.ts` Issues:
1. Called `fileMakerService.updateWebhook()` which works around the lack of PUT/PATCH
2. Did not verify that PUT/PATCH are actually unsupported
3. Assumed update operations could be tested directly

## Correct Testing Approach

1. **Only test POST method** for webhook operations
2. **Use correct endpoint names** with dots: `Webhook.GetAll`, `Webhook.Add`, `Webhook.Delete`, etc.
3. **Pass parameters in request body**, not in URL path
4. **For updates**, use delete + create pattern
5. **Verify with actual FileMaker Server** - test against a real instance, not assumptions

## Implementation Notes

- All webhook endpoints require HTTP Basic Authentication
- Request bodies must be JSON with `Content-Type: application/json`
- FileMaker returns `webhookID` in responses (converted to `id` in our service)
- Webhook IDs are integers generated by FileMaker (typically issued in
  ascending order, but they are **recycled** — IDs of deleted webhooks
  can be reused after a delay; do not assume a webhook ID is a stable
  external identifier). See `DISCOVERINGS.md` for the full notes.
- No other HTTP methods are supported for webhook operations

## References

- See `src/services/endpointValidator.ts` for systematic endpoint testing
- See `src/services/testEndpointsUtil.ts` for practical test utilities
- See `src/services/filemaker.ts` for actual implementation
- See `CLAUDE.md` for overall API documentation
