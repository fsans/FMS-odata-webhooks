# DISCOVERINGS

There we are saving all the discoveries not documented in the FileMaker OData documentation

Just to have a reference of what is possible to do with the OData API

Save there the samples once confirmed and verified

## webhook records persistence

**Status: VERIFIED - Webhooks persist across server restarts**

The webhook records are persisted by the server itself and survive server restarts. Confirmed through testing with `Webhook.GetAll` endpoint which returns all previously created webhooks even after server restarts.

## HTTP Methods: GET for Reads, POST for Actions

**Status: VERIFIED — read endpoints use GET; action endpoints use POST**

FileMaker OData webhook endpoints follow the standard OData function-call
shape: read endpoints use **GET**, and action endpoints use **POST**
with the `<id>` passed as a function argument **in the URL path**.

Source: official Claris OData guide,
https://help.claris.com/en/odata-guide/content/webhook-options.html
(individual pages for each endpoint).

### Verified Endpoints

| Endpoint                       | HTTP method | id location | Notes                              |
|--------------------------------|-------------|-------------|------------------------------------|
| `Webhook.GetAll`               | **GET**     | n/a         | Returns the full list of webhooks  |
| `Webhook.Get(<id>)`            | **GET**     | URL path    | Returns one webhook by id          |
| `Webhook.Add`                  | POST        | n/a         | Webhook config in JSON body        |
| `Webhook.Delete(<id>)`         | POST        | URL path    | Body may be empty                  |
| `Webhook.Invoke(<id>)`         | POST        | URL path    | Body has `{ "rowIDs": [...] }`     |

The code in `src/services/filemaker.ts` already follows this contract:
`getAllWebhooks` issues `GET /Webhook.GetAll`, `deleteWebhook` issues
`POST /Webhook.Delete(<id>)` with an empty body, and `invokeWebhook`
issues `POST /Webhook.Invoke(<id>)` with `{ rowIDs }`.

### What Does NOT Exist
- ❌ PUT and PATCH on any webhook endpoint (no native update verb)
- ❌ REST-style `DELETE /Webhook/<id>` (use `POST /Webhook.Delete(<id>)` instead)
- ❌ `Webhook(id)`, `Webhook.Update(id)`, `Webhook.Patch(id)`,
  `Webhook.Edit(id)` — none of these are exposed by the OData service

### Webhook ID Behavior

**Status: VERIFIED — IDs are server-generated integers and ARE recycled**

- Webhook IDs are integers issued by FileMaker Server (typically
  allocated in ascending order: 1, 2, 3, …).
- IDs are unique among **active** webhooks.
- IDs cannot be set manually.
- When updating a webhook (delete + create), the new webhook receives
  a fresh ID from the server.
- ⚠️ **IDs ARE reused after deletion.** Earlier versions of this
  document said "Old IDs are not reused" — that was wrong. Internally
  FileMaker Server recycles webhook IDs:
  - There is a (non-trivial) **delay** after a webhook is deleted
    before its ID becomes a candidate for reuse — so a back-to-back
    delete + create in the same session usually gets a fresh number,
    which is what fooled us originally.
  - But over a longer time window (and especially across server
    restarts / GC cycles) the previously-used numeric ID can be
    handed back out to a brand-new webhook.
- **Implication for callers:** never treat a webhook ID as a
  permanent, globally-unique external identifier. If you need stable
  references in another system, store your own UUID (e.g. encoded in
  the webhook URL or in `headers`) and reconcile against
  `Webhook.GetAll` rather than trusting the numeric ID alone.

### How to Update Webhooks

Since FileMaker OData does not support PUT/PATCH on webhook endpoints,
updating requires the delete+create pattern:

1. **Delete** the old webhook using `POST /Webhook.Delete(<id>)` (the id
   is passed as a function argument in the URL path — the body may be
   empty).
2. **Create** a new webhook using `POST /Webhook.Add` with updated
   parameters.
3. **Update references** — Any external systems referencing the old ID
   must be updated to use the new ID.

This is implemented in `fileMakerService.updateWebhook()` which handles the delete+create pattern automatically.

## Warning: `id` is a Reserved OData Word

> **This is NOT a discovery.** `id` is reserved by the OData URL
> conventions (the OData spec uses it as the system token in
> `@odata.id`, in entity references like `MySet(id)`, etc.). The fact
> that you cannot use a bare lowercase `id` as a regular property
> name in `$select` / `$filter` / `$orderby` is well-documented
> upstream behavior, not a FileMaker quirk we uncovered.
>
> We keep the section here only because it bites webhooks hard
> (silent failures, stuck `pendingOperations`, no useful error in the
> UI) and because the workarounds below are the ones we rely on in
> this codebase. Treat this as a **known-issue cookbook**, not a
> finding.

### What's actually going on

 - The OData v4 URL conventions reserve `id` as a system identifier
   token, so OData parsers (FileMaker's included) refuse to bind a
   bare `id` in query options to a regular property.
 - FileMaker also surfaces the internal record id as the lowercase
   `id` key in OData payloads, which makes the collision more
   visible if you happen to have a FileMaker field named `id`.
 - Net effect: when a webhook's `select` (or a record query's
   `$select` / `$filter`) references a bare `id`, FileMaker
   responds with `Error: syntax error in URL at: 'id'` and the
   pending operation gets stuck in `NOT_SENT`.

### Typical symptoms

 - `$select=Name, id` → fails or silently ignores the `id` field
 - `$select=id` alone → syntax error / "property not found"
 - `$filter=id eq 123` → may fail even when the field exists
 - `$select=Name, Id, somethingElse` is usually fine (if you have a
   field called `Id` with that capitalization)

### Workarounds (the tricks we keep using — do not delete)

1. **Best long-term solution — rename the field.**
   Avoid lowercase `id`. Prefer `ID`, `RecordID`, `<table>_id`,
   `uuid`, etc. Uppercase `ID` almost never collides.
2. **Quote the identifier.** FileMaker OData accepts quoted
   identifiers in many places:
   ```
   $select=Name,"id"
   $filter="id" eq 942
   ```
   This is the workaround the app uses internally — see
   `invokeWebhook` in `src/services/filemaker.ts`, which builds
   `$select="id"&$top=5` when sampling rowIDs.
3. **Qualify it with a TO / table prefix:**
   ```
   $select=MyTO/"id"
   ```

### Quick reference

| Your field name | `$select=` syntax that usually works | Recommendation        |
|-----------------|--------------------------------------|-----------------------|
| `id`            | `"id"` or `MyTable/"id"`             | Quote it (or rename)  |
| `ID`            | `ID`                                 | Preferred             |
| `record_id`     | `record_id`                          | Safe                  |
| `Id`            | `Id`                                 | Usually safe          |

### What this means for webhook config

When building a `Webhook.Add` body, the `select` property is just a
bare comma-separated field list, **but** at notification time
FileMaker turns it into a real OData query against the table — so the
same `id` reservation applies. If a user picks a field literally
named `id`, the webhook will keep firing and keep failing with
`syntax error in URL at: 'id'`. Quote it (`"id"`) or rename the
FileMaker field.



## webhook descriptor for schema changes

```json

{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 2,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": true,
            "select": "last_name,first_name,uuid,mod_id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "SCHEMA",
                    "rowIDs": [],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        }
    ]
}

````

## webhook descriptor in normal estate

```json
{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "last_name,first_name,uuid,mod_id",
            "filter": "",
            "pendingOperations": []
        }
    ]
}

```

## webhook descriptor after a record addition

```json
{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "last_name,first_name,uuid,mod_id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "ADD",
                    "rowIDs": [
                        19967
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        }
    ]
}
```

## webhook descriptor after a record modification

```json
{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "last_name,first_name,uuid,mod_id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19967
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        }
    ]
}
```

## sample response to Webhook.GetAll

```json
{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "uuid,mod_id,row_id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19071
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        },
        {
            "webhookID": 2,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "first_name,last_name",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19071
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        },
        {
            "webhookID": 3,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": true,
            "select": "",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19071
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        }
    ]
}



```





If i change the field contact_id to id the if i include the filed if in the filtered fiedls to return tha app crashes and the webhook keep stuck not being sent to my webhook endpoint...

{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "first_name,last_name,id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19972
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": -1002,
                    "lastErrorMessage": "Error: syntax error in URL at: 'id'",
                    "sendAttempts": 1
                }
            ]
        }
    ]

but if i use contact_id instead of id as column OR just no include this field "id" the webhooks fires on record change but is not finally sent.

same on record deletion....


{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "contact",
            "webhook": "http://192.168.0.24:8080/webhooks/sample/index.php",
            "headers": {
                "Authorization": "Basic YWRtaW46d2FrYXdha2E="
            },
            "notifySchemaChanges": false,
            "select": "first_name,last_name,id",
            "filter": "",
            "pendingOperations": [
                {
                    "operation": "UPDATE",
                    "rowIDs": [
                        19972
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": -1002,
                    "lastErrorMessage": "Error: syntax error in URL at: 'id'",
                    "sendAttempts": 36
                },
                {
                    "operation": "DELETE",
                    "rowIDs": [
                        19972
                    ],
                    "status": "NOT_SENT",
                    "lastErrorCode": 0,
                    "lastErrorMessage": "",
                    "sendAttempts": 0
                }
            ]
        }
    ]
}


# sample webhok emited by schema change

```json
{
	"@odata.context" : "fmi/odata/v4/Contacts/$metadata#FileMaker_Tables(\"TableName\",\"TableId\",\"BaseTableName\",\"ModCount\")",
	"value" : 
	[
		{
			"@odata.editLink" : "fmi/odata/v4/Contacts/FileMaker_Tables(2)",
			"@odata.id" : "fmi/odata/v4/Contacts/FileMaker_Tables(2)",
			"BaseTableName" : "contact",
			"ModCount" : 32,
			"TableId" : 1065106,
			"TableName" : "contact"
		}
	]
}
```


# sample webhok emited by content change

```json

```


# sample webhook manual invocation (simulate changes but nothing changed):


> notice modid = 0 !!! because in fact the sim,ulation does not change any data, just simulates it

invoked:

```https://192.168.0.24/fmi/odata/v4/Contacts/Webhook.Invoke(1)```
with params:
```json
{
  "rowIDs":[19071]
}
```
just use the raw rowid values as [19071] not ['19071'], concatenate several ROWIDS with comma [19071,19072,555]

Note: the rowIDs are an array of the REAL ROWIDs of the records you want to get returned. Id nothing specified it returs all records... Is dangerous !!!

> TRICK: always add a ROW_ID field and set it to autoenter as get(recordid) so it clones the internal ROWID. The it will be returned in the oDATA responses, so you can get one or more row-id valuues to compose the {"rowIDs":[]} request body to select one or a narrow set of records 


response:

```json
{
	"@odata.context" : "fmi/odata/v4/Contacts/$metadata#contact(\"uuid\",\"mod_id\",\"row_id\")",
	"value" : 
	[
		{
			"@odata.editLink" : "fmi/odata/v4/Contacts/contact(3276,'211EE2A8-D2C4-4F14-AA4A-A4B05E60C8FE','BBC1A287-FB95-4387-9273-3C778CF1EB9E')",
			"@odata.id" : "fmi/odata/v4/Contacts/contact(3276,'211EE2A8-D2C4-4F14-AA4A-A4B05E60C8FE','BBC1A287-FB95-4387-9273-3C778CF1EB9E')",
			"mod_id" : 0,
			"row_id" : 19071,
			"uuid" : "211EE2A8-D2C4-4F14-AA4A-A4B05E60C8FE"
		}
	]
}
```
