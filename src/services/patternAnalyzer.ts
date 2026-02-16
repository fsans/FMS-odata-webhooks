import { webhookTracker } from './webhookTracker'
import type { WebhookOperationLog, WebhookIdPattern, IdAnalysisResult } from '@/types/webhook-tracking'

interface PatternReport {
  summary: {
    totalOperations: number
    uniqueWebhooks: number
    recyclingDetected: boolean
    sequentialPattern: boolean
    predictability: number
  }
  idAnalysis: {
    currentIds: number[]
    deletedIds: number[]
    gaps: number[]
    nextPredictedId?: number
    confidence: number
  }
  timing: {
    averageCreateTime: number
    averageDeleteTime: number
    averageUpdateTime: number
    recyclingDelay: number
  }
  patterns: {
    sequential: boolean
    recycled: boolean
    gaps: number[]
    averageGapSize: number
    maxGapSize: number
  }
  recommendations: string[]
}

interface VisualizationData {
  timeline: TimelinePoint[]
  idSequence: IdSequencePoint[]
  gaps: GapData[]
  recycling: RecyclingEvent[]
}

interface TimelinePoint {
  timestamp: Date
  operation: string
  webhookId: number
  type: 'create' | 'delete' | 'update'
}

interface IdSequencePoint {
  id: number
  createdAt: Date
  deletedAt?: Date
  isRecycled: boolean
  position: number
}

interface GapData {
  startId: number
  endId: number
  size: number
  createdAt: Date
  filledAt?: Date
}

interface RecyclingEvent {
  originalId: number
  deletedAt: Date
  recreatedAt: Date
  delay: number
  newId?: number
}

class PatternAnalyzer {
  analyzeCurrentState(): PatternReport {
    const logs = webhookTracker.getLogs()
    const patterns = webhookTracker.getPatterns()
    const analysis = webhookTracker.analyzePatterns()

    const createLogs = logs.filter(log => log.operation === 'create' && log.success)
    const deleteLogs = logs.filter(log => log.operation === 'delete' && log.success)
    const updateLogs = logs.filter(log => log.operation === 'update' && log.success)

    const currentIds = patterns.filter(p => !p.deletedAt).map(p => p.id).sort((a, b) => a - b)
    const deletedIds = patterns.filter(p => p.deletedAt).map(p => p.id).sort((a, b) => a - b)

    // Calculate gaps
    const gaps = this.calculateGaps(currentIds)
    
    // Predict next ID
    const nextPredictedId = this.predictNextId(currentIds, deletedIds, analysis)
    const confidence = this.calculatePredictionConfidence(analysis, currentIds.length)

    // Calculate timing metrics
    const timing = {
      averageCreateTime: this.calculateAverageTime(createLogs, 'timingMs'),
      averageDeleteTime: this.calculateAverageTime(deleteLogs, 'timingMs'),
      averageUpdateTime: this.calculateAverageTime(updateLogs, 'timingMs'),
      recyclingDelay: analysis.recyclingDelay
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis, timing, gaps)

    return {
      summary: {
        totalOperations: logs.length,
        uniqueWebhooks: patterns.length,
        recyclingDetected: analysis.recyclingDetected,
        sequentialPattern: analysis.sequentialPatterns,
        predictability: confidence
      },
      idAnalysis: {
        currentIds,
        deletedIds,
        gaps: gaps.map(g => g.size),
        nextPredictedId,
        confidence
      },
      timing,
      patterns: {
        sequential: analysis.sequentialPatterns,
        recycled: analysis.recyclingDetected,
        gaps: analysis.patterns.gaps,
        averageGapSize: analysis.averageGapSize,
        maxGapSize: analysis.maxGapSize
      },
      recommendations
    }
  }

  generateVisualizationData(): VisualizationData {
    const logs = webhookTracker.getLogs()
    const patterns = webhookTracker.getPatterns()

    // Timeline data
    const timeline: TimelinePoint[] = logs
      .filter(log => log.success && ['create', 'delete', 'update'].includes(log.operation))
      .map(log => ({
        timestamp: log.timestamp,
        operation: log.operation,
        webhookId: parseInt(log.webhookId || '0'),
        type: log.operation as 'create' | 'delete' | 'update'
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // ID sequence data
    const idSequence: IdSequencePoint[] = patterns
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((pattern, index) => ({
        id: pattern.id,
        createdAt: pattern.createdAt,
        deletedAt: pattern.deletedAt,
        isRecycled: pattern.isRecycled,
        position: index
      }))

    // Gaps data
    const currentIds = patterns.filter(p => !p.deletedAt).map(p => p.id).sort((a, b) => a - b)
    const gaps: GapData[] = this.calculateGaps(currentIds)

    // Recycling events
    const recyclingEvents: RecyclingEvent[] = this.identifyRecyclingEvents(patterns)

    return {
      timeline,
      idSequence,
      gaps,
      recycling: recyclingEvents
    }
  }

  private calculateGaps(currentIds: number[]): GapData[] {
    const gaps: GapData[] = []
    
    if (currentIds.length === 0) return gaps

    for (let i = 1; i < currentIds.length; i++) {
      const gapSize = currentIds[i] - currentIds[i - 1] - 1
      if (gapSize > 0) {
        gaps.push({
          startId: currentIds[i - 1] + 1,
          endId: currentIds[i] - 1,
          size: gapSize,
          createdAt: new Date() // This would need to be tracked more precisely
        })
      }
    }

    return gaps
  }

  private predictNextId(currentIds: number[], deletedIds: number[], analysis: IdAnalysisResult): number | undefined {
    if (analysis.sequentialPatterns && !analysis.recyclingDetected) {
      // Simple sequential prediction
      return currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1
    }

    if (analysis.recyclingDetected && deletedIds.length > 0) {
      // Predict recycling of smallest deleted ID
      return Math.min(...deletedIds)
    }

    // Complex pattern - use statistical approach
    return this.statisticalPrediction(currentIds, deletedIds)
  }

  private statisticalPrediction(currentIds: number[], deletedIds: number[]): number | undefined {
    if (currentIds.length === 0) return 1

    const allIds = [...currentIds, ...deletedIds].sort((a, b) => a - b)
    const maxId = Math.max(...allIds)
    
    // Look for the smallest available ID
    for (let i = 1; i <= maxId + 1; i++) {
      if (!currentIds.includes(i)) {
        return i
      }
    }

    return maxId + 1
  }

  private calculatePredictionConfidence(analysis: IdAnalysisResult, sampleSize: number): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence for sequential patterns
    if (analysis.sequentialPatterns) {
      confidence += 0.3
    }

    // Decrease confidence for recycling behavior
    if (analysis.recyclingDetected) {
      confidence -= 0.2
    }

    // Increase confidence with larger sample sizes
    if (sampleSize > 20) {
      confidence += 0.1
    } else if (sampleSize < 5) {
      confidence -= 0.2
    }

    // Consider gap consistency
    if (analysis.averageGapSize < 2) {
      confidence += 0.1
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private calculateAverageTime(logs: WebhookOperationLog[], field: keyof WebhookOperationLog): number {
    const times = logs
      .map(log => log[field] as number)
      .filter(time => time !== undefined && time > 0)
    
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0
  }

  private generateRecommendations(analysis: IdAnalysisResult, timing: any, gaps: GapData[]): string[] {
    const recommendations: string[] = []

    if (analysis.recyclingDetected) {
      recommendations.push("⚠️  ID recycling detected - avoid relying on sequential IDs for external references")
      recommendations.push("📝 Consider maintaining external ID mapping if stable references are required")
    }

    if (analysis.sequentialPatterns && !analysis.recyclingDetected) {
      recommendations.push("✅ Sequential ID pattern detected - IDs are predictable")
      recommendations.push("🔮 Next ID can be predicted with high confidence")
    }

    if (analysis.maxGapSize > 5) {
      recommendations.push("🕳️  Large gaps detected in ID sequence - possible deletions or system issues")
    }

    if (timing.averageCreateTime > 1000) {
      recommendations.push("⏱️  Slow creation times detected - consider optimizing webhook operations")
    }

    if (timing.recyclingDelay > 10000) {
      recommendations.push("⏰ Long recycling delay - IDs may be reused after significant time")
    }

    if (gaps.length > 0) {
      recommendations.push(`📊 ${gaps.length} gaps found in current ID sequence`)
    }

    if (analysis.patterns.predictable) {
      recommendations.push("🎯 ID assignment is highly predictable - suitable for automation")
    } else {
      recommendations.push("🔀 ID assignment is unpredictable - implement robust ID handling")
    }

    return recommendations
  }

  private identifyRecyclingEvents(patterns: WebhookIdPattern[]): RecyclingEvent[] {
    const events: RecyclingEvent[] = []
    const recycledPatterns = patterns.filter(p => p.isRecycled)

    recycledPatterns.forEach(pattern => {
      const originalPattern = patterns.find(p => p.id === pattern.id && p.createdAt < pattern.createdAt)
      if (originalPattern && originalPattern.deletedAt) {
        events.push({
          originalId: pattern.id,
          deletedAt: originalPattern.deletedAt,
          recreatedAt: pattern.createdAt,
          delay: pattern.createdAt.getTime() - originalPattern.deletedAt.getTime(),
          newId: pattern.id
        })
      }
    })

    return events.sort((a, b) => a.recreatedAt.getTime() - b.recreatedAt.getTime())
  }

  exportAnalysis(): string {
    const report = this.analyzeCurrentState()
    const visualization = this.generateVisualizationData()

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      report,
      visualization,
      metadata: {
        version: '1.0.0',
        generatedBy: 'FileMaker Webhook ID Pattern Analyzer'
      }
    }, null, 2)
  }

  generateMarkdownReport(): string {
    const report = this.analyzeCurrentState()
    const visualization = this.generateVisualizationData()

    return `# FileMaker Webhook ID Pattern Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

- **Total Operations**: ${report.summary.totalOperations}
- **Unique Webhooks**: ${report.summary.uniqueWebhooks}
- **Pattern Type**: ${report.summary.sequentialPattern ? 'Sequential' : 'Complex'}
- **Recycling Detected**: ${report.summary.recyclingDetected ? 'Yes' : 'No'}
- **Predictability**: ${(report.summary.predictability * 100).toFixed(1)}%

## ID Analysis

### Current IDs: ${report.idAnalysis.currentIds.join(', ')}
### Deleted IDs: ${report.idAnalysis.deletedIds.join(', ')}
### Gaps: ${report.idAnalysis.gaps.join(', ')}

${report.idAnalysis.nextPredictedId ? `### Next Predicted ID: ${report.idAnalysis.nextPredictedId} (Confidence: ${(report.idAnalysis.confidence * 100).toFixed(1)}%)` : '### Next ID: Unpredictable'}

## Performance Metrics

- **Average Create Time**: ${report.timing.averageCreateTime.toFixed(0)}ms
- **Average Delete Time**: ${report.timing.averageDeleteTime.toFixed(0)}ms
- **Average Update Time**: ${report.timing.averageUpdateTime.toFixed(0)}ms
- **Recycling Delay**: ${report.timing.recyclingDelay.toFixed(0)}ms

## Pattern Analysis

- **Sequential Pattern**: ${report.patterns.sequential ? 'Yes' : 'No'}
- **Recycling Pattern**: ${report.patterns.recycled ? 'Yes' : 'No'}
- **Average Gap Size**: ${report.patterns.averageGapSize.toFixed(2)}
- **Maximum Gap Size**: ${report.patterns.maxGapSize}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Timeline

${visualization.timeline.map(point => 
  `- ${point.timestamp.toISOString()}: ${point.operation.toUpperCase()} webhook ${point.webhookId}`
).join('\n')}

## Recycling Events

${visualization.recycling.map(event => 
  `- ID ${event.originalId}: Deleted ${event.deletedAt.toISOString()}, Recreated ${event.recreatedAt.toISOString()} (Delay: ${event.delay}ms)`
).join('\n')}
`
  }
}

export const patternAnalyzer = new PatternAnalyzer()
