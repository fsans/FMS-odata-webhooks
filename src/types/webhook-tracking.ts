export interface WebhookOperationLog {
  id: string
  timestamp: Date
  operation: 'create' | 'delete' | 'update' | 'get_all' | 'get'
  database: string
  webhookId?: string
  oldWebhookId?: string
  newWebhookId?: string
  webhookData?: any
  serverResponse?: any
  timingMs?: number
  success: boolean
  error?: string
  sessionId?: string
  operationSequence?: number
  metadata?: {
    userAgent?: string
    sessionId?: string
    serverState?: string
    concurrentOperations?: number
  }
}

export interface WebhookIdPattern {
  id: number
  createdAt: Date
  deletedAt?: Date
  operationSequence: number
  isRecycled: boolean
  recycledFrom?: number
  gapBefore?: number
  gapAfter?: number
}

export interface IdAnalysisResult {
  totalOperations: number
  sequentialPatterns: boolean
  recyclingDetected: boolean
  averageGapSize: number
  maxGapSize: number
  recyclingDelay: number
  patterns: {
    sequential: boolean
    recycled: boolean
    predictable: boolean
    gaps: number[]
  }
}

export interface WebhookTestScenario {
  name: string
  description: string
  operations: TestOperation[]
  expectedPattern?: string
}

export interface TestOperation {
  type: 'create' | 'delete' | 'update' | 'wait'
  params?: any
  waitMs?: number
  expectedId?: number
}
