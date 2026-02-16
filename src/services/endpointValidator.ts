import type { FileMakerConnection } from '@/types/filemaker'

interface MethodTest {
  method: string
  status: number
  statusText: string
  supported: boolean
  error?: string
}

interface EndpointValidation {
  endpoint: string
  url: string
  methods: MethodTest[]
  actuallySupported: string[]
}

interface ValidationReport {
  timestamp: string
  baseUrl: string
  endpoints: EndpointValidation[]
  summary: {
    totalEndpoints: number
    totalMethodsTested: number
    supportedMethods: string[]
    unsupportedMethods: string[]
  }
}

class EndpointValidator {
  private connection: FileMakerConnection | null = null

  setConnection(connection: FileMakerConnection) {
    this.connection = connection
  }

  private getBaseUrl(database: string): string {
    if (!this.connection) {
      throw new Error('No FileMaker connection available')
    }
    return `https://${this.connection.host}/fmi/odata/v4/${database}`
  }

  private getAuthHeader(): string {
    if (!this.connection) {
      throw new Error('No FileMaker connection available')
    }
    return `Basic ${btoa(`${this.connection.username}:${this.connection.password}`)}`
  }

  /**
   * Test a single endpoint with a specific HTTP method
   */
  private async testMethod(
    url: string,
    method: string,
    body?: any
  ): Promise<MethodTest> {
    try {
      console.log(`[EndpointValidator] Testing ${method} ${url}`)

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      try {
        await response.text()
      } catch {
        // Response text not needed for validation
      }

      console.log(
        `[EndpointValidator] ${method} ${url} -> ${response.status} ${response.statusText}`
      )

      // Determine if method is supported based on HTTP status codes
      const supported = this.isMethodSupported(response.status)

      return {
        method,
        status: response.status,
        statusText: response.statusText,
        supported,
        error: !supported ? this.getErrorReason(response.status) : undefined,
      }
    } catch (error) {
      console.error(`[EndpointValidator] Network error for ${method} ${url}:`, error)
      return {
        method,
        status: 0,
        statusText: 'Network Error',
        supported: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Determine if an HTTP method is supported based on status code
   * - 2xx: Supported
   * - 405: Method Not Allowed (explicitly not supported)
   * - 404: Endpoint not found (but could be method not supported)
   * - 400: Bad Request (method likely supported, parameters wrong)
   * - 401/403: Auth issue (method likely supported)
   */
  private isMethodSupported(status: number): boolean {
    if (status >= 200 && status < 300) return true
    if (status === 405) return false // Method Not Allowed
    if (status === 404) return false // Not Found
    if (status === 400) return true // Bad Request (method exists, params wrong)
    if (status === 401 || status === 403) return true // Auth issues
    if (status >= 500) return true // Server error (method likely exists)
    return false
  }

  private getErrorReason(status: number): string {
    switch (status) {
      case 405:
        return 'Method Not Allowed (405)'
      case 404:
        return 'Not Found (404)'
      case 400:
        return 'Bad Request (400)'
      case 401:
        return 'Unauthorized (401)'
      case 403:
        return 'Forbidden (403)'
      case 0:
        return 'Network Error'
      default:
        return `HTTP ${status}`
    }
  }

  /**
   * Validate all documented webhook endpoints
   * Based on CLAUDE.md:
   * - POST /Webhook.Add
   * - POST /Webhook.Delete
   * - POST /Webhook.Get
   * - POST /Webhook.GetAll
   * - POST /Webhook.Invoke
   */
  async validateWebhookEndpoints(database: string): Promise<ValidationReport> {
    const baseUrl = this.getBaseUrl(database)
    const endpoints: EndpointValidation[] = []

    console.log(`[EndpointValidator] Validating webhook endpoints for database: ${database}`)

    // Define the documented webhook endpoints
    const webhookEndpoints = [
      {
        name: 'Webhook.GetAll',
        description: 'Get all webhooks',
        expectedMethod: 'POST',
      },
      {
        name: 'Webhook.Add',
        description: 'Create a new webhook',
        expectedMethod: 'POST',
      },
      {
        name: 'Webhook.Get',
        description: 'Get a specific webhook (may require ID parameter)',
        expectedMethod: 'POST',
      },
      {
        name: 'Webhook.Delete',
        description: 'Delete a webhook (may require ID parameter)',
        expectedMethod: 'POST',
      },
      {
        name: 'Webhook.Invoke',
        description: 'Manually invoke a webhook (may require ID parameter)',
        expectedMethod: 'POST',
      },
    ]

    // Test each endpoint with all HTTP methods
    for (const endpoint of webhookEndpoints) {
      const url = `${baseUrl}/${endpoint.name}`
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      const methodTests: MethodTest[] = []

      console.log(`\n[EndpointValidator] Testing endpoint: ${endpoint.name}`)

      for (const method of methods) {
        // For POST endpoints, send minimal valid body
        let body: any = undefined
        if (method === 'POST') {
          if (endpoint.name === 'Webhook.Add') {
            body = {
              webhook: 'http://example.com/test',
              tableName: 'TestTable',
            }
          } else if (endpoint.name === 'Webhook.GetAll') {
            body = {}
          } else {
            body = {}
          }
        }

        const methodTest = await this.testMethod(url, method, body)
        methodTests.push(methodTest)
      }

      const actuallySupported = methodTests
        .filter((t) => t.supported)
        .map((t) => t.method)

      endpoints.push({
        endpoint: endpoint.name,
        url,
        methods: methodTests,
        actuallySupported,
      })
    }

    // Generate summary
    const allSupportedMethods = new Set<string>()
    const allUnsupportedMethods = new Set<string>()

    endpoints.forEach((ep) => {
      ep.methods.forEach((method) => {
        const key = `${ep.endpoint}: ${method.method}`
        if (method.supported) {
          allSupportedMethods.add(key)
        } else {
          allUnsupportedMethods.add(key)
        }
      })
    })

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      baseUrl,
      endpoints,
      summary: {
        totalEndpoints: endpoints.length,
        totalMethodsTested: endpoints.length * 5,
        supportedMethods: Array.from(allSupportedMethods),
        unsupportedMethods: Array.from(allUnsupportedMethods),
      },
    }

    return report
  }

  /**
   * Generate a human-readable report
   */
  generateReport(report: ValidationReport): string {
    let output = `# FileMaker OData Webhook Endpoint Validation Report\n\n`
    output += `**Generated:** ${report.timestamp}\n`
    output += `**Base URL:** ${report.baseUrl}\n\n`

    output += `## Summary\n\n`
    output += `- **Endpoints Tested:** ${report.summary.totalEndpoints}\n`
    output += `- **Total Method Tests:** ${report.summary.totalMethodsTested}\n`
    output += `- **Supported Methods:** ${report.summary.supportedMethods.length}\n`
    output += `- **Unsupported Methods:** ${report.summary.unsupportedMethods.length}\n\n`

    output += `## Supported Methods\n\n`
    if (report.summary.supportedMethods.length === 0) {
      output += `None found\n\n`
    } else {
      report.summary.supportedMethods.forEach((method) => {
        output += `- ✅ ${method}\n`
      })
      output += `\n`
    }

    output += `## Unsupported Methods\n\n`
    if (report.summary.unsupportedMethods.length === 0) {
      output += `None\n\n`
    } else {
      report.summary.unsupportedMethods.forEach((method) => {
        output += `- ❌ ${method}\n`
      })
      output += `\n`
    }

    output += `## Detailed Results\n\n`
    report.endpoints.forEach((endpoint) => {
      output += `### ${endpoint.endpoint}\n\n`
      output += `**URL:** \`${endpoint.url}\`\n\n`
      output += `| Method | Status | Supported | Error |\n`
      output += `|--------|--------|-----------|-------|\n`

      endpoint.methods.forEach((method) => {
        const statusStr = method.status === 0 ? 'Error' : `${method.status}`
        const supportedStr = method.supported ? '✅' : '❌'
        const errorStr = method.error || '-'
        output += `| ${method.method} | ${statusStr} | ${supportedStr} | ${errorStr} |\n`
      })

      output += `\n`
    })

    return output
  }

  /**
   * Export results as JSON
   */
  exportJSON(report: ValidationReport): string {
    return JSON.stringify(report, null, 2)
  }
}

export const endpointValidator = new EndpointValidator()
