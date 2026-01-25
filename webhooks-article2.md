With the release of FileMaker Server 22.0.4, we’re excited to introduce enhanced webhook capabilities that make it easier than ever to integrate FileMaker solutions into modern, event-driven architectures.
 
Webhooks allow FileMaker Server to proactively notify external systems when data or schema changes occur—eliminating the need for polling and enabling near real-time integrations with the tools and platforms developers already use.
 
Why Webhooks Matter
Traditionally, integrations required external systems to repeatedly ask, “Has anything changed?” Webhooks flip that model.
 
With webhooks, FileMaker Server becomes the source of truth that says, “Something just happened—here’s what you need to know.”
 
This shift enables
• Faster integrations
• More efficient use of resources
• Cleaner, more scalable architectures
 
What’s New in FileMaker Server 22.0.4
FileMaker Server webhooks are built on OData v4, giving developers a standards-based, API-driven way to define and manage webhook behavior.
 
Webhooks can be triggered by
• Record changes
• Optional table schema changes
 
And they can be finely tuned so that only specific events and fields result in notifications.
 
Key Webhook Capabilities
 
Fine-Grained Control
 
When creating a webhook, developers can specify
• The target URL that receives notifications
• Custom HTTP headers (for authentication or metadata)
• The table being monitored
• Whether schema changes should trigger notifications
• Filters to control when a webhook fires
• Select fields to control what data is sent
 
This ensures external systems receive only relevant, intentional data.
 
Full Webhook Lifecycle Management
 
FileMaker Server provides OData endpoints to
• Create a webhook
• Delete a webhook
• Retrieve a specific webhook
• List all configured webhooks
• Invoke a webhook manually for testing
 
This makes webhooks easy to automate, document, and manage as part of a broader integration strategy.
 
Built-In Testing Support
Developers can manually invoke a webhook with selected record IDs—making it easy to validate integrations without modifying live data or waiting for real-world changes to occur.
 
How It Works
1. A webhook is created using an OData request.
2. FileMaker Server monitors the specified table.
3. When a qualifying change occurs
• Filters are evaluated
• Selected fields are collected
4. FileMaker Server sends an HTTP POST to the webhook endpoint.
5. The external system processes the event in real time.
 
The result is a clean, efficient, event-driven integration pattern.
 
Benefits for Developers and Partners
 
For FileMaker developers and third-party integrators, webhooks unlock
• Event-driven workflows without polling
• Reduced infrastructure complexity
• More responsive integrations
• Greater scalability
• Natural compatibility with
• Serverless functions
• iPaaS platforms
• Custom APIs
• Modern SaaS ecosystems
 
Common Use Cases
 
Developers are already exploring webhooks for
• Syncing FileMaker data with CRMs, ERPs, and accounting systems
• Triggering automation workflows in tools like Zapier or Make
• Sending real-time notifications to Slack or Microsoft Teams
• Auditing record or schema changes
• Feeding data into analytics and reporting pipelines
• Integrating FileMaker into microservice-based architectures
 
A Step Forward for the FileMaker Platform
With the webhook enhancements in FileMaker Server 22.0.4, FileMaker takes another step toward being a first-class citizen in modern, connected application ecosystems.
 
By combining fine-grained control, standards-based APIs, and event-driven design, webhooks empower developers to build integrations that are faster, cleaner, and more scalable—while keeping FileMaker at the center of their solutions.