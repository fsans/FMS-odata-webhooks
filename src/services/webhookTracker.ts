import type { WebhookOperationLog, WebhookIdPattern, IdAnalysisResult, WebhookTestScenario } from '@/types/webhook-tracking'
import type { Webhook } from '@/types/filemaker'

class WebhookTracker {
  private logs: WebhookOperationLog[] = []
  private patterns: WebhookIdPattern[] = []
  private sessionId: string
  private operationCounter = 0

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  logOperation(log: Omit<WebhookOperationLog, 'id' | 'timestamp' | 'sessionId' | 'operationSequence'>): WebhookOperationLog {
    const fullLog: WebhookOperationLog = {
      id: `log_${Date.now()}_${this.operationCounter++}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
      operationSequence: this.operationCounter,
      metadata: {
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        ...log.metadata
      },
      ...log
    }

    this.logs.push(fullLog)
    console.log(`[WebhookTracker] ${fullLog.operation.toUpperCase()}:`, {
      id: fullLog.webhookId,
      database: fullLog.database,
      success: fullLog.success,
      timing: fullLog.timingMs
    })

    return fullLog
  }

  trackWebhookCreation(webhook: Webhook, database: string, timingMs: number, serverResponse: any): WebhookOperationLog {
    const pattern: WebhookIdPattern = {
      id: parseInt(webhook.id),
      createdAt: new Date(),
      operationSequence: this.operationCounter,
      isRecycled: this.isRecycledId(parseInt(webhook.id)),
      gapBefore: this.calculateGapBefore(parseInt(webhook.id)),
      gapAfter: 0 // Will be calculated on next creation
    }

    this.patterns.push(pattern)

    return this.logOperation({
      operation: 'create',
      database,
      webhookId: webhook.id,
      newWebhookId: webhook.id,
      webhookData: webhook,
      serverResponse,
      timingMs,
      success: true
    })
  }

  trackWebhookDeletion(webhookId: string, database: string, timingMs: number): WebhookOperationLog {
    // Update pattern with deletion time
    const pattern = this.patterns.find(p => p.id === parseInt(webhookId))
    if (pattern) {
      pattern.deletedAt = new Date()
    }

    return this.logOperation({
      operation: 'delete',
      database,
      webhookId,
      oldWebhookId: webhookId,
      timingMs,
      success: true
    })
  }

  trackWebhookUpdate(oldId: string, newWebhook: Webhook, database: string, timingMs: number): WebhookOperationLog {
    // Track as delete + create for analysis
    this.trackWebhookDeletion(oldId, database, timingMs / 2)
    return this.trackWebhookCreation(newWebhook, database, timingMs / 2, { update: true })
  }

  trackError(operation: string, database: string, error: string, webhookId?: string): WebhookOperationLog {
    return this.logOperation({
      operation: operation as any,
      database,
      webhookId,
      success: false,
      error
    })
  }

  private isRecycledId(id: number): boolean {
    const existingPattern = this.patterns.find(p => p.id === id)
    return existingPattern ? existingPattern.deletedAt !== undefined : false
  }

  private calculateGapBefore(id: number): number {
    const existingIds = this.patterns
      .filter(p => p.deletedAt === undefined) // Only active webhooks
      .map(p => p.id)
      .sort((a, b) => a - b)

    if (existingIds.length === 0) return 0

    const lowerIds = existingIds.filter(existingId => existingId < id)
    if (lowerIds.length === 0) return 0

    const maxLowerId = Math.max(...lowerIds)
    return id - maxLowerId - 1
  }

  analyzePatterns(): IdAnalysisResult {
    const createLogs = this.logs.filter(log => log.operation === 'create' && log.success)
    const deleteLogs = this.logs.filter(log => log.operation === 'delete' && log.success)
    
    const ids = createLogs.map(log => parseInt(log.webhookId!)).sort((a, b) => a - b)
    const deletedIds = deleteLogs.map(log => parseInt(log.webhookId!))
    
    // Check if sequential
    const sequential = ids.every((id, index) => index === 0 || id === ids[index - 1] + 1)
    
    // Check for recycling
    const recycledIds = ids.filter(id => deletedIds.includes(id))
    const recyclingDetected = recycledIds.length > 0
    
    // Calculate gaps
    const gaps: number[] = []
    for (let i = 1; i < ids.length; i++) {
      const gap = ids[i] - ids[i - 1] - 1
      if (gap > 0) gaps.push(gap)
    }
    
    const averageGapSize = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0
    const maxGapSize = gaps.length > 0 ? Math.max(...gaps) : 0
    
    // Calculate recycling delay
    const recyclingDelays: number[] = []
    recycledIds.forEach(recycledId => {
      const deleteTime = deleteLogs.find(log => parseInt(log.webhookId!) === recycledId)?.timestamp
      const createTime = createLogs.find(log => parseInt(log.webhookId!) === recycledId && log.timestamp > deleteTime!)?.timestamp
      if (deleteTime && createTime) {
        recyclingDelays.push(createTime.getTime() - deleteTime.getTime())
      }
    })
    
    const recyclingDelay = recyclingDelays.length > 0 ? 
      recyclingDelays.reduce((sum, delay) => sum + delay, 0) / recyclingDelays.length : 0

    return {
      totalOperations: this.logs.length,
      sequentialPatterns: sequential,
      recyclingDetected,
      averageGapSize,
      maxGapSize,
      recyclingDelay,
      patterns: {
        sequential,
        recycled: recyclingDetected,
        predictable: sequential && !recyclingDetected,
        gaps
      }
    }
  }

  getLogs(): WebhookOperationLog[] {
    return [...this.logs]
  }

  getPatterns(): WebhookIdPattern[] {
    return [...this.patterns]
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      patterns: this.patterns,
      analysis: this.analyzePatterns()
    }, null, 2)
  }

  clearLogs(): void {
    this.logs = []
    this.patterns = []
    this.operationCounter = 0
  }

  generateTestScenarios(): WebhookTestScenario[] {
    return [
      {
        name: 'sequential-creation',
        description: 'Create 10 webhooks sequentially to test ID assignment',
        operations: Array(10).fill(null).map(() => ({
          type: 'create' as const,
          params: {
            webhook: 'http://example.com/test',
            tableName: 'test',
            select: 'id,name'
          }
        }))
      },
      {
        name: 'delete-recreate-immediate',
        description: 'Delete webhook and immediately recreate to test recycling',
        operations: [
          { type: 'create' as const, params: { webhook: 'http://example.com/test1', tableName: 'test' } },
          { type: 'delete' as const, params: { webhookId: '1' } },
          { type: 'create' as const, params: { webhook: 'http://example.com/test2', tableName: 'test' } }
        ]
      },
      {
        name: 'delete-recreate-delayed',
        description: 'Delete webhook, wait, then recreate to test delayed recycling',
        operations: [
          { type: 'create' as const, params: { webhook: 'http://example.com/test1', tableName: 'test' } },
          { type: 'delete' as const, params: { webhookId: '1' } },
          { type: 'wait' as const, waitMs: 5000 },
          { type: 'create' as const, params: { webhook: 'http://example.com/test2', tableName: 'test' } }
        ]
      },
      {
        name: 'batch-operations',
        description: 'Create multiple webhooks, delete middle ones, then create more',
        operations: [
          ...Array(5).fill(null).map((_, i) => ({ 
            type: 'create' as const, 
            params: { webhook: `http://example.com/test${i}`, tableName: 'test' } 
          })),
          { type: 'delete' as const, params: { webhookId: '2' } },
          { type: 'delete' as const, params: { webhookId: '4' } },
          ...Array(3).fill(null).map((_, i) => ({ 
            type: 'create' as const, 
            params: { webhook: `http://example.com/test${i + 5}`, tableName: 'test' } 
          }))
        ]
      }
    ]
  }
}

export const webhookTracker = new WebhookTracker()
