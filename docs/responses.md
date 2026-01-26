
```json
{
    "@context": "https://192.168.0.24/fmi/odata/v4/Contacts/$metadata#Webhook Processor",
    "status": "ACTIVE",
    "webhooks": [
        {
            "webhookID": 1,
            "tableName": "submission",
            "webhook": "http://localhost:8080/mywebhook",
            "headers": {
                "API-KEY": "1234567890ABCDEF"
            },
            "notifySchemaChanges": false,
            "select": "completed",
            "filter": "completed eq 1",
            "pendingOperations": []
        },
        {
            "webhookID": 2,
            "tableName": "contact",
            "webhook": "http://localhost:8080/mywebhook",
            "headers": {},
            "notifySchemaChanges": true,
            "select": "",
            "filter": "",
            "pendingOperations": []
        },
        {
            "webhookID": 4,
            "tableName": "contact",
            "webhook": "http://localhost:8080/mywebhook",
            "headers": {},
            "notifySchemaChanges": false,
            "select": "first_name,last_name",
            "filter": "",
            "pendingOperations": []
        },
        {
            "webhookID": 5,
            "tableName": "contact",
            "webhook": "http://localhost:8080/mywebhook",
            "headers": {},
            "notifySchemaChanges": true,
            "select": "",
            "filter": "",
            "pendingOperations": []
        }
    ]
}
```