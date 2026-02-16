import { fileMakerService } from './filemaker'
import { webhookTracker } from './webhookTracker'
import type { WebhookTestScenario, TestOperation } from '@/types/webhook-tracking'
import type { WebhookCreateParams, Webhook } from '@/types/filemaker'

interface TestResult {
  scenario: WebhookTestScenario
  startTime: Date
  endTime?: Date
  success: boolean
  operations: OperationResult[]
  errors: string[]
  analysis: any
  webhooksCreated: Webhook[]
  webhooksDeleted: string[]
}

interface OperationResult {
  operation: TestOperation
  startTime: Date
  endTime?: Date
  success: boolean
  result?: any
  error?: string
  webhookId?: string
}

class WebhookTestFramework {
  private isRunning = false
  private currentTest: string | null = null
  private testResults: Map<string, TestResult> = new Map()

  async runScenario(scenario: WebhookTestScenario, database: string): Promise<TestResult> {
    if (this.isRunning) {
      throw new Error('Test framework is already running a scenario')
    }

    this.isRunning = true
    this.currentTest = scenario.name
    
    const result: TestResult = {
      scenario,
      startTime: new Date(),
      success: false,
      operations: [],
      errors: [],
      analysis: null,
      webhooksCreated: [],
      webhooksDeleted: []
    }

    console.log(`[TestFramework] Starting scenario: ${scenario.name}`)
    console.log(`[TestFramework] Description: ${scenario.description}`)

    try {
      for (let i = 0; i < scenario.operations.length; i++) {
        const operation = scenario.operations[i]
        console.log(`[TestFramework] Step ${i + 1}/${scenario.operations.length}: ${operation.type}`)

        const opResult = await this.executeOperation(operation, database)
        result.operations.push(opResult)

        if (!opResult.success) {
          result.errors.push(`Operation ${i + 1} failed: ${opResult.error}`)
          break
        }

        // Small delay between operations to avoid overwhelming the server
        await this.delay(100)
      }

      result.endTime = new Date()
      result.success = result.errors.length === 0
      
      // Analyze the results
      result.analysis = webhookTracker.analyzePatterns()

      console.log(`[TestFramework] Scenario ${scenario.name} completed. Success: ${result.success}`)

    } catch (error) {
      result.errors.push(`Scenario failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.success = false
      result.endTime = new Date()
    } finally {
      this.isRunning = false
      this.currentTest = null
      this.testResults.set(scenario.name, result)
    }

    return result
  }

  private async executeOperation(operation: TestOperation, database: string): Promise<OperationResult> {
    const result: OperationResult = {
      operation,
      startTime: new Date(),
      success: false
    }

    try {
      switch (operation.type) {
        case 'create':
          if (operation.params) {
            const webhook = await fileMakerService.createWebhook(database, operation.params as WebhookCreateParams)
            result.result = webhook
            result.webhookId = webhook.id
            result.success = true
            console.log(`[TestFramework] Created webhook with ID: ${webhook.id}`)
          }
          break

        case 'delete':
          if (operation.params?.webhookId) {
            // Handle dynamic ID replacement
            let webhookId = operation.params.webhookId as string
            if (webhookId === 'FIRST_WEBHOOK_ID') {
              // Get the first webhook ID from previous operations
              const foundWebhookId = this.getFirstCreatedWebhookId()
              if (!foundWebhookId) {
                throw new Error('No previous webhook found to update')
              }
              webhookId = foundWebhookId
            }
            
            await fileMakerService.deleteWebhook(database, webhookId)
            result.webhookId = webhookId
            result.success = true
            console.log(`[TestFramework] Deleted webhook: ${webhookId}`)
          }
          break

        case 'update':
          if (operation.params?.webhookId && operation.params?.updateParams) {
            // Handle dynamic ID replacement
            let webhookId = operation.params.webhookId as string
            if (webhookId === 'FIRST_WEBHOOK_ID') {
              const foundWebhookId = this.getFirstCreatedWebhookId()
              if (!foundWebhookId) {
                throw new Error('No previous webhook found to update')
              }
              webhookId = foundWebhookId
            } else if (webhookId === 'SECOND_WEBHOOK_ID') {
              const foundWebhookId = this.getNthCreatedWebhookId(2)
              if (!foundWebhookId) {
                throw new Error('No second webhook found to update')
              }
              webhookId = foundWebhookId
            } else if (webhookId === 'FOURTH_WEBHOOK_ID') {
              const foundWebhookId = this.getNthCreatedWebhookId(4)
              if (!foundWebhookId) {
                throw new Error('No fourth webhook found to update')
              }
              webhookId = foundWebhookId
            }

            const updateResult = await fileMakerService.updateWebhook(
              database, 
              webhookId,
              operation.params.updateParams as WebhookCreateParams
            )
            result.result = updateResult
            result.webhookId = updateResult.webhook.id
            result.success = true
            console.log(`[TestFramework] Updated webhook: ${webhookId} -> ${updateResult.webhook.id}`)
          }
          break

        case 'wait':
          if (operation.waitMs) {
            await this.delay(operation.waitMs)
            result.success = true
            console.log(`[TestFramework] Waited ${operation.waitMs}ms`)
          }
          break

        default:
          throw new Error(`Unknown operation type: ${(operation as any).type}`)
      }

      result.endTime = new Date()
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.endTime = new Date()
      result.success = false
      console.error(`[TestFramework] Operation failed:`, result.error)
    }

    return result
  }

  private getFirstCreatedWebhookId(): string | null {
    // Get the most recent test result and find the first created webhook
    const results = Array.from(this.testResults.values())
    if (results.length === 0) return null

    const latestResult = results[results.length - 1]
    const createOperation = latestResult.operations.find(op => op.operation.type === 'create' && op.success)
    
    return createOperation?.webhookId || null
  }

  private getNthCreatedWebhookId(n: number): string | null {
    // Get the most recent test result and find the nth created webhook
    const results = Array.from(this.testResults.values())
    if (results.length === 0) return null

    const latestResult = results[results.length - 1]
    const createOperations = latestResult.operations.filter(op => op.operation.type === 'create' && op.success)
    
    return createOperations[n - 1]?.webhookId || null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async runAllScenarios(database: string): Promise<TestResult[]> {
    const scenarios = webhookTracker.generateTestScenarios()
    const results: TestResult[] = []

    console.log(`[TestFramework] Running ${scenarios.length} scenarios...`)

    for (const scenario of scenarios) {
      try {
        const result = await this.runScenario(scenario, database)
        results.push(result)
        
        // Wait between scenarios to ensure clean state
        await this.delay(2000)
      } catch (error) {
        console.error(`[TestFramework] Scenario ${scenario.name} failed:`, error)
      }
    }

    console.log(`[TestFramework] All scenarios completed. ${results.filter(r => r.success).length}/${results.length} successful`)
    return results
  }

  async runCustomSequence(operations: TestOperation[], database: string, name: string = 'custom'): Promise<TestResult> {
    const scenario: WebhookTestScenario = {
      name,
      description: 'Custom test sequence',
      operations
    }

    return this.runScenario(scenario, database)
  }

  getCurrentTest(): string | null {
    return this.currentTest
  }

  isTestRunning(): boolean {
    return this.isRunning
  }

  getTestResults(): Map<string, TestResult> {
    return new Map(this.testResults)
  }

  getResult(scenarioName: string): TestResult | undefined {
    return this.testResults.get(scenarioName)
  }

  exportResults(): string {
    const results: any[] = []
    
    for (const [name, result] of this.testResults) {
      results.push({
        scenarioName: name,
        scenario: result.scenario,
        success: result.success,
        startTime: result.startTime.toISOString(),
        endTime: result.endTime?.toISOString(),
        duration: result.endTime ? result.endTime.getTime() - result.startTime.getTime() : null,
        operations: result.operations.map(op => ({
          type: op.operation.type,
          success: op.success,
          startTime: op.startTime.toISOString(),
          endTime: op.endTime?.toISOString(),
          duration: op.endTime ? op.endTime.getTime() - op.startTime.getTime() : null,
          webhookId: op.webhookId,
          error: op.error
        })),
        errors: result.errors,
        analysis: result.analysis,
        webhooksCreated: result.webhooksCreated,
        webhooksDeleted: result.webhooksDeleted
      })
    }

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.size,
      successfulTests: Array.from(this.testResults.values()).filter(r => r.success).length,
      results
    }, null, 2)
  }

  clearResults(): void {
    this.testResults.clear()
  }

  // Specific test methods for ID pattern analysis

  async testSequentialCreation(database: string, count: number = 10): Promise<TestResult> {
    const operations: TestOperation[] = Array(count).fill(null).map((_, i) => ({
      type: 'create' as const,
      params: {
        webhook: `http://example.com/sequential-test-${i}`,
        tableName: 'test_table',
        select: 'id,name',
        filter: `created_at > '${new Date().toISOString()}'`
      }
    }))

    return this.runCustomSequence(operations, database, `sequential-creation-${count}`)
  }

  async testDeleteRecreateImmediate(database: string): Promise<TestResult> {
    const operations: TestOperation[] = [
      {
        type: 'create',
        params: {
          webhook: 'http://example.com/delete-recreate-test-1',
          tableName: 'test_table',
          select: 'id'
        }
      },
      {
        type: 'wait',
        waitMs: 1000
      },
      {
        type: 'update', // Use update operation instead of manual delete+create
        params: { 
          webhookId: 'FIRST_WEBHOOK_ID', // Will be replaced with actual ID
          updateParams: {
            webhook: 'http://example.com/delete-recreate-test-2',
            tableName: 'test_table',
            select: 'id'
          }
        }
      }
    ]

    return this.runCustomSequence(operations, database, 'delete-recreate-immediate')
  }

  async testDeleteRecreateDelayed(database: string, delayMs: number = 5000): Promise<TestResult> {
    const operations: TestOperation[] = [
      {
        type: 'create',
        params: {
          webhook: 'http://example.com/delayed-test-1',
          tableName: 'test_table',
          select: 'id'
        }
      },
      {
        type: 'wait',
        waitMs: 1000
      },
      {
        type: 'update', // Use update operation instead of manual delete+create
        params: { 
          webhookId: 'FIRST_WEBHOOK_ID', // Will be replaced with actual ID
          updateParams: {
            webhook: 'http://example.com/delayed-test-2',
            tableName: 'test_table',
            select: 'id'
          }
        }
      },
      {
        type: 'wait',
        waitMs: delayMs
      }
    ]

    return this.runCustomSequence(operations, database, `delete-recreate-delayed-${delayMs}`)
  }

  async testBatchOperations(database: string): Promise<TestResult> {
    const operations: TestOperation[] = [
      // Create 5 webhooks
      ...Array(5).fill(null).map((_, i) => ({
        type: 'create' as const,
        params: {
          webhook: `http://example.com/batch-test-${i}`,
          tableName: 'test_table',
          select: 'id,name'
        }
      })),
      // Wait for creates to complete
      {
        type: 'wait' as const,
        waitMs: 1000
      },
      // Update middle ones (2 and 4) using dynamic IDs
      {
        type: 'update' as const,
        params: { 
          webhookId: 'SECOND_WEBHOOK_ID', // Will be replaced with actual ID
          updateParams: {
            webhook: 'http://example.com/batch-test-2-updated',
            tableName: 'test_table',
            select: 'id'
          }
        }
      },
      {
        type: 'wait' as const,
        waitMs: 500
      },
      {
        type: 'update' as const,
        params: { 
          webhookId: 'FOURTH_WEBHOOK_ID', // Will be replaced with actual ID
          updateParams: {
            webhook: 'http://example.com/batch-test-4-updated',
            tableName: 'test_table',
            select: 'id'
          }
        }
      },
      // Create 3 more
      ...Array(3).fill(null).map((_, i) => ({
        type: 'create' as const,
        params: {
          webhook: `http://example.com/batch-test-${i + 5}`,
          tableName: 'test_table',
          select: 'id'
        }
      }))
    ]

    return this.runCustomSequence(operations, database, 'batch-operations')
  }
}

export const webhookTestFramework = new WebhookTestFramework()
