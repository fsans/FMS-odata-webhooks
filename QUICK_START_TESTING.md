# Quick Start: Testing FileMaker OData Webhook Endpoints

## TL;DR - Test in 30 Seconds

1. Start the dev server: `npm run dev`
2. Connect to FileMaker Server via the UI
3. Open browser console (F12)
4. Run:
   ```javascript
   await window.FileMakerTests.quickTest('YourDatabaseName')
   ```

Expected output: ✅ for working endpoints, ❌ for failures

---

## What You'll Learn

This testing approach validates:
- ✅ Which HTTP methods are actually supported
- ✅ Which endpoints exist and work
- ✅ Your FileMaker Server connection
- ✅ Your database accessibility

---

## Test Scenarios

### Scenario 1: Quick Connectivity Check
**Time:** 10 seconds  
**What it tests:** Basic connection and metadata access

```javascript
await window.FileMakerTests.quickTest('MyDatabase')
```

**Expected output:**
```
⚡ Running quick connectivity test...

1️⃣ Testing Webhook.GetAll...
✅ Webhook.GetAll works! Found 5 webhooks

2️⃣ Testing $metadata...
✅ $metadata works! Found 12 tables

✨ Quick test complete
```

### Scenario 2: Full Endpoint Validation
**Time:** 30-60 seconds  
**What it tests:** All HTTP methods on all webhook endpoints

```javascript
await window.FileMakerTests.validateAllEndpoints('MyDatabase')
```

**Expected output:**
```
🔍 Starting endpoint validation...

# FileMaker OData Webhook Endpoint Validation Report

**Generated:** 2026-02-15T12:34:56.789Z
**Base URL:** https://192.168.0.24/fmi/odata/v4/MyDatabase

## Summary

- **Endpoints Tested:** 5
- **Total Method Tests:** 25
- **Supported Methods:** 5
- **Unsupported Methods:** 20

## Supported Methods

- ✅ Webhook.GetAll:        GET
- ✅ Webhook.Get(<id>):     GET
- ✅ Webhook.Add:           POST
- ✅ Webhook.Delete(<id>):  POST
- ✅ Webhook.Invoke(<id>):  POST

## Unsupported Methods

- ❌ Webhook.GetAll: PUT, PATCH
- ❌ Webhook.Add:    PUT, PATCH
- ❌ REST-style `DELETE /Webhook/<id>` (use `POST /Webhook.Delete(<id>)`)
- [... etc ...]
```

Note: the validator's notion of "supported" is *the server didn't return
404/405 for that method on that endpoint*. A `400 Bad Request` (e.g.
because the validator sent a probe with an empty body) is treated as
"method exists". So if you see something like `POST Webhook.GetAll:
supported (400)` in the report, that's the validator detecting that the
path exists — not a contradiction with the table at the top of this
guide. The authoritative method per endpoint is in that table; in real
use, `Webhook.GetAll` should be called with `GET`.

### Scenario 3: Full Integration Test
**Time:** 2-5 minutes  
**What it tests:** Create, list, and delete webhooks

```javascript
await window.FileMakerTests.fullIntegrationTest('MyDatabase', 'MyTable')
```

**Expected output:**
```
🧪 Running full integration test...

Step 1: Getting initial webhook list...
✅ Found 5 existing webhooks

Step 2: Creating test webhook...
🆕 Testing webhook creation for table: MyTable
✅ Webhook created successfully!
   ID: 6
   URL: http://example.com/test-webhook
   Table: MyTable

Step 3: Verifying webhook appears in list...
✅ Webhook found in list

Step 4: Deleting test webhook...
🗑️ Testing webhook deletion for ID: 6
✅ Webhook deleted successfully!

Step 5: Verifying webhook is deleted...
✅ Webhook successfully deleted

✨ Full integration test complete!
```

### Scenario 4: Individual Operations
**Time:** Variable  
**What it tests:** Specific operations

```javascript
// Create a webhook
const webhook = await window.FileMakerTests.testCreateWebhook('MyDatabase', 'MyTable')

// Delete a webhook
await window.FileMakerTests.testDeleteWebhook('MyDatabase', webhook.id)
```

---

## Troubleshooting

### Issue: "Network Error" or "Cannot reach server"
**Cause:** FileMaker Server not accessible  
**Solution:**
1. Check FileMaker Server is running
2. Verify hostname/IP in connection form
3. Accept SSL certificate warning in browser first

### Issue: "401 Unauthorized"
**Cause:** Wrong credentials  
**Solution:**
1. Verify username and password
2. Ensure user has OData API access in FileMaker

### Issue: "404 Not Found"
**Cause:** Database doesn't exist or OData not enabled  
**Solution:**
1. Verify database name is correct
2. Check FileMaker Server version (22.0.4+)
3. Ensure OData is enabled in Server Admin Console

### Issue: Tests show "Unsupported" for POST methods
**Cause:** Endpoint doesn't exist or wrong format  
**Solution:**
1. Verify FileMaker Server version supports webhooks
2. Check endpoint names are exactly: `Webhook.GetAll`, `Webhook.Add`, etc.
3. Ensure request body is valid JSON

---

## Understanding the Results

### HTTP Status Codes

| Status | Meaning | Supported? |
|--------|---------|-----------|
| 200-299 | Success | ✅ Yes |
| 400 | Bad Request | ✅ Yes (method exists, params wrong) |
| 401 | Unauthorized | ✅ Yes (auth issue, not method) |
| 403 | Forbidden | ✅ Yes (permission issue, not method) |
| 404 | Not Found | ❌ No |
| 405 | Method Not Allowed | ❌ No |
| 5xx | Server Error | ✅ Yes (method exists, server error) |

### What This Means

**If you see:**
- ✅ `GET /Webhook.GetAll` and `GET /Webhook.Get(<id>)` supported,
  ✅ `POST /Webhook.Add`, `POST /Webhook.Delete(<id>)`,
  `POST /Webhook.Invoke(<id>)` supported, ❌ `PUT`/`PATCH` unsupported
  - **Correct!** This is the expected behavior.

- ❌ All methods unsupported
  - **Problem:** the endpoint doesn't exist (likely a connectivity
    issue or wrong database name).

- ✅ `POST /Webhook.GetAll` reported as supported with status 400/415
  - **Expected validator artefact:** the validator probe sends an
    invalid body, FMS returns 400, and the validator interprets that
    as "the method exists". In real use, `Webhook.GetAll` should be
    called with `GET`.

---

## Next Steps

After validating endpoints:

1. **Create webhooks** via the UI
2. **Test webhooks** with the "Test" button
3. **Monitor webhook activity** in the webhook list
4. **Check logs** for any errors

---

## Advanced: Programmatic Testing

If you want to integrate testing into your code:

```typescript
import { endpointValidator } from '@/services/endpointValidator'

async function validateBeforeUse() {
  const report = await endpointValidator.validateWebhookEndpoints('MyDatabase')
  
  // Check if POST is supported
  const postSupported = report.endpoints.every(ep => 
    ep.actuallySupported.includes('POST')
  )
  
  if (!postSupported) {
    console.error('FileMaker Server does not support webhook operations')
    return false
  }
  
  console.log('✅ All endpoints validated and working')
  return true
}
```

---

## Reference

- **Full Testing Guide:** See `ENDPOINT_TESTING_GUIDE.md`
- **Rebuild Summary:** See `ENDPOINT_TEST_REBUILD.md`
- **Implementation:** See `src/services/endpointValidator.ts`
- **Test Utilities:** See `src/services/testEndpointsUtil.ts`
