What are FileMaker Server Webhooks?
 
FileMaker Server webhooks enable event-driven integrations by automatically notifying external systems when data or schema changes occur in a hosted FileMaker database. Instead of polling for changes, external services receive real-time HTTP notifications triggered directly by FileMaker Server via OData v4. With 22.0.4, webhooks are more configurable, testable, and manageable—making FileMaker a stronger participant in modern, event-driven architectures.
 
Key Components
 
1. Webhook Definition
 
A webhook is defined with
• Target URL – the external endpoint to notify
• Headers – optional HTTP headers (e.g., authentication, content type)
• Table name – the table being monitored
• Trigger types
• Record changes
• Optional schema changes
• Filters – conditions that must be met for the webhook to fire
• Select fields – which fields are included in the payload
 
This ensures only relevant, scoped data is sent.
 
2. Webhook Management Endpoints (OData)
 
FileMaker Server exposes OData endpoints to fully manage webhook lifecycles
• Create a webhook
• Delete a webhook
• Retrieve a specific webhook
• List all webhooks
• Invoke a webhook manually for testing
 
This allows webhooks to be automated, versioned, and managed like any other modern API resource.
 
3. Invocation & Payload Control
• Webhooks fire only when matching changes occur
• Filters determine when a webhook triggers
• Select clauses determine what data is sent
• Manual invocation allows developers to test integrations without modifying data
 
How It Works (End-to-End)
1. A developer creates a webhook using an OData POST request.
2. FileMaker Server monitors the specified table for:
• Record changes
• Optional schema changes
3. When a change occurs:
• Filters are evaluated
• Selected fields are gathered
4. FileMaker Server sends an HTTP POST to the webhook’s URL with the relevant data.
5. External systems process the event in real time.
6. Developers can query, delete, or invoke webhooks as needed.
 
Benefits for 3rd-Party Developers
• Event-driven integration without polling
• Reduced infrastructure complexity
• More efficient data sync with external platforms
• Fine-grained control over triggers and payloads
• Testability via manual webhook invocation
• Works naturally with
• Serverless platforms
• iPaaS tools
• Custom APIs
• Modern SaaS ecosystems
 
This lowers the barrier for FileMaker to participate in larger, multi-system workflows.
 
Potential Use Cases
• Real-time system sync
• CRM, ERP, or accounting updates when FileMaker data changes
• Automation workflows
• Trigger Zapier, Make, or custom automation services
• Audit & compliance
• Capture record or schema changes for logging or alerts
• Notifications
• Send Slack, Teams, or email notifications on key events
• Microservices integration
• Feed FileMaker events into event buses or backend services
• Data pipelines
• Push changes into analytics or reporting systems in near real time
 
Summary
With FileMaker Server 22.0.4, webhooks bring modern, event-driven integration to the FileMaker platform. By allowing developers to define precise triggers, filters, and payloads—and manage them entirely through OData—FileMaker Server becomes a powerful participant in today’s connected application ecosystems. These enhancements make integrations more efficient, responsive, and scalable, unlocking new possibilities for both FileMaker developers and third-party platforms alike.