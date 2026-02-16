import type { FileMakerConnection } from '@/types/filemaker'

interface EndpointTestResult {
  endpoint: string
  method: string
  url: string
  status: number
  statusText: string
  supported: boolean
  error?: string
  response?: any
}

interface EndpointTestSuite {
  baseUrl: string
  results: EndpointTestResult[]
  summary: {
    supportedMethods: string[]
    unsupportedMethods: string[]
    unexpectedBehaviors: string[]
    actualEndpoints: string[]
  }
}

class EndpointTester {
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

  async testEndpointMethod(
    database: string, 
    endpoint: string, 
    method: string,
    body?: any
  ): Promise<EndpointTestResult> {
    const url = `${this.getBaseUrl(database)}/${endpoint}`
    
    try {
      console.log(`[EndpointTester] Testing ${method} ${url}`)
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      let responseData: any
      let error: string | undefined

      try {
        const text = await response.text()
        console.log(`[EndpointTester] Response status: ${response.status}, text: ${text.substring(0, 200)}`)
        
        // Try to parse as JSON
        try {
          responseData = JSON.parse(text)
        } catch {
          responseData = text
        }
      } catch (e) {
        responseData = null
      }

      // Determine if the method is supported based on actual FileMaker behavior
      const supported = this.analyzeFileMakerResponse(response.status, responseData, method, endpoint)

      return {
        endpoint,
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        supported,
        error: supported ? undefined : this.getUnsupportedReason(response.status, responseData, method),
        response: responseData
      }

    } catch (error) {
      console.error(`[EndpointTester] Network error for ${method} ${url}:`, error)
      return {
        endpoint,
        method,
        url,
        status: 0,
        statusText: 'Network Error',
        supported: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private analyzeFileMakerResponse(status: number, response: any, method: string, endpoint: string): boolean {
    // FileMaker specific logic
    
    // 2xx = definitely supported
    if (status >= 200 && status < 300) {
      return true
    }

    // 405 Method Not Allowed = definitely not supported
    if (status === 405) {
      return false
    }

    // 404 can mean:
    // - Endpoint doesn't exist (for any method)
    // - Method not supported for this endpoint
    // - Resource not found (but endpoint exists)
    
    if (status === 404) {
      // For GET methods, 404 usually means endpoint doesn't exist
      if (method === 'GET') {
        // Check if this is a known endpoint that should exist
        const knownGetEndpoints = ['Webhook.GetAll', 'Webhook', '$metadata']
        if (knownGetEndpoints.some(known => endpoint.includes(known))) {
          return false // Endpoint should exist but doesn't
        }
        return false // Likely endpoint doesn't exist
      }
      
      // For POST/PUT/PATCH/DELETE, 404 might mean method not supported
      // But could also mean the specific resource (like webhook ID 1) doesn't exist
      return false // Conservative approach - assume not supported
    }

    // 400 Bad Request = method likely supported but parameters wrong
    if (status === 400) {
      return true
    }

    // 401/403 = authentication/authorization issues, method likely exists
    if (status === 401 || status === 403) {
      return true
    }

    // 500 server errors = method likely exists but server error
    if (status >= 500) {
      return true
    }

    // For FileMaker, some methods might return other status codes
    // Check response content for clues
    if (typeof response === 'string') {
      const lowerResponse = response.toLowerCase()
      if (lowerResponse.includes('method not allowed') || 
          lowerResponse.includes('not supported') ||
          lowerResponse.includes('invalid method')) {
        return false
      }
    }

    if (typeof response === 'object' && response !== null) {
      const responseStr = JSON.stringify(response).toLowerCase()
      if (responseStr.includes('method not allowed') || 
          responseStr.includes('not supported') ||
          responseStr.includes('invalid method')) {
        return false
      }
    }

    // Default to false for unknown status codes
    return false
  }

  private getUnsupportedReason(status: number, response: any, method: string): string {
    if (status === 405) {
      return 'Method Not Allowed - HTTP 405'
    }

    if (status === 404) {
      return 'Endpoint Not Found - HTTP 404'
    }

    if (status === 0) {
      return 'Network Error - Could not connect'
    }

    if (typeof response === 'string') {
      return response.substring(0, 100)
    }

    if (typeof response === 'object' && response !== null) {
      return response.error?.message || response.message || JSON.stringify(response).substring(0, 100)
    }

    return `HTTP ${status}: Unknown error`
  }

  async testWebhookEndpoints(database: string): Promise<EndpointTestSuite> {
    const results: EndpointTestResult[] = []

    console.log(`[EndpointTester] Testing FileMaker webhook endpoints for database: ${database}`)

    // Test 1: Known working endpoints first
    const knownEndpoints = [
      {
        endpoint: 'Webhook.GetAll',
        expectedMethod: 'GET',
        description: 'Get all webhooks'
      },
      {
        endpoint: '$metadata',
        expectedMethod: 'GET', 
        description: 'Get OData metadata'
      }
    ]

    // Test known endpoints
    for (const { endpoint, expectedMethod, description } of knownEndpoints) {
      console.log(`[EndpointTester] Testing known endpoint: ${description}`)
      
      // Test the expected method
      const result = await this.testEndpointMethod(database, endpoint, expectedMethod)
      results.push(result)
      
      // Test a few other methods to confirm they don't work
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        if (method !== expectedMethod) {
          const otherResult = await this.testEndpointMethod(database, endpoint, method)
          results.push(otherResult)
        }
      }
    }

    // Test 2: Webhook.Add with POST (should work)
    console.log(`[EndpointTester] Testing Webhook.Add`)
    const addResult = await this.testEndpointMethod(database, 'Webhook.Add', 'POST', {
      webhook: 'http://example.com/test-webhook',
      tableName: 'TestTable',
      select: 'id,name'
    })
    results.push(addResult)

    // Test 3: Webhook.Add with other methods (should not work)
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const addWrongMethod = await this.testEndpointMethod(database, 'Webhook.Add', method)
      results.push(addWrongMethod)
    }

    // Test 4: Try to get a specific webhook (might work with GET)
    console.log(`[EndpointTester] Testing Webhook.Get`)
    const getResult = await this.testEndpointMethod(database, 'Webhook(1)', 'GET')
    results.push(getResult)

    // Test 5: Try Webhook.Delete with POST (should work if webhook exists)
    console.log(`[EndpointTester] Testing Webhook.Delete`)
    const deleteResult = await this.testEndpointMethod(database, 'Webhook.Delete(1)', 'POST', {})
    results.push(deleteResult)

    // Test 6: Try Webhook.Delete with other methods (should not work)
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const deleteWrongMethod = await this.testEndpointMethod(database, 'Webhook.Delete(1)', method)
      results.push(deleteWrongMethod)
    }

    // Test 7: Try Webhook.Invoke with POST (should work if webhook exists)
    console.log(`[EndpointTester] Testing Webhook.Invoke`)
    const invokeResult = await this.testEndpointMethod(database, 'Webhook.Invoke(1)', 'POST', {
      test: true
    })
    results.push(invokeResult)

    // Test 8: Try potential undocumented update endpoints
    const potentialUpdateEndpoints = [
      'Webhook.Update(1)',
      'Webhook.Patch(1)', 
      'Webhook.Put(1)',
      'Webhook.Edit(1)',
      'Webhook.Modify(1)'
    ]

    for (const endpoint of potentialUpdateEndpoints) {
      console.log(`[EndpointTester] Testing potential update endpoint: ${endpoint}`)
      
      // Test with POST (FileMaker might use POST for updates)
      const postResult = await this.testEndpointMethod(database, endpoint, 'POST', {
        webhook: 'http://example.com/updated-webhook',
        tableName: 'TestTable',
        select: 'id,name'
      })
      results.push(postResult)

      // Test with PUT
      const putResult = await this.testEndpointMethod(database, endpoint, 'PUT', {
        webhook: 'http://example.com/updated-webhook',
        tableName: 'TestTable',
        select: 'id,name'
      })
      results.push(putResult)

      // Test with PATCH
      const patchResult = await this.testEndpointMethod(database, endpoint, 'PATCH', {
        webhook: 'http://example.com/updated-webhook'
      })
      results.push(patchResult)
    }

    // Analyze results
    const summary = this.analyzeResults(results)

    return {
      baseUrl: this.getBaseUrl(database),
      results,
      summary
    }
  }

  private analyzeResults(results: EndpointTestResult[]): EndpointTestSuite['summary'] {
    const supportedMethods = new Set<string>()
    const unsupportedMethods = new Set<string>()
    const unexpectedBehaviors: string[] = []
    const actualEndpoints = new Set<string>()

    // Group results by endpoint
    const endpointGroups = results.reduce((groups, result) => {
      if (!groups[result.endpoint]) {
        groups[result.endpoint] = []
      }
      groups[result.endpoint].push(result)
      return groups
    }, {} as Record<string, EndpointTestResult[]>)

    // Analyze each endpoint
    for (const [endpoint, endpointResults] of Object.entries(endpointGroups)) {
      const supported = endpointResults.filter(r => r.supported).map(r => r.method)
      const unsupported = endpointResults.filter(r => !r.supported).map(r => r.method)

      if (supported.length > 0) {
        supported.forEach(method => supportedMethods.add(`${endpoint}: ${method}`))
        actualEndpoints.add(endpoint)
      }

      if (unsupported.length > 0) {
        unsupported.forEach(method => unsupportedMethods.add(`${endpoint}: ${method}`))
      }

      // Check for unexpected behaviors
      endpointResults.forEach(result => {
        if (result.supported && result.status >= 400) {
          unexpectedBehaviors.push(`${endpoint}: ${result.method} returned ${result.status} but appears supported`)
        }

        if (!result.supported && result.status >= 200 && result.status < 300) {
          unexpectedBehaviors.push(`${endpoint}: ${result.method} returned ${result.status} but appears unsupported`)
        }
      })
    }

    return {
      supportedMethods: Array.from(supportedMethods),
      unsupportedMethods: Array.from(unsupportedMethods),
      unexpectedBehaviors,
      actualEndpoints: Array.from(actualEndpoints)
    }
  }

  generateTestReport(testSuite: EndpointTestSuite): string {
    let report = `# FileMaker Webhook Endpoint Test Report\n\n`
    report += `**Test Date:** ${new Date().toISOString()}\n`
    report += `**Base URL:** ${testSuite.baseUrl}\n\n`

    report += `## Summary\n\n`
    report += `- **Supported Methods:** ${testSuite.summary.supportedMethods.length}\n`
    report += `- **Unsupported Methods:** ${testSuite.summary.unsupportedMethods.length}\n`
    report += `- **Actual Endpoints Found:** ${testSuite.summary.actualEndpoints.length}\n`
    report += `- **Unexpected Behaviors:** ${testSuite.summary.unexpectedBehaviors.length}\n\n`

    if (testSuite.summary.actualEndpoints.length > 0) {
      report += `## 🎯 Actual Endpoints Discovered\n\n`
      testSuite.summary.actualEndpoints.forEach(endpoint => {
        report += `- \`${endpoint}\`\n`
      })
      report += `\n`
    }

    if (testSuite.summary.supportedMethods.length > 0) {
      report += `## ✅ Supported Methods\n\n`
      testSuite.summary.supportedMethods.forEach(method => {
        report += `- ${method}\n`
      })
      report += `\n`
    }

    if (testSuite.summary.unsupportedMethods.length > 0) {
      report += `## ❌ Unsupported Methods\n\n`
      testSuite.summary.unsupportedMethods.forEach(method => {
        report += `- ${method}\n`
      })
      report += `\n`
    }

    if (testSuite.summary.unexpectedBehaviors.length > 0) {
      report += `## ⚠️ Unexpected Behaviors\n\n`
      testSuite.summary.unexpectedBehaviors.forEach(behavior => {
        report += `- ${behavior}\n`
      })
      report += `\n`
    }

    report += `## Detailed Results\n\n`
    
    // Group by endpoint
    const endpointGroups = testSuite.results.reduce((groups, result) => {
      if (!groups[result.endpoint]) {
        groups[result.endpoint] = []
      }
      groups[result.endpoint].push(result)
      return groups
    }, {} as Record<string, EndpointTestResult[]>)

    for (const [endpoint, endpointResults] of Object.entries(endpointGroups)) {
      report += `### ${endpoint}\n\n`
      report += `| Method | Status | Supported | URL |\n`
      report += `|--------|--------|-----------|-----|\n`
      
      endpointResults.forEach(result => {
        const status = result.status === 0 ? 'Error' : `${result.status}`
        const supported = result.supported ? '✅' : '❌'
        
        report += `| ${result.method} | ${status} | ${supported} | ${result.url} |\n`
      })
      
      report += `\n`
    }

    return report
  }

  exportResults(testSuite: EndpointTestSuite): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: testSuite.baseUrl,
      summary: testSuite.summary,
      results: testSuite.results
    }, null, 2)
  }
}

export const endpointTester = new EndpointTester()
