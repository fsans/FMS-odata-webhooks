# FileMaker ODATA API webhooks


Build a web app to connect to a filemaker server instance via ODATA API with the purpose of setup webhoocks, like add, remove and  get data.

We need a database/table/field UI browser to "select" which elements will target the added webhooks and then some UI to define which "filter" to apply.

I think we do not need any persistence (database) because all the info ans webbhoks state shuld live in the FileMaker server itself... But I do not know if theses webhooks are permanent ofr should be re-established after a restart (please investigate ths case).

We will add a mechanism to triger FileMaker scripts on response to certain webhooks, so we can tie a webhook response to a scripot callback. Gor the script callinhg just use the ODATA script endpoints (see bellow the docs)


For the aplications use  React, tailwind and shadcdn. Use vite builds


## Filemaker odata webhooks Documentation

Here you can find the oficial documentation about the FileMaker ODATA webhooks endpointsspec:

https://help.claris.com/en/odata-guide/content/webhook-options.html

https://help.claris.com/en/odata-guide/content/webhook-option-create.html
https://help.claris.com/en/odata-guide/content/webhook-option-delete.html
https://help.claris.com/en/odata-guide/content/webhook-option-get.html
https://help.claris.com/en/odata-guide/content/webhook-option-get-all.html
https://help.claris.com/en/odata-guide/content/webhook-option-invoke.html

## Filemaker odata metadata Documentation

To explore the database schemas and metadata just use the specific endpoiuints deteiled here:

https://help.claris.com/en/odata-guide/content/get-database-names.html
https://help.claris.com/en/odata-guide/content/get-list-of-tables.html
https://help.claris.com/en/odata-guide/content/get-metadata.html

## Filemaker odata script calling Documentation

To execute scripts in FileMaker from the ODATA API use this endpoint:

https://help.claris.com/en/odata-guide/content/run-scripts.html