# FileMaker OData Webhook Endpoint Testing Guide

## Overview

This guide documents the proper way to test FileMaker OData webhook endpoints and clarifies which HTTP methods are supported by each endpoint.

## Critical Finding: Only POST is Supported

Based on the FileMaker OData API documentation and implementation:

**All webhook operations use POST method only.**

- ❌ GET is NOT supported for webhook operations
- ❌ PUT is NOT supported
- ❌ PATCH is NOT supported
- ❌ DELETE is NOT supported

Only POST is used for all webhook operations.

## Documented Webhook Endpoints

### 1. Webhook.GetAll
**Purpose:** List all webhooks in the database

```
POST /fmi/odata/v4/{database}/Webhook.GetAll
```

**Request Body:**
```json
{}
```

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
POST /fmi/odata/v4/{database}/Webhook.Get
```

**Request Body:**
```json
{
  "webhookID": 1
}
```

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
POST /fmi/odata/v4/{database}/Webhook.Delete
```

**Request Body:**
```json
{
  "webhookID": 1
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

### 5. Webhook.Invoke
**Purpose:** Manually trigger a webhook for testing

```
POST /fmi/odata/v4/{database}/Webhook.Invoke
```

**Request Body:**
```json
{
  "webhookID": 1,
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

- ❌ `GET /Webhook.GetAll` - Must use POST
- ❌ `GET /Webhook/{id}` - No direct GET by ID endpoint
- ❌ `PUT /Webhook/{id}` - No native update endpoint
- ❌ `PATCH /Webhook/{id}` - No native patch endpoint
- ❌ `DELETE /Webhook/{id}` - No native DELETE method
- ❌ `Webhook.Update(id)` - Does not exist
- ❌ `Webhook.Edit(id)` - Does not exist
- ❌ `Webhook.Patch(id)` - Does not exist
- ❌ `Webhook.Put(id)` - Does not exist
- ❌ `Webhook(id)` - Not a valid endpoint pattern

## How to Update a Webhook

Since FileMaker OData does not support PUT/PATCH operations, updating a webhook requires:

1. **Delete** the old webhook using `Webhook.Delete`
2. **Create** a new webhook using `Webhook.Add`

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
- Webhook IDs are sequential integers generated by FileMaker
- No other HTTP methods are supported for webhook operations

## References

- See `src/services/endpointValidator.ts` for systematic endpoint testing
- See `src/services/testEndpointsUtil.ts` for practical test utilities
- See `src/services/filemaker.ts` for actual implementation
- See `CLAUDE.md` for overall API documentation
