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

**Status: VERIFIED - IDs are sequentially generated and unique**

- Webhook IDs are sequentially generated integers (1, 2, 3, etc.)
- IDs are unique per webhook
- IDs cannot be set manually
- When updating a webhook (delete + create), the new webhook receives a new ID
- Old IDs are not reused

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

## Warning to reserved words

The word id (lowercase) is a reserved word in FileMaker ODATA (maybe in generaal ODATA ?). This represents a big issue for the API design.

This is a known (and quite annoying) behavior in FileMaker's OData implementation.

FileMaker's OData engine internally reserves / treats "id" (lowercase) as a special/keyword-like name — even though the official documentation never explicitly lists it as a reserved word.

This happens because:

 - Many OData implementations (especially those based on .NET / ASP.NET Web API) automatically expect or inject an "ID" / "Id" property as the primary key of an entity
 - FileMaker maps its internal record ID (the one you see with Get(RecordID)) to a property called "id" in the OData payload (lowercase!)
 - When you have your own field also called "id", it creates a naming collision → the parser gets confused and usually refuses the $select (or sometimes $filter, $orderby…) when you try to reference "id"
  

Typical symptoms

 - $select=Name, id → fails or silently ignores your "id" field
 - $select=id alone → often gives a syntax error or "property not found"
 - $filter=id eq 123 → may fail even when the field exists
 - But $select=Name, Id, somethingElse usually works fine (if you have a field called "Id")

Workarounds (choose one)
 
1 Best long-term solution
  - Rename your field to anything else: ID, RecordID, uuid, my_id, contact_id, etc.
 → "ID" (uppercase) almost never collides in FileMaker OData.

2 Quick fix – quote the field name
  - In many cases FileMaker OData accepts quoted identifiers:
  - ```text$select=Name, "id"```
  - or
  - ```text$filter="id" eq 942```
   → Try this first — - it solves the problem for a lot of people.
  
3 Use the TableOccurrence prefix trick (if you're in a TO context)
  
  ```text$select=MyTO/"id"```

Summary – what usually works best


| Your field name | $select=… syntax that usually works | Recommendation |
|-----------------|-------------------------------------|----------------|
| id              | "id" or MyTable/"id"                | Quote it       |
| ID              | ID                                  | Preferred      |
| record_id       | record_id                           | Safe           |
| Id              | Id                                  | Usually safe   |



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